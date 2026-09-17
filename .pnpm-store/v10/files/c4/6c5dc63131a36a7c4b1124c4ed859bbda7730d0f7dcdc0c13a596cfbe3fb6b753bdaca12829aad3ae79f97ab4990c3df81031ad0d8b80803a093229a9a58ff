import { createRequire } from "node:module";
import { TerminalBackendCleanupError, TerminalError } from "@deepseek-ai/dsh-terminal";
import { ENCODING_PREAMBLE, resolvePwshPath } from "@deepseek-ai/dsh-pwsh-local";
import z from "@deepseek-ai/schemastery";
import { Buffer } from "node:buffer";
//#region lib/types/config.js
/** Validated configuration for the local PTY backend. */
/** Bash dialect default executable. */
const DEFAULT_BASH_SHELL = "/bin/bash";
/** Bash dialect default arguments (interactive, profile-free). */
const DEFAULT_BASH_ARGS = [
	"--noprofile",
	"--norc",
	"-i"
];
/** Pwsh dialect default arguments (interactive host, profile-free). */
const DEFAULT_PWSH_ARGS = ["-NoLogo", "-NoProfile"];
/**
* Resolve the effective per-dialect shell specification. Defaulting is this
* explicit step: an unset or empty `shellPath`/`shellArgs` selects the
* dialect's defaults, while a non-empty explicit value always wins.
* (Schemastery materializes an absent optional array as `[]`, so emptiness —
* not just `undefined` — means "dialect default".)
* @param config - Schemastery-resolved plugin configuration.
* @returns the fully resolved configuration.
*/
function resolveConfig(config) {
	const shellDialect = config.shellDialect ?? "bash";
	return {
		...config,
		shellDialect,
		shellPath: config.shellPath !== void 0 && config.shellPath.length > 0 ? config.shellPath : shellDialect === "pwsh" ? resolvePwshPath() : DEFAULT_BASH_SHELL,
		shellArgs: config.shellArgs !== void 0 && config.shellArgs.length > 0 ? config.shellArgs : shellDialect === "pwsh" ? DEFAULT_PWSH_ARGS : DEFAULT_BASH_ARGS
	};
}
/** Schemastery config exposed by the plugin. */
const Config = z.object({
	backendType: z.string().default("shell"),
	shellDialect: z.union(["bash", "pwsh"]).default("bash"),
	shellPath: z.string().required(false),
	shellArgs: z.array(z.string()).required(false),
	rows: z.number().default(40),
	cols: z.number().default(160),
	scrollbackLines: z.number().default(1e4),
	scrollbackMaxBytes: z.number().default(4 * 1024 * 1024),
	maxReadBytes: z.number().default(256 * 1024),
	pollIntervalMs: z.number().default(50),
	exactProbeAfterMs: z.number().default(150),
	idleSilenceMs: z.number().default(3e3),
	handoffGraceMs: z.number().default(500),
	timeoutMs: z.number().default(3e4),
	disposeGraceMs: z.number().default(3e3)
});
/**
* Assert every effective numeric config field is a positive safe integer and bounds compose.
* @param config - Schemastery-resolved plugin configuration.
* @returns Narrows the input to the fully resolved configuration.
*/
function validateConfig(config) {
	const resolved = config;
	if (resolved.backendType.length === 0) throw new Error("terminal-bash: backendType must be non-empty");
	if (resolved.shellPath.length === 0) throw new Error("terminal-bash: shellPath must be non-empty");
	for (const [name, value] of Object.entries(resolved)) if (typeof value === "number" && (!Number.isSafeInteger(value) || value <= 0)) throw new Error(`terminal-bash: ${name} must be a positive safe integer`);
	if (resolved.maxReadBytes > resolved.scrollbackMaxBytes) throw new Error("terminal-bash: maxReadBytes must not exceed scrollbackMaxBytes");
	if (resolved.handoffGraceMs < resolved.pollIntervalMs) throw new Error("terminal-bash: handoffGraceMs must be at least pollIntervalMs so one readiness poll runs inside the grace window");
}
/** Exact printable prompt emitted after the private marker. */
const CONTROLLED_PROMPT = "dsh> ";
/**
* Remove CSI/OSC/short escape sequences while preserving split-sequence carry.
* Full terminal emulation is deliberately deferred; ordinary line output and
* the private prompt marker are the supported contract.
*/
var TerminalSanitizer = class {
	maxPendingBytes;
	pending = "";
	discardMode;
	discardOscEscape = false;
	trailingCarriageReturn = false;
	trackingPromptTail = false;
	constructor(maxPendingBytes) {
		this.maxPendingBytes = maxPendingBytes;
	}
	/**
	* Consume one decoded `node-pty` data chunk.
	* @param chunk - decoded terminal data.
	* @returns Printable text and whether the private prompt marker completed.
	*/
	push(chunk) {
		this.pending += this.discardPrefix(chunk);
		let text = "";
		let prompt = false;
		let includePromptTail = this.trackingPromptTail;
		let promptTail = "";
		let index = 0;
		const appendText = (value) => {
			text += value;
			if (this.trackingPromptTail) promptTail += value;
		};
		while (index < this.pending.length) {
			const escape = this.pending.indexOf("\x1B", index);
			if (escape < 0) {
				appendText(this.pending.slice(index));
				index = this.pending.length;
				break;
			}
			appendText(this.pending.slice(index, escape));
			if (escape + 1 >= this.pending.length) {
				index = escape;
				break;
			}
			const kind = this.pending[escape + 1];
			if (kind === "]") {
				const bel = this.pending.indexOf("\x07", escape + 2);
				const stringTerminator = this.pending.indexOf("\x1B\\", escape + 2);
				let end = -1;
				if (bel >= 0 && stringTerminator >= 0) end = Math.min(bel + 1, stringTerminator + 2);
				else if (bel >= 0) end = bel + 1;
				else if (stringTerminator >= 0) end = stringTerminator + 2;
				if (end < 0) {
					index = escape;
					break;
				}
				const terminatorBytes = this.pending[end - 1] === "\x07" ? 1 : 2;
				if (this.pending.slice(escape + 2, end - terminatorBytes).startsWith("133;D;")) {
					prompt = true;
					this.trackingPromptTail = true;
					includePromptTail = true;
					promptTail = "";
				}
				index = end;
				continue;
			}
			if (kind === "[") {
				let end = escape + 2;
				while (end < this.pending.length) {
					const code = this.pending.charCodeAt(end);
					if (code >= 64 && code <= 126) break;
					end += 1;
				}
				if (end >= this.pending.length) {
					index = escape;
					break;
				}
				index = end + 1;
				continue;
			}
			index = escape + 2;
		}
		this.pending = this.pending.slice(index);
		this.enforcePendingBound();
		return {
			text: this.normalizeText(text),
			prompt,
			...includePromptTail ? { promptTail } : {}
		};
	}
	/**
	* Flush a trailing printable fragment when the PTY exits.
	* @returns Remaining printable text; incomplete escapes are discarded.
	*/
	flush() {
		const text = this.pending.startsWith("\x1B") ? "" : this.pending;
		this.pending = "";
		this.discardMode = void 0;
		this.discardOscEscape = false;
		this.trackingPromptTail = false;
		const normalized = this.normalizeText(text);
		if (!this.trailingCarriageReturn) return normalized;
		this.trailingCarriageReturn = false;
		return `${normalized}\n`;
	}
	normalizeText(text) {
		let complete = this.trailingCarriageReturn ? `\r${text}` : text;
		this.trailingCarriageReturn = false;
		if (complete.endsWith("\r")) {
			complete = complete.slice(0, -1);
			this.trailingCarriageReturn = true;
		}
		return normalizeTerminalText(complete);
	}
	enforcePendingBound() {
		if (Buffer.byteLength(this.pending) <= this.maxPendingBytes) return;
		this.discardMode = this.pending[1] === "]" ? "osc" : "csi";
		this.pending = "";
	}
	discardPrefix(chunk) {
		if (this.discardMode === void 0) return chunk;
		if (this.discardMode === "csi") {
			for (let index = 0; index < chunk.length; index += 1) {
				const code = chunk.charCodeAt(index);
				if (code >= 64 && code <= 126) {
					this.discardMode = void 0;
					return chunk.slice(index + 1);
				}
			}
			return "";
		}
		let index = 0;
		if (this.discardOscEscape) {
			this.discardOscEscape = false;
			if (chunk.startsWith("\\")) {
				this.discardMode = void 0;
				return chunk.slice(1);
			}
		}
		while (index < chunk.length) {
			if (chunk[index] === "\x07") {
				this.discardMode = void 0;
				return chunk.slice(index + 1);
			}
			if (chunk[index] === "\x1B") {
				if (chunk[index + 1] === "\\") {
					this.discardMode = void 0;
					return chunk.slice(index + 2);
				}
				if (index + 1 === chunk.length) this.discardOscEscape = true;
			}
			index += 1;
		}
		return "";
	}
};
/**
* Normalize CRLF and standalone carriage returns for line-oriented rendering.
* @param text - sanitized terminal text.
* @returns Line-normalized text with BEL removed.
*/
function normalizeTerminalText(text) {
	return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\x07", "");
}
//#endregion
//#region lib/types/session.js
/** Persistent PTY session with bounded output, readiness, and terminal-protocol replies. */
const { Terminal: HeadlessTerminal } = createRequire(import.meta.url)("@xterm/headless");
function utf8Tail(text, maxBytes) {
	if (Buffer.byteLength(text) <= maxBytes) return {
		text,
		truncated: false
	};
	const chars = Array.from(text);
	let bytes = 0;
	let start = chars.length;
	while (start > 0) {
		const next = Buffer.byteLength(chars[start - 1]);
		if (bytes + next > maxBytes) break;
		bytes += next;
		start -= 1;
	}
	return {
		text: chars.slice(start).join(""),
		truncated: true
	};
}
var BoundedTextBuffer = class {
	maxBytes;
	maxLines;
	value = "";
	dropped = false;
	constructor(maxBytes, maxLines) {
		this.maxBytes = maxBytes;
		this.maxLines = maxLines;
	}
	append(text) {
		if (text.length === 0) return;
		this.value += text;
		if (this.maxLines !== void 0) {
			const lines = this.value.split("\n");
			if (lines.length > this.maxLines) {
				this.value = lines.slice(lines.length - this.maxLines).join("\n");
				this.dropped = true;
			}
		}
		const tail = utf8Tail(this.value, this.maxBytes);
		this.value = tail.text;
		this.dropped ||= tail.truncated;
	}
	consume() {
		const delta = this.value;
		const truncated = this.dropped;
		this.value = "";
		this.dropped = false;
		return {
			delta,
			truncated
		};
	}
	snapshot() {
		return {
			text: this.value,
			truncated: this.dropped
		};
	}
};
var LocalSendOperation = class {
	startedAt;
	onCancel;
	output;
	promise;
	finished = false;
	cancellationRequested = false;
	initialForegroundLeftWait;
	initialForegroundPgid;
	constructor(maxBytes, startedAt, onCancel) {
		this.startedAt = startedAt;
		this.onCancel = onCancel;
		this.output = new BoundedTextBuffer(maxBytes);
		this.promise = Promise.withResolvers();
		this.initialForegroundLeftWait = true;
	}
	get done() {
		return this.promise.promise;
	}
	get settled() {
		return this.finished;
	}
	get cancelRequested() {
		return this.cancellationRequested;
	}
	append(text) {
		if (!this.finished) this.output.append(text);
	}
	settle(waitReason, sessionStatus, inheritedTruncation) {
		if (this.finished) return;
		this.finished = true;
		const read = this.output.snapshot();
		this.promise.resolve({
			viewport: read.text,
			waitReason,
			sessionStatus,
			truncated: read.truncated || inheritedTruncation
		});
	}
	fail(error) {
		if (this.finished) return;
		this.finished = true;
		this.promise.reject(error);
	}
	readOutput() {
		return this.output.consume();
	}
	setInitialForeground(foreground) {
		this.initialForegroundPgid = foreground?.processGroupId;
		this.initialForegroundLeftWait = foreground?.inputWaiting !== true;
	}
	acceptsStdinWait(pgid, waiting) {
		if (pgid !== this.initialForegroundPgid) return waiting;
		if (!waiting) this.initialForegroundLeftWait = true;
		return waiting && this.initialForegroundLeftWait;
	}
	cancel() {
		if (this.finished) return false;
		this.cancellationRequested = true;
		this.onCancel();
		return true;
	}
};
/** Backend session wrapping one provider-owned terminal process. */
var LocalPtySession = class {
	terminal;
	config;
	motd = "";
	pid;
	decoder = new TextDecoder();
	/** Protocol state only; the sanitizer and bounded buffers own returned text. */
	emulator;
	emulatorData;
	sanitizer;
	scrollback;
	outputEnded = Promise.withResolvers();
	completion;
	statusValue = { kind: "running" };
	active;
	activeTimer;
	activeDeadlineTimer;
	activeAbort;
	interrupting;
	activeWrite;
	pollingReady;
	polling = false;
	promptSeen = false;
	promptTextSeen = false;
	promptTail = "";
	shellPgid;
	initializing = false;
	lastOutputAt = Date.now();
	closing = false;
	closePromise;
	transportFailure;
	emulatorWrites = Promise.resolve();
	emulatorWriteDone;
	emulatorBuffer = "";
	emulatorWriting = false;
	responseWrites = Promise.resolve();
	pendingResponseWrites = 0;
	emulatorClosed = false;
	constructor(terminal, config) {
		this.terminal = terminal;
		this.config = config;
		this.pid = terminal.pid;
		this.emulator = new HeadlessTerminal({
			cols: config.cols,
			rows: config.rows,
			scrollback: 0
		});
		this.emulatorData = this.emulator.onData((data) => {
			this.pendingResponseWrites += 1;
			const response = this.responseWrites.then(async () => {
				await this.terminal.write(data);
			});
			this.responseWrites = response.then(() => {
				this.finishResponseWrite();
			}, (error) => {
				this.finishResponseWrite();
				if (!this.emulatorClosed && !this.closing) this.onTransportFailure(error);
			});
		});
		this.sanitizer = new TerminalSanitizer(config.maxReadBytes);
		this.scrollback = new BoundedTextBuffer(config.scrollbackMaxBytes, config.scrollbackLines);
		terminal.output.on("data", this.onTerminalData);
		terminal.output.once("end", this.onTerminalEnd);
		terminal.output.once("error", this.onTerminalError);
		this.completion = terminal.done.then((outcome) => this.onExit(outcome), (error) => {
			this.onTransportFailure(error);
		});
	}
	/**
	* Capture startup output through the same readiness contract as later sends.
	* @param signal - optional cancellation while the shell reaches its first prompt.
	* @returns Resolves after startup readiness; rejects on exit or readiness timeout.
	*/
	async initialize(signal) {
		this.initializing = true;
		try {
			const result = await this.startSend({
				text: "",
				submit: false,
				...signal !== void 0 ? { signal } : {}
			}).done;
			if (result.waitReason === "session_exit") throw new Error("PTY shell exited during startup");
			if (result.waitReason === "timeout") throw new Error("PTY shell did not reach readiness before startup timeout");
			this.motd = result.viewport;
		} catch (error) {
			signal?.throwIfAborted();
			throw error;
		} finally {
			this.initializing = false;
		}
	}
	startSend(request) {
		if (this.closing) throw new Error("PTY session is closing");
		if (this.statusValue.kind === "exited") throw new Error("PTY session has exited");
		if (this.active !== void 0) throw new TerminalError(`PTY session already has an active send${this.activeWrite !== void 0 ? " or draining provider write" : this.interrupting !== void 0 ? " or draining foreground interrupt" : ""}`, "SEND_ACTIVE");
		if (request.signal?.aborted === true) throw new Error("PTY send aborted before write");
		const operation = new LocalSendOperation(this.config.maxReadBytes, Date.now(), () => {
			this.interrupt(operation);
		});
		this.active = operation;
		this.resetReadinessEvidence();
		if (request.signal !== void 0) {
			const onAbort = () => {
				operation.cancel();
			};
			request.signal.addEventListener("abort", onAbort, { once: true });
			this.activeAbort = () => request.signal?.removeEventListener("abort", onAbort);
		}
		this.activeDeadlineTimer = setTimeout(() => {
			if (this.active === operation) this.settleActive("timeout", this.activeWrite !== void 0 || this.interrupting === operation || this.protocolWorkPending());
		}, this.config.timeoutMs);
		this.beginSend(operation, request);
		return operation;
	}
	async beginSend(operation, request) {
		let foreground;
		try {
			if (this.protocolWorkPending()) await this.drainTerminalProtocol();
			const emulatorWrites = this.emulatorWrites;
			const responseWrites = this.responseWrites;
			foreground = await this.terminal.inspectForeground();
			if (this.protocolStateChanged(emulatorWrites, responseWrites)) foreground = await this.inspectForegroundAfterProtocol();
		} catch (error) {
			if (this.protocolWorkPending()) await this.drainTerminalProtocol();
			if (this.active === operation && !this.closing && this.interrupting !== operation) this.failActive(error);
			return;
		}
		try {
			if (this.active !== operation || this.closing || this.interrupting === operation) return;
			operation.setInitialForeground(foreground);
			const input = `${request.text}${request.submit ? "\r" : ""}`;
			if (input.length > 0 && !operation.cancelRequested) {
				this.resetReadinessEvidence();
				const write = this.terminal.write(input);
				this.activeWrite = write.then(() => true, () => false);
				try {
					await write;
				} finally {
					this.activeWrite = void 0;
				}
			}
			if (operation.cancelRequested) return;
			if (this.active === operation && operation.settled) {
				this.releaseSettledActive();
				return;
			}
			if (this.active === operation && !this.closing) {
				this.pollingReady = operation;
				this.schedulePoll(operation);
			}
		} catch (error) {
			if (this.active === operation && !this.closing) if (operation.settled) this.releaseSettledActive();
			else this.failActive(error);
		}
	}
	resetReadinessEvidence() {
		this.lastOutputAt = Date.now();
		this.promptSeen = false;
		this.promptTextSeen = false;
		this.promptTail = "";
	}
	read(request) {
		const snapshot = this.scrollback.snapshot();
		const lines = snapshot.text.split("\n");
		const totalLines = snapshot.text.length === 0 ? 0 : lines.length;
		const offset = request.offset ?? 0;
		const count = request.count ?? 500;
		if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("PTY read offset must be a non-negative safe integer");
		if (!Number.isSafeInteger(count) || count <= 0) throw new Error("PTY read count must be a positive safe integer");
		if (offset >= totalLines) return {
			text: "",
			totalLines,
			lineBegin: offset,
			lineEnd: offset,
			truncated: snapshot.truncated
		};
		const end = totalLines - offset;
		const start = Math.max(0, end - count);
		const bounded = utf8Tail(lines.slice(start, end).join("\n"), this.config.maxReadBytes);
		const returnedLines = bounded.text.length === 0 ? 0 : bounded.text.split("\n").length;
		return {
			text: bounded.text,
			totalLines,
			lineBegin: offset,
			lineEnd: offset + returnedLines,
			truncated: snapshot.truncated || bounded.truncated
		};
	}
	async signal(signal) {
		if (this.closing) throw new Error("PTY session is closing");
		return {
			delivered: true,
			targetPgid: await this.terminal.signalForeground(signal)
		};
	}
	status() {
		return this.statusValue;
	}
	close(reason) {
		this.closing = true;
		if (this.closePromise !== void 0) return this.closePromise;
		const closing = this.closeOnce(reason).catch((error) => {
			this.closePromise = void 0;
			this.failActive(error);
			throw error;
		});
		this.closePromise = closing;
		return closing;
	}
	onTerminalData = (chunk) => {
		const bytes = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
		const data = this.decoder.decode(bytes, { stream: true });
		this.queueEmulatorData(data);
		this.onData(data);
	};
	onTerminalEnd = () => {
		this.onData(this.decoder.decode());
		this.appendOutput(this.sanitizer.flush());
		this.closeEmulator();
		this.outputEnded.resolve();
	};
	onTerminalError = (error) => {
		this.closeEmulator();
		this.onTransportFailure(error);
		this.outputEnded.resolve();
	};
	onData(data) {
		const sanitized = this.sanitizer.push(data);
		this.appendOutput(sanitized.text);
		if (sanitized.prompt) {
			this.promptSeen = true;
			this.promptTail = "";
			this.lastOutputAt = Date.now();
		}
		if (this.promptSeen && sanitized.promptTail !== void 0) {
			const remaining = Math.max(0, 6 - this.promptTail.length);
			this.promptTail += sanitized.promptTail.slice(0, remaining);
			if (sanitized.promptTail.length > remaining) this.promptTail = `${CONTROLLED_PROMPT}\0`;
			this.promptTextSeen = this.promptTail === CONTROLLED_PROMPT;
		}
	}
	async onExit(outcome) {
		await this.outputEnded.promise;
		if (this.transportFailure !== void 0) return;
		this.statusValue = {
			kind: "exited",
			exitCode: outcome.exitCode,
			signal: outcome.signal
		};
		this.settleActive("session_exit");
	}
	onTransportFailure(error) {
		const failure = error instanceof Error ? error : new Error(String(error));
		this.transportFailure ??= failure;
		this.statusValue = {
			kind: "exited",
			exitCode: null,
			signal: null
		};
		this.closeEmulator();
		this.failActive(failure);
		this.terminal.terminate().catch(() => {});
	}
	appendOutput(text) {
		if (text.length === 0) return;
		this.lastOutputAt = Date.now();
		this.scrollback.append(text);
		this.active?.append(text);
	}
	schedulePoll(operation, delayMs = this.config.pollIntervalMs) {
		if (this.active !== operation || this.interrupting === operation || this.polling) return;
		if (this.activeTimer !== void 0) clearTimeout(this.activeTimer);
		this.activeTimer = setTimeout(() => {
			this.activeTimer = void 0;
			this.pollReadiness(operation);
		}, delayMs);
	}
	async pollReadiness(operation) {
		if (this.active !== operation || this.polling) return;
		this.polling = true;
		try {
			if (this.statusValue.kind === "exited") {
				this.settleActive("session_exit");
				return;
			}
			if (this.protocolWorkPending()) await this.drainTerminalProtocol();
			const emulatorWrites = this.emulatorWrites;
			const responseWrites = this.responseWrites;
			let foreground = await this.terminal.inspectForeground();
			if (this.protocolStateChanged(emulatorWrites, responseWrites)) foreground = await this.inspectForegroundAfterProtocol();
			if (this.active !== operation || this.closing || this.interrupting === operation) return;
			const idleFor = Date.now() - this.lastOutputAt;
			if (this.promptSeen && foreground !== void 0 && this.shellPgid === void 0) this.shellPgid = foreground.processGroupId;
			if (this.promptSeen && this.promptTextSeen && idleFor >= this.config.pollIntervalMs && foreground?.processGroupId === this.shellPgid) {
				this.settleActive("stdin_read");
				return;
			}
			const elapsed = Date.now() - operation.startedAt;
			const startupHasOutput = !this.initializing || this.scrollback.snapshot().text.length > 0;
			const acceptsStdinWait = startupHasOutput && foreground !== void 0 && operation.acceptsStdinWait(foreground.processGroupId, foreground.inputWaiting);
			if (elapsed >= this.config.exactProbeAfterMs && acceptsStdinWait) {
				this.settleActive("stdin_read");
				return;
			}
			const handoffGrace = this.promptSeen ? this.config.handoffGraceMs : 0;
			if (startupHasOutput && idleFor >= this.config.idleSilenceMs + handoffGrace) this.settleActive("inferred_idle");
		} catch (error) {
			if (this.protocolWorkPending()) await this.drainTerminalProtocol();
			if (this.active === operation && !this.closing && this.interrupting !== operation) this.failActive(error);
		} finally {
			this.polling = false;
			const active = this.active;
			if (active !== void 0 && this.pollingReady === active) this.schedulePoll(active);
		}
	}
	/** Wait until generated replies reach the provider before another send can publish. */
	async drainTerminalProtocol() {
		for (;;) {
			const emulatorWrites = this.emulatorWrites;
			await emulatorWrites;
			const responseWrites = this.responseWrites;
			await responseWrites;
			if (emulatorWrites === this.emulatorWrites && responseWrites === this.responseWrites && !this.protocolWorkPending()) return;
		}
	}
	/** Sample foreground state only after protocol replies are quiet for the entire inspection. */
	async inspectForegroundAfterProtocol() {
		for (;;) {
			if (this.protocolWorkPending()) await this.drainTerminalProtocol();
			const emulatorWrites = this.emulatorWrites;
			const responseWrites = this.responseWrites;
			const foreground = await this.terminal.inspectForeground();
			if (!this.protocolStateChanged(emulatorWrites, responseWrites)) return foreground;
		}
	}
	protocolStateChanged(emulatorWrites, responseWrites) {
		return emulatorWrites !== this.emulatorWrites || responseWrites !== this.responseWrites || this.protocolWorkPending();
	}
	protocolWorkPending() {
		return this.emulatorWriteDone !== void 0 || this.pendingResponseWrites > 0;
	}
	queueEmulatorData(data) {
		if (this.emulatorClosed) return;
		this.emulatorBuffer += data;
		if (this.emulatorWriteDone === void 0) {
			const idle = Promise.withResolvers();
			this.emulatorWrites = idle.promise;
			this.emulatorWriteDone = () => {
				idle.resolve(void 0);
			};
		}
		this.pumpEmulator();
	}
	pumpEmulator() {
		if (this.emulatorWriting || this.emulatorClosed) return;
		if (this.emulatorBuffer.length === 0) {
			const done = this.emulatorWriteDone;
			this.emulatorWriteDone = void 0;
			done?.();
			this.releaseSettledActive();
			return;
		}
		const data = this.emulatorBuffer;
		this.emulatorBuffer = "";
		this.emulatorWriting = true;
		try {
			this.emulator.write(data, () => {
				this.emulatorWriting = false;
				this.pumpEmulator();
			});
		} catch (error) {
			this.emulatorWriting = false;
			this.emulatorBuffer = "";
			const done = this.emulatorWriteDone;
			this.emulatorWriteDone = void 0;
			done?.();
			this.releaseSettledActive();
			if (!this.closing) this.onTransportFailure(error);
		}
	}
	finishResponseWrite() {
		this.pendingResponseWrites -= 1;
		this.releaseSettledActive();
	}
	releaseSettledActive() {
		const operation = this.active;
		if (operation === void 0 || !operation.settled || this.activeWrite !== void 0 || this.interrupting === operation || this.protocolWorkPending()) return;
		this.clearActive();
	}
	closeEmulator() {
		if (this.emulatorClosed) return;
		this.emulatorClosed = true;
		this.emulatorBuffer = "";
		this.emulatorWriting = false;
		const done = this.emulatorWriteDone;
		this.emulatorWriteDone = void 0;
		done?.();
		this.emulatorData.dispose();
		this.emulator.dispose();
	}
	settleActive(waitReason, retainOwnership = false) {
		const operation = this.active;
		if (operation === void 0) return;
		const scrollbackTruncated = this.scrollback.snapshot().truncated;
		if (retainOwnership) {
			this.stopPolling();
			this.activeAbort?.();
			this.activeAbort = void 0;
		} else this.clearActive();
		operation.settle(waitReason, this.statusValue, scrollbackTruncated);
	}
	stopPolling() {
		this.stopReadinessPolling();
		if (this.activeDeadlineTimer !== void 0) clearTimeout(this.activeDeadlineTimer);
		this.activeDeadlineTimer = void 0;
	}
	stopReadinessPolling() {
		if (this.activeTimer !== void 0) clearTimeout(this.activeTimer);
		this.activeTimer = void 0;
		this.pollingReady = void 0;
	}
	clearActive() {
		const operation = this.active;
		this.stopPolling();
		this.activeAbort?.();
		this.activeAbort = void 0;
		if (this.interrupting === operation) this.interrupting = void 0;
		this.pollingReady = void 0;
		this.active = void 0;
	}
	failActive(error) {
		const operation = this.active;
		if (operation === void 0) return;
		this.clearActive();
		operation.fail(error);
	}
	interrupt(operation) {
		if (this.active !== operation) return;
		this.interrupting = operation;
		this.stopReadinessPolling();
		this.interruptOnce(operation);
	}
	async interruptOnce(operation) {
		try {
			const activeWrite = this.activeWrite;
			if (activeWrite !== void 0 && !await activeWrite) return;
			await this.terminal.signalForeground("SIGINT");
		} catch (error) {
			if (this.active === operation && !this.closing) this.onTransportFailure(error);
			return;
		} finally {
			if (this.interrupting === operation) this.interrupting = void 0;
		}
		if (this.active === operation && operation.settled) this.releaseSettledActive();
		else if (this.active === operation && !this.closing) {
			this.pollingReady = operation;
			this.schedulePoll(operation, 0);
		}
	}
	async closeOnce(reason) {
		this.stopPolling();
		this.closeEmulator();
		try {
			await this.terminal.terminate();
		} catch (error) {
			throw new Error(`PTY cleanup failed (${reason})`, { cause: error });
		}
		this.settleActive("session_exit");
		await this.completion;
		this.terminal.output.off("data", this.onTerminalData);
		this.terminal.output.off("end", this.onTerminalEnd);
		this.terminal.output.off("error", this.onTerminalError);
		if (this.transportFailure !== void 0) throw this.transportFailure;
	}
};
//#endregion
//#region lib/types/index.js
/**
* Persistent shell PTY backend over the subprocess terminal primitive, shared
* sandbox policy, bounded output, and provider-owned session cleanup.
* @module @deepseek-ai/dsh-terminal-bash
*/
/** Cordis plugin name. */
const name = "terminal-bash";
/** Required services: terminal registry, shared confinement policy, projection registry, and process substrate. */
const inject = [
	"terminals",
	"sandboxPolicy",
	"sessionProjections",
	"subprocess"
];
const sandboxModeFences = /* @__PURE__ */ new WeakMap();
function ensureSandboxModeFence(ctx, owner) {
	const existing = sandboxModeFences.get(owner);
	if (existing !== void 0) {
		existing.pty = ctx.terminals;
		existing.sandboxPolicy = ctx.sandboxPolicy;
		existing.sessionProjections = ctx.sessionProjections;
		return;
	}
	const state = {
		pty: ctx.terminals,
		sandboxPolicy: ctx.sandboxPolicy,
		sessionProjections: ctx.sessionProjections
	};
	sandboxModeFences.set(owner, state);
	owner.ctx.on("internal/dispatch", (_mode, eventName, args) => {
		if (eventName !== "session/event") return;
		const [session, event] = args;
		if (session !== owner.session || event.type !== "sandbox/mode") return;
		const currentMode = state.sessionProjections.stateOf(session, "sandboxMode") ?? null ?? state.sandboxPolicy.defaultMode;
		if (event.data.mode === currentMode || !state.pty.hasOwnerActivity(owner)) return;
		throw new Error(`cannot change sandbox mode from "${currentMode}" to "${event.data.mode}" while persistent terminal sessions are open or being created; wait for creation to settle and close them first`);
	}, { global: true });
}
function childEnvironment(spec, dialect) {
	const common = {
		TERM: "dumb",
		PAGER: "cat",
		GIT_PAGER: "cat",
		DSH_SHELL: "1",
		DSH_SESSION_ID: spec.owner.id,
		DSH_PTY_SESSION_ID: spec.sessionId
	};
	if (dialect === "pwsh") return {
		...common,
		NO_COLOR: "1"
	};
	return {
		...common,
		PS1: CONTROLLED_PROMPT,
		PROMPT_COMMAND: `printf "\\033]133;D;%s\\007" "$?"; PS1='${CONTROLLED_PROMPT}'`,
		BASH_SILENCE_DEPRECATION_WARNING: "1"
	};
}
/**
* The pwsh prompt function that emits the shared OSC `133;D;` + BEL marker
* before every prompt, mirroring bash's PROMPT_COMMAND. `[char]27`/`[char]7`
* build the control bytes at runtime because raw ESC characters in submitted
* input are unreliable under PSReadLine.
*/
const PWSH_PROMPT_SETUP = "function prompt { [Console]::Write([char]27 + ']133;D;' + [int]$LASTEXITCODE + [char]7); 'dsh> ' }";
function spawnArgv(ctx, config, policy) {
	const argv = [config.shellPath, ...config.shellArgs];
	if (policy.mode === "danger-full-access") return argv;
	const sandbox = ctx.get("sandbox");
	if (sandbox === void 0) throw new Error(`terminal-bash: sandbox mode "${policy.mode}" requires a ctx.sandbox provider in the execution world`);
	return sandbox.confine(argv, {
		...policy,
		mode: policy.mode
	}).argv;
}
async function startupSession(session, dialect, timeoutMs, signal) {
	let startupOperation;
	const start = async () => {
		if (dialect === "bash") {
			await session.initialize(signal);
			return;
		}
		let viewport = "";
		for (;;) {
			const first = viewport.length === 0;
			startupOperation = session.startSend({
				text: first ? ENCODING_PREAMBLE + PWSH_PROMPT_SETUP : "",
				submit: first,
				...signal !== void 0 ? { signal } : {}
			});
			const result = await startupOperation.done;
			if (result.waitReason === "session_exit") throw new Error("PTY shell exited during startup");
			if (result.waitReason === "timeout") throw new Error("PTY shell did not reach readiness before startup timeout");
			viewport = result.viewport;
			if (result.waitReason === "stdin_read") break;
		}
		session.motd = viewport;
	};
	const races = [];
	let onAbort;
	if (signal !== void 0) {
		const aborted = Promise.withResolvers();
		onAbort = () => {
			aborted.reject(signal.reason);
		};
		signal.addEventListener("abort", onAbort, { once: true });
		races.push(aborted.promise);
	}
	let deadlineTimer;
	if (dialect === "pwsh") {
		const deadline = Promise.withResolvers();
		deadlineTimer = setTimeout(() => {
			startupOperation?.cancel();
			deadline.reject(/* @__PURE__ */ new Error("PTY shell did not reach readiness before startup timeout"));
		}, timeoutMs);
		races.push(deadline.promise);
	}
	try {
		signal?.throwIfAborted();
		await Promise.race([start(), ...races]);
	} finally {
		if (deadlineTimer !== void 0) clearTimeout(deadlineTimer);
		if (signal !== void 0 && onAbort !== void 0) signal.removeEventListener("abort", onAbort);
	}
}
/** Local shell backend registered under the configured type. */
var BashTerminalBackend = class {
	ctx;
	config;
	spawnTerminal;
	createSession;
	type;
	constructor(ctx, config, spawnTerminal = (spec) => ctx.subprocess.spawnTerminal(spec), createSession = (terminal, config) => new LocalPtySession(terminal, config)) {
		this.ctx = ctx;
		this.config = config;
		this.spawnTerminal = spawnTerminal;
		this.createSession = createSession;
		this.type = config.backendType;
	}
	async spawn(spec) {
		spec.signal?.throwIfAborted();
		ensureSandboxModeFence(this.ctx, spec.owner);
		const policy = this.ctx.sandboxPolicy.resolve({ session: spec.owner.session });
		const argv = spawnArgv(this.ctx, this.config, policy);
		if (argv[0] === void 0) throw new Error("terminal-bash: sandbox returned empty argv");
		const terminal = await this.spawnTerminal({
			argv,
			cwd: spec.cwd ?? policy.workspaceRoot,
			env: childEnvironment(spec, this.config.shellDialect),
			rows: this.config.rows,
			cols: this.config.cols,
			graceMs: this.config.disposeGraceMs,
			signal: spec.signal
		});
		const session = this.createSession(terminal, this.config);
		try {
			await startupSession(session, this.config.shellDialect, this.config.timeoutMs, spec.signal);
			return session;
		} catch (error) {
			try {
				await session.close("PTY startup failed");
			} catch (closeError) {
				throw new TerminalBackendCleanupError(error, closeError);
			}
			throw error;
		}
	}
};
/** Register the local PTY backend. */
function apply(ctx, config) {
	const resolved = resolveConfig(config);
	validateConfig(resolved);
	ctx.terminals.registerBackend(new BashTerminalBackend(ctx, resolved));
}
//#endregion
export { BashTerminalBackend, Config, PWSH_PROMPT_SETUP, apply, inject, name };

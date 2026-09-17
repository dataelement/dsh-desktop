import { randomUUID } from "node:crypto";
import z from "@deepseek-ai/schemastery";
import { deadline, timeoutOf } from "@deepseek-ai/dsh-timeout";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region lib/types/index.js
/**
* Model-facing persistent `pwsh` tool over the owner-scoped PTY seam.
* @module @deepseek-ai/dsh-tool-pwsh-persistent
*/
var __addDisposableResource = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
const TRUNCATED_MESSAGE = "<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with Select-String in order to find the line numbers of what you are looking for.</NOTE>";
const LOST_PREFIX_MESSAGE = "<response clipped><NOTE>The beginning of this command output was dropped by the terminal scrollback limit. The following text is the earliest retained output.</NOTE>\n";
const SHELL_RESET_MESSAGE = "The persistent pwsh shell was reset; the next pwsh call starts from the workspace with a fresh current directory and environment.";
const SHELL_PROMPT = "__DSH_PERSISTENT_PWSH_PROMPT__ ";
const TIMEOUT_CODE = "PERSISTENT_PWSH_TIMEOUT";
const SCROLLBACK_PAGE_LINES = 1e3;
const POLL_INTERVAL_MS = 25;
const DEFAULT_DESCRIPTION = "Run commands in a persistent PowerShell shell. State, including the current directory and exported environment variables, persists across calls for this agent.";
function maybeTruncate(content, maxOutputChars, incomplete = false) {
	if (content.length <= maxOutputChars && !incomplete) return content;
	return content.length <= maxOutputChars ? content + TRUNCATED_MESSAGE : content.slice(0, maxOutputChars) + TRUNCATED_MESSAGE;
}
function markers() {
	const nonce = randomUUID();
	return {
		start: `__DSH_PERSISTENT_PWSH_START_${nonce}__`,
		end: `__DSH_PERSISTENT_PWSH_END_${nonce}:`
	};
}
/**
* Escape a command body for embedding in the wrapper's double-quoted string.
* Backtick escapes keep every character literal: backtick first so the
* escapes this function inserts are never re-escaped, `$` so no expansion
* happens at wrapper construction, and `\r\n`/ESC so multi-line commands and
* raw control bytes ride one physical input line without PSReadLine mangling.
* @param value - the model's PowerShell command text.
* @returns the escaped double-quoted-string body.
*/
function quoteForPwsh(value) {
	return value.replaceAll("`", "``").replaceAll("\"", "`\"").replaceAll("$", "`$").replaceAll("\r", "").replaceAll("\n", "`n").replaceAll("\x1B", "`e");
}
function wrapCommand(command, marker) {
	const body = quoteForPwsh(command);
	return `Write-Output '${marker.start}'; $LASTEXITCODE = $null; $__s = 1; try { Invoke-Expression "${body}"; $__ok = $? } catch { $__ok = $false }; if ($null -ne $LASTEXITCODE) { $__s = [int]$LASTEXITCODE } else { $__s = if ($__ok) { 0 } else { 1 } }; Write-Output ('${marker.end}' + $__s)`;
}
function stripPrompt(text) {
	let result = text.replace(/\r?\n$/, "");
	while (result.endsWith(SHELL_PROMPT)) result = result.slice(0, -31);
	return result.endsWith("\n") ? result.slice(0, -1) : result;
}
function commandOutput(snapshot, marker, wrapper) {
	const text = snapshot.text;
	const end = text.lastIndexOf(marker.end);
	const status = /^(\d+)\r?\n/.exec(text.slice(end + marker.end.length))?.[1];
	if (status === void 0) return void 0;
	const startMarker = text.lastIndexOf(marker.start, end);
	const start = startMarker < 0 ? 0 : startMarker + marker.start.length;
	let captured = text.slice(start, end);
	captured = captured.replaceAll(wrapper, "");
	return {
		text: captured.replace(/^\r?\n/, "").replace(/\r?\n$/, ""),
		incomplete: startMarker < 0,
		exitCode: Number(status)
	};
}
function promptCompleted(result) {
	return result.viewport.endsWith(SHELL_PROMPT) || result.viewport.endsWith(`${SHELL_PROMPT}\r\n`) || result.viewport.endsWith(`${SHELL_PROMPT}\n`);
}
function partialOutput(snapshot, marker, wrapper, fallback, fallbackTruncated = false) {
	const startMarker = snapshot.text.lastIndexOf(marker.start);
	if (startMarker >= 0) return {
		text: stripPrompt(snapshot.text.slice(startMarker + marker.start.length).replace(/^\r?\n/, "")),
		incomplete: false
	};
	const fallbackStart = fallback.lastIndexOf(marker.start);
	const afterStart = fallbackStart < 0 ? fallback : fallback.slice(fallbackStart + marker.start.length).replace(/^\r?\n/, "");
	const fallbackEnd = afterStart.lastIndexOf(marker.end);
	return {
		text: stripPrompt((fallbackEnd < 0 ? afterStart : afterStart.slice(0, fallbackEnd)).replaceAll(SHELL_PROMPT, "").replaceAll(wrapper, "")),
		incomplete: fallbackTruncated || fallbackStart < 0
	};
}
async function pause() {
	await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
}
function nextScrollbackOffset(page, offset) {
	if (page.text.length === 0 || page.lineEnd <= offset) return void 0;
	return page.lineEnd;
}
function retainedScrollback(ctx, owner, id, latest = ctx.terminals.read(owner, id, {
	offset: 0,
	count: SCROLLBACK_PAGE_LINES
})) {
	const pages = latest.text.length === 0 ? [] : [latest.text];
	let offset = latest.lineEnd;
	let truncated = latest.truncated;
	while (true) {
		if (offset >= latest.totalLines) break;
		const page = ctx.terminals.read(owner, id, {
			offset,
			count: SCROLLBACK_PAGE_LINES
		});
		truncated ||= page.truncated;
		if (page.text.length > 0) pages.unshift(page.text);
		const next = nextScrollbackOffset(page, offset);
		if (next === void 0 || next >= page.totalLines) break;
		offset = next;
	}
	return {
		text: pages.join("\n"),
		truncated
	};
}
function renderCaptured(output, maxOutputChars) {
	const rendered = maybeTruncate(output.text, maxOutputChars, output.incomplete);
	return appendStatusMarker(output.incomplete && output.text.length > 0 ? LOST_PREFIX_MESSAGE + rendered : rendered, output.exitCode !== void 0 && output.exitCode !== 0 ? `[exit code: ${output.exitCode}]` : void 0);
}
function appendStatusMarker(content, marker) {
	if (marker === void 0) return content;
	return content.length === 0 ? marker : `${content}\n${marker}`;
}
function renderShellExitStatus(content, exitCode, signal) {
	return appendStatusMarker(content, signal !== null ? `[shell killed by signal: ${signal}]` : exitCode !== null ? `[shell exited: code ${exitCode}]` : "[shell exited]");
}
/**
* Render the exited-session result, reset the owner's shell, and reset the
* message that tells the model the next call starts fresh.
* @param shells - the owner-scoped registry to reset.
* @param status - the exited session status (exit code and signal).
* @returns the complete model-facing result.
*/
async function respondToSessionExit(ctx, shells, owner, id, status, marker, wrapped, fallback, fallbackTruncated, config) {
	const snapshot = retainedScrollback(ctx, owner, id);
	await shells.reset(owner, "persistent pwsh shell exited");
	return [renderShellExitStatus(renderCaptured(partialOutput(snapshot, marker, wrapped, fallback, fallbackTruncated), config.maxOutputChars), status.exitCode, status.signal), SHELL_RESET_MESSAGE].filter((part) => part.length > 0).join("\n");
}
/**
* The pwsh prompt function that overrides the backend bootstrap value with
* this tool's own prompt. `[char]27`/`[char]7` build the OSC bytes at runtime
* because raw ESC characters in submitted input are unreliable under
* PSReadLine.
*/
const PWSH_PROMPT_SETUP = "function prompt { [Console]::Write([char]27 + ']133;D;' + [int]$LASTEXITCODE + [char]7); '__DSH_PERSISTENT_PWSH_PROMPT__ ' }";
function persistentShells(ctx, config) {
	const pending = /* @__PURE__ */ new WeakMap();
	const live = /* @__PURE__ */ new Map();
	const creating = /* @__PURE__ */ new Set();
	const ownerCleanupInstalled = /* @__PURE__ */ new WeakSet();
	const lifecycle = new AbortController();
	const close = async (owner, id, reason) => {
		if (!ctx.terminals.list(owner).some((snapshot) => snapshot.sessionId === id)) return;
		await ctx.terminals.kill(owner, id, reason);
	};
	ctx.effect(() => async () => {
		lifecycle.abort(/* @__PURE__ */ new Error("tool-pwsh-persistent disposed during shell creation"));
		await Promise.allSettled([...creating]);
		const closing = [...live].map(async ([owner, id]) => {
			await close(owner, id, "tool-pwsh-persistent disposed");
		});
		await Promise.all(closing);
		live.clear();
	}, "tool-pwsh-persistent shell cleanup");
	const reset = async (owner, reason) => {
		pending.delete(owner);
		const id = live.get(owner);
		live.delete(owner);
		if (id !== void 0) await close(owner, id, reason);
	};
	const get = (owner, signal) => {
		const existing = pending.get(owner);
		if (existing !== void 0) return existing;
		const combinedSignal = AbortSignal.any([signal, lifecycle.signal]);
		const tracked = (async () => {
			try {
				const cwd = owner.session.header.cwd;
				const spawned = await ctx.terminals.spawn(owner, {
					type: config.backendType,
					...cwd === void 0 ? {} : { cwd }
				}, combinedSignal);
				live.set(owner, spawned.sessionId);
				if (!ownerCleanupInstalled.has(owner)) {
					ownerCleanupInstalled.add(owner);
					owner.ctx.effect(() => () => {
						pending.delete(owner);
						live.delete(owner);
					}, "tool-pwsh-persistent owner cache cleanup");
				}
				const result = await ctx.terminals.startSend(owner, spawned.sessionId, {
					text: PWSH_PROMPT_SETUP,
					submit: true,
					signal: combinedSignal
				}).done;
				if (result.sessionStatus.kind === "exited" || result.waitReason === "timeout") throw new Error("persistent pwsh shell did not accept initialization");
				return spawned.sessionId;
			} catch (error) {
				await reset(owner, "persistent pwsh initialization failed");
				throw error;
			}
		})().finally(() => {
			creating.delete(tracked);
		});
		creating.add(tracked);
		pending.set(owner, tracked);
		return tracked;
	};
	return {
		get,
		reset
	};
}
async function executeCommand(ctx, shells, owner, command, config, upstream) {
	const env_1 = {
		stack: [],
		error: void 0,
		hasError: false
	};
	try {
		const commandDeadline = __addDisposableResource(env_1, deadline(upstream, config.timeoutMs, TIMEOUT_CODE), false);
		const id = await shells.get(owner, commandDeadline.signal);
		const marker = markers();
		const wrapped = wrapCommand(command, marker);
		let first = true;
		let fallback = "";
		let fallbackTruncated = false;
		while (true) {
			const status = ctx.terminals.list(owner).find((session) => session.sessionId === id)?.status;
			if (status?.kind === "exited") return await respondToSessionExit(ctx, shells, owner, id, status, marker, wrapped, fallback, fallbackTruncated, config);
			let operation;
			let result;
			try {
				operation = ctx.terminals.startSend(owner, id, {
					text: first ? wrapped : "",
					submit: first,
					signal: commandDeadline.signal
				});
				first = false;
				result = await operation.done;
			} catch (error) {
				await shells.reset(owner, "persistent pwsh send failed");
				throw error;
			}
			const incremental = operation.readOutput();
			fallback = incremental.delta.length > 0 ? fallback + incremental.delta : result.viewport;
			fallbackTruncated ||= incremental.truncated || result.truncated;
			const latest = ctx.terminals.read(owner, id, {
				offset: 0,
				count: SCROLLBACK_PAGE_LINES
			});
			const timedOut = timeoutOf(commandDeadline.signal, TIMEOUT_CODE);
			if (timedOut !== void 0) {
				const partial = renderCaptured(partialOutput(retainedScrollback(ctx, owner, id, latest), marker, wrapped, fallback, fallbackTruncated), config.maxOutputChars);
				await shells.reset(owner, "persistent pwsh command timed out");
				return [
					`Your command timed out after ${Math.round(timedOut.timeoutMs / 1e3)} seconds or experienced an OOM error. Below is partial output:`,
					partial,
					SHELL_RESET_MESSAGE
				].join("\n");
			}
			if (commandDeadline.signal.aborted) {
				await shells.reset(owner, "persistent pwsh command aborted");
				commandDeadline.signal.throwIfAborted();
			}
			if (latest.text.includes(marker.end)) {
				const complete = commandOutput(retainedScrollback(ctx, owner, id, latest), marker, wrapped);
				if (complete !== void 0) return renderCaptured(complete, config.maxOutputChars);
			}
			if (result.sessionStatus.kind === "exited") return await respondToSessionExit(ctx, shells, owner, id, result.sessionStatus, marker, wrapped, fallback, fallbackTruncated, config);
			if (promptCompleted(result)) return renderCaptured(partialOutput(retainedScrollback(ctx, owner, id, latest), marker, wrapped, fallback, fallbackTruncated), config.maxOutputChars);
			await pause();
		}
	} catch (e_1) {
		env_1.error = e_1;
		env_1.hasError = true;
	} finally {
		__disposeResources(env_1);
	}
}
/**
* Register the model-facing persistent `pwsh` tool.
* @param ctx - plugin context carrying tools and the owner-scoped PTY service.
* @param config - selected PTY backend and command deadline.
*/
function registerPersistentPwsh(ctx, config) {
	const shells = persistentShells(ctx, config);
	const queues = /* @__PURE__ */ new WeakMap();
	const serialized = async (owner, operation) => {
		const run = (queues.get(owner) ?? Promise.resolve()).then(operation, operation);
		const tail = run.then(() => void 0, () => void 0);
		queues.set(owner, tail);
		try {
			return await run;
		} finally {
			if (queues.get(owner) === tail) queues.delete(owner);
		}
	};
	ctx.tools.register(defineTool({
		name: "pwsh",
		description: config.description,
		parameters: { command: {
			type: "string",
			required: true,
			description: "The PowerShell command to run. Relative path is preferred in the command."
		} },
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args, exec) {
			if (args.command.trim().length === 0) throw new Error("command must be a non-empty string");
			const owner = exec.agent;
			if (owner === void 0) throw new Error("pwsh requires an owning agent session");
			return serialized(owner, async () => {
				exec.signal.throwIfAborted();
				return executeCommand(ctx, shells, owner, args.command, config, exec.signal);
			});
		},
		presentCall: (args) => ({
			card: "terminal",
			title: args.command
		})
	}));
}
const name = "tool-pwsh-persistent";
const inject = ["tools", "terminals"];
/** Runtime configuration schema for the persistent pwsh tool. */
const Config = z.object({
	backendType: z.string().default("shell"),
	timeoutMs: z.number().default(3e5),
	maxOutputChars: z.number().default(16e3),
	description: z.string().default(DEFAULT_DESCRIPTION)
});
/** Register one owner-scoped persistent `pwsh` tool. */
function apply(ctx, config) {
	const resolved = {
		backendType: config.backendType ?? "shell",
		timeoutMs: config.timeoutMs ?? 3e5,
		maxOutputChars: config.maxOutputChars ?? 16e3,
		description: config.description ?? DEFAULT_DESCRIPTION
	};
	if (resolved.backendType.trim().length === 0) throw new Error("tool-pwsh-persistent: backendType must be non-empty");
	if (!Number.isSafeInteger(resolved.timeoutMs) || resolved.timeoutMs <= 0) throw new Error("tool-pwsh-persistent: timeoutMs must be a positive safe integer");
	if (!Number.isSafeInteger(resolved.maxOutputChars) || resolved.maxOutputChars <= 0) throw new Error("tool-pwsh-persistent: maxOutputChars must be a positive safe integer");
	if (resolved.description.trim().length === 0) throw new Error("tool-pwsh-persistent: description must be non-empty");
	registerPersistentPwsh(ctx, resolved);
}
//#endregion
export { Config, apply, inject, name };

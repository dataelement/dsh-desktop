import z from "@deepseek-ai/schemastery";
import { SHELL_SETTINGS_NAMESPACE, ShellExecutor } from "@deepseek-ai/dsh-shell";
import { MAX_TIMER_DELAY_MS, clampTimeout, deadline, timeoutOf } from "@deepseek-ai/dsh-timeout";
import { lstatSync } from "node:fs";
import { join } from "node:path";
//#region lib/types/resolve.js
/**
* PowerShell executable resolution, dependency-free so non-package consumers
* (the repository's coverage-gate probe in `vitest.config.ts`) can share the
* ONE resolution definition with the executor and its suites — a probe that
* resolved differently from the code under test could exempt a file whose
* suites actually run.
*
* @module @deepseek-ai/dsh-pwsh-local/resolve
*/
/**
* Well-known Windows PowerShell install locations plus PATH entries, newest
* first. Explicitly parameterized (env) so resolution is a pure function of
* its inputs on every platform.
* @param env - the environment to probe; defaults to the process environment.
* @returns candidate `pwsh` executable paths in resolution order.
*/
function candidatePwshPaths(env = process.env) {
	const programFiles = env.ProgramFiles ?? "C:\\Program Files";
	const systemRoot = env.SystemRoot ?? "C:\\Windows";
	const candidates = [join(programFiles, "PowerShell", "7", "pwsh.exe")];
	for (const entry of (env.PATH ?? "").split(";")) {
		const trimmed = entry.trim().replace(/^"|"$/g, "");
		if (trimmed.length === 0) continue;
		candidates.push(join(trimmed, "pwsh.exe"));
	}
	candidates.push(join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"));
	return candidates;
}
/**
* Whether a candidate can be spawned. lstat opens the entry itself instead of
* following reparse points, so it sees the Store app execution alias where
* stat hits the target's ACL (EACCES); Node reports that alias as a symlink
* on current releases and as a plain file on older ones, and CreateProcess
* resolves either shape. A real directory never matches.
*/
function candidateExists(candidate) {
	try {
		const stat = lstatSync(candidate);
		return stat.isFile() || stat.isSymbolicLink();
	} catch {
		return false;
	}
}
/**
* Resolve the pwsh executable this executor spawns.
* @param configured - an explicit `pwshPath` config value, trusted as-is.
* @param env - the environment to probe on Windows; defaults to the process environment.
* @param platform - the platform to resolve for; defaults to the process platform.
* @returns the first existing well-known location on Windows (PowerShell 7
*   install, a PATH entry such as the Microsoft Store install, then Windows
*   PowerShell 5.1), else `pwsh` for PATH resolution.
*/
function resolvePwshPath(configured, env = process.env, platform = process.platform) {
	if (configured !== void 0 && configured.length > 0) return configured;
	if (platform === "win32") {
		for (const candidate of candidatePwshPaths(env)) if (candidateExists(candidate)) return candidate;
	}
	return "pwsh";
}
//#endregion
//#region lib/types/index.js
/**
* Local PowerShell Service Provider for the bash capability seam. Each command runs
* as `pwsh -NoLogo -NoProfile -NonInteractive -Command <command>` in a managed
* process spawned through `ctx.subprocess`; the executor owns command
* defaulting, deadlines and cause classification, the model-friendly terminal
* environment, and the model-facing stdout/stderr merge for background reads.
*
* The command string is passed as ONE argv element to `-Command`: PowerShell
* itself parses the text, and no intermediate shell exists, so there is no
* shell-quoting layer to escape (the `bash -c` string domain has no
* equivalent here). Native Win32 paths (`C:\...`) pass through unchanged.
*
* @module @deepseek-ai/dsh-pwsh-local
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
/**
* Model-friendly environment overrides for PowerShell: disable colors and
* pagers that would garble tool output. `TERM=dumb` is a POSIX concept and is
* deliberately absent; `NO_COLOR` is honored by modern pwsh renderers.
*/
const ENV_OVERRIDES = {
	NO_COLOR: "1",
	PAGER: "cat",
	GIT_PAGER: "cat"
};
/**
* UTF-8 output pinning prepended to every command. The subprocess collector
* decodes output bytes as UTF-8, but Windows PowerShell 5.1 (the last-resort
* executable fallback) writes the console/OEM code page by default, which
* garbles non-ASCII output; pwsh 7 defaults to UTF-8 and is unaffected. The
* statements ride on line 1 after `; ` separators so PowerShell error line
* numbers stay accurate.
*/
const ENCODING_PREAMBLE = "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); ";
/** Default SIGTERM→SIGKILL grace period (the `graceMs` config). */
const DEFAULT_GRACE_MS = 3e3;
/** Default per-stream spill cap (the `maxSpillBytes` config). */
const DEFAULT_MAX_SPILL_BYTES = 64 * 1024 * 1024;
/** Project a settled collect-mode reader into the final CollectedOutput shape. */
function finalOutput(reader) {
	const read = reader.readFrom(0);
	return {
		text: read.text,
		truncated: read.lossy,
		...read.spillPath !== void 0 ? { spillPath: read.spillPath } : {}
	};
}
function assertPositiveFinite(name, value) {
	if (!Number.isFinite(value) || value <= 0) throw new Error(`pwsh-local: ${name} must be a positive finite number`);
}
/**
* Reject a resolved section this executor could not run with. The schema
* expresses neither "positive and finite" nor the timer bound `graceMs` has to
* fit, so a stored value is refused where it is written instead of failing at
* the next command.
* @param config - the resolved section, schema-valid by construction.
* @throws Error naming the field that cannot be used.
*/
function assertServiceablePwshConfig(config) {
	const resolved = config;
	assertPositiveFinite("timeoutMs", resolved.timeoutMs);
	assertPositiveFinite("maxTimeoutMs", resolved.maxTimeoutMs);
	assertPositiveFinite("maxOutputBytes", resolved.maxOutputBytes);
	assertPositiveFinite("maxSpillBytes", resolved.maxSpillBytes);
	assertPositiveFinite("graceMs", resolved.graceMs);
	if (resolved.graceMs > MAX_TIMER_DELAY_MS) throw new Error(`pwsh-local: graceMs must be no greater than ${MAX_TIMER_DELAY_MS}`);
}
/**
* Local PowerShell executor over `ctx.subprocess`. Bounded output, spill
* files, and managed-range termination are the subprocess service's mechanics;
* this executor supplies their configured budgets per spawn.
*/
var PwshLocalExecutor = class PwshLocalExecutor extends ShellExecutor {
	static inject = ["subprocess"];
	static Config = z.object({
		cwd: z.string(),
		timeoutMs: z.number().default(12e4),
		maxTimeoutMs: z.number().default(6e5),
		maxOutputBytes: z.number().default(64e3),
		maxSpillBytes: z.number().default(DEFAULT_MAX_SPILL_BYTES),
		graceMs: z.number().default(DEFAULT_GRACE_MS),
		pwshPath: z.string()
	});
	/** The currently authoritative config: the settings section, or the composition entry. */
	source;
	/** The declared executable the current {@link pwshPath} was resolved from. */
	declaredPwshPath;
	/** The pwsh executable resolved from the current config. */
	resolvedPwshPath;
	/** Validated config (schemastery applied the defaults before construction). */
	get config() {
		return this.source();
	}
	/** The pwsh executable every command runs through. */
	get pwshPath() {
		return this.resolvedPwshPath;
	}
	constructor(ctx, config) {
		super(ctx);
		const entry = config;
		assertServiceablePwshConfig(entry);
		this.source = () => entry;
		this.declaredPwshPath = entry.pwshPath;
		this.resolvedPwshPath = resolvePwshPath(entry.pwshPath);
		ctx.inject(["settings"], (settingsCtx) => {
			settingsCtx.settings.installSection(ctx, SHELL_SETTINGS_NAMESPACE, PwshLocalExecutor.Config, entry, {
				validate: assertServiceablePwshConfig,
				setSource: (current) => {
					this.source = current;
				},
				onChange: () => {
					const declared = this.source().pwshPath;
					if (declared === this.declaredPwshPath) return;
					this.declaredPwshPath = declared;
					this.resolvedPwshPath = resolvePwshPath(declared);
				}
			});
		});
	}
	/**
	* Resolve a request into a fully-specified spec: fill `workdir` from
	* `config.cwd` (else `process.cwd()`), and `timeoutMs` from
	* `config.timeoutMs`, capped at `config.maxTimeoutMs`.
	*/
	resolve(request) {
		const timeoutMs = clampTimeout(request.timeoutMs, this.config.timeoutMs, this.config.maxTimeoutMs, "pwsh-local: request.timeoutMs");
		const stdoutMaxBytes = request.stdoutMaxBytes ?? this.config.maxOutputBytes;
		assertPositiveFinite("request.stdoutMaxBytes", stdoutMaxBytes);
		return {
			command: request.command,
			workdir: request.workdir ?? this.config.cwd ?? process.cwd(),
			timeoutMs,
			stdoutMaxBytes,
			...request.signal ? { signal: request.signal } : {},
			...request.stdin !== void 0 ? { stdin: request.stdin } : {},
			...request.env !== void 0 ? { env: request.env } : {},
			...request.dshEnv !== void 0 ? { dshEnv: request.dshEnv } : {},
			sandboxPolicy: request.sandboxPolicy
		};
	}
	/**
	* The pwsh invocation argv for one resolved spec — the argv-level seam a
	* confining subclass wraps through `ctx.sandbox.confine` (the pwsh twin of
	* `dsh-bash-local`'s `runArgv`/`startArgv` hooks; see
	* `@deepseek-ai/dsh-pwsh-sandbox`).
	*/
	argv(spec) {
		return [
			this.pwshPath,
			"-NoLogo",
			"-NoProfile",
			"-NonInteractive",
			"-Command",
			`${ENCODING_PREAMBLE}${spec.command}`
		];
	}
	/** Map one resolved spec plus its argv onto a fully-specified subprocess spawn. */
	spawnSpec(spec, stdoutMaxBytes, signal, argv) {
		const collect = (maxBytes) => ({
			maxBytes,
			spill: { maxBytes: this.config.maxSpillBytes }
		});
		return {
			argv: [...argv],
			cwd: spec.workdir,
			stdio: {
				stdin: spec.stdin !== void 0 ? { data: spec.stdin } : "ignore",
				stdout: collect(stdoutMaxBytes),
				stderr: collect(this.config.maxOutputBytes)
			},
			graceMs: this.config.graceMs,
			signal,
			env: {
				...ENV_OVERRIDES,
				...spec.env,
				...spec.dshEnv
			}
		};
	}
	/** The collect-mode readers the executor itself requested (present by construction). */
	static collected(handle) {
		const { stdout, stderr } = handle.collected;
		/* v8 ignore start -- collect dispositions expose both readers by the seam contract; defensive. */
		if (stdout === void 0 || stderr === void 0) throw new Error("pwsh-local: subprocess implementation dropped a requested collect stream");
		/* v8 ignore stop */
		return {
			stdout,
			stderr
		};
	}
	async run(spec) {
		return this.runArgv(spec, this.argv(spec));
	}
	/** Foreground run of an exact argv (the confining subclass re-wraps it). */
	async runArgv(spec, argv) {
		const env_1 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			const d = __addDisposableResource(env_1, deadline(spec.signal, spec.timeoutMs, "BASH_TIMEOUT"), false);
			const handle = this.ctx.subprocess.spawn(this.spawnSpec(spec, spec.stdoutMaxBytes, d.signal, argv));
			const outcome = await handle.done;
			const collected = PwshLocalExecutor.collected(handle);
			const timedOut = timeoutOf(d.signal, "BASH_TIMEOUT") !== void 0;
			const aborted = d.signal.aborted && !timedOut;
			return {
				...outcome,
				timedOut,
				aborted,
				timeoutMs: spec.timeoutMs,
				stdout: finalOutput(collected.stdout),
				stderr: finalOutput(collected.stderr)
			};
		} catch (e_1) {
			env_1.error = e_1;
			env_1.hasError = true;
		} finally {
			__disposeResources(env_1);
		}
	}
	start(spec) {
		return this.startArgv(spec, this.argv(spec));
	}
	/** Background start of an exact argv (the confining subclass re-wraps it). */
	startArgv(spec, argv) {
		const running = this.ctx.subprocess.spawn(this.spawnSpec(spec, this.config.maxOutputBytes, spec.signal, argv));
		const collected = PwshLocalExecutor.collected(running);
		let providerFailureNote;
		const consumeProviderFailure = () => {
			const note = providerFailureNote ?? "";
			providerFailureNote = void 0;
			return note;
		};
		let stdoutOffset = 0;
		let stderrOffset = 0;
		const proc = {
			status: "running",
			exitCode: null,
			signal: null,
			done: running.done.then((outcome) => {
				if (proc.status === "running") proc.status = spec.signal?.aborted === true || outcome.signal !== null ? "killed" : "completed";
				proc.exitCode = outcome.exitCode;
				proc.signal = outcome.signal;
				this.onProcessDone(proc, collected.stderr.readFrom(0).text, false);
			}, (error) => {
				proc.status = "killed";
				let detail = "unprintable provider failure";
				try {
					detail = String(error);
				} catch {}
				providerFailureNote = `subprocess failed before reporting an outcome: ${detail}`;
				this.onProcessDone(proc, providerFailureNote, true, error);
			}),
			readOutput: () => {
				const out = collected.stdout.readFrom(stdoutOffset);
				const err = collected.stderr.readFrom(stderrOffset);
				stdoutOffset = out.nextOffset;
				stderrOffset = err.nextOffset;
				const providerFailure = consumeProviderFailure();
				const failureSeparator = err.text.length > 0 && !err.text.endsWith("\n") ? "\n" : "";
				const errText = err.text + (providerFailure.length > 0 ? `${failureSeparator}${providerFailure}` : "");
				const separator = out.text.length > 0 && !out.text.endsWith("\n") ? "\n" : "";
				return {
					delta: out.text + (errText.length > 0 ? `${separator}[stderr]\n${errText}` : ""),
					lossy: out.lossy || err.lossy,
					...out.spillPath !== void 0 ? { stdoutSpillPath: out.spillPath } : {},
					...err.spillPath !== void 0 ? { stderrSpillPath: err.spillPath } : {}
				};
			},
			kill: () => {
				if (proc.status !== "running") return false;
				proc.status = "killed";
				running.terminate();
				return true;
			}
		};
		return proc;
	}
	/**
	* Settlement hook for subclasses that attach execution facts to a process.
	* The base implementation is intentionally empty. Mirrored from
	* `dsh-bash-local` (whose sandboxing subclass consumes the same hook); the
	* pwsh-confining consumer is `@deepseek-ai/dsh-pwsh-sandbox`.
	* @param _proc - the settled process handle.
	* @param _stderr - the process's retained stderr tail used by subclasses for settlement classification.
	* @param _providerRejected - whether the subprocess promise rejected without a direct outcome.
	* @param _providerError - the provider rejection reason, which may itself be undefined.
	*/
	onProcessDone(_proc, _stderr, _providerRejected, _providerError) {}
};
//#endregion
export { ENCODING_PREAMBLE, ENV_OVERRIDES, PwshLocalExecutor, PwshLocalExecutor as default, assertServiceablePwshConfig, candidatePwshPaths, resolvePwshPath };

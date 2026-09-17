import { SandboxUnavailableError } from "@deepseek-ai/dsh-sandbox";
import { LocalBashExecutor } from "@deepseek-ai/dsh-bash-local";
import { accessSync, constants, statSync } from "node:fs";
//#region lib/types/helpers.js
/**
* Internal sandbox-result classification helpers.
*
* @module @deepseek-ai/dsh-bash-sandbox/helpers
*/
/** Node-local spawn codes proven to identify executable resolution or permission failure. */
const EXECUTABLE_SPAWN_CODES = new Set(["EACCES", "ENOENT"]);
/** Whether the caller-owned spawn cwd can be entered. */
function isUsableWorkdir(path) {
	try {
		if (!statSync(path).isDirectory()) return false;
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}
/**
* Attribute only Node ENOENT/EACCES failures whose error path equals argv[0]
* after independently ruling out the caller-owned cwd. A supplied error path
* must exactly identify the runner; without one, the syscall must. With a
* usable cwd, these codes describe resolution or execute permission for that
* argv[0] or its shebang interpreter.
* The workdir is checked at classification time, not atomically with spawn;
* concurrent path replacement may change attribution but cannot permit an
* unconfined execution.
* @param error - the original spawn rejection.
* @param runnerProgram - provider argv[0], the executable that establishes confinement.
* @param workdir - the caller-owned spawn cwd, checked independently for usability.
* @returns whether the rejection has executable-specific runner evidence.
*/
function isRunnerSpawnFailure(error, runnerProgram, workdir) {
	if (runnerProgram === void 0 || !isUsableWorkdir(workdir)) return false;
	if (typeof error !== "object" || error === null) return false;
	const { code, path, syscall } = error;
	if (typeof code !== "string" || !EXECUTABLE_SPAWN_CODES.has(code)) return false;
	if (typeof syscall !== "string") return false;
	const exactSyscall = `spawn ${runnerProgram}`;
	if (path === void 0) return syscall === exactSyscall;
	if (typeof path !== "string" || path.length === 0 || path !== runnerProgram) return false;
	return syscall === "spawn" || syscall === exactSyscall;
}
/**
* Classify a failed run against the selected backend's denial dialect.
* @param result - settled foreground run.
* @param signatures - case-insensitive denial substrings from the active wrap.
* @returns whether the failed run matches that denial dialect.
*/
function classifyDenial(result, signatures) {
	return matchesSignature(result.exitCode, result.stderr.text, signatures);
}
/**
* Classify one settled process against the selected backend's structured
* runner-failure rules. Each rule requires a nonzero exit, its optional
* exit-code gate, and a fatal signature on one stderr line after exact
* informational lines are excluded.
* @param exitCode - process exit code; null means signal termination.
* @param stderr - collected stderr text, left unchanged.
* @param rules - structured runner-failure rules from the active wrap.
* @returns the first matching fatal line, or undefined when evidence is insufficient.
*/
function classifyRunnerFailure(exitCode, stderr, rules) {
	if (exitCode === null || exitCode === 0) return void 0;
	const lines = stderr.split(/\r?\n/);
	for (const rule of rules) {
		if (rule.allowedExitCodes !== void 0 && !rule.allowedExitCodes.includes(exitCode)) continue;
		const informationalLines = new Set((rule.informationalLines ?? []).map((line) => line.toLowerCase()));
		const fatalSignatures = rule.fatalSignatures.filter((signature) => signature.trim().length > 0).map((signature) => signature.toLowerCase());
		for (const line of lines) {
			const lowered = line.toLowerCase();
			if (informationalLines.has(lowered)) continue;
			if (fatalSignatures.some((signature) => lowered.includes(signature))) return { detail: line };
		}
	}
}
/**
* Match a non-zero exit against case-insensitive stderr signatures.
* @param exitCode - process exit code; null means signal termination.
* @param stderr - collected stderr text.
* @param signatures - substrings identifying the selected backend's dialect.
* @returns whether this is a non-zero exit whose stderr matches a signature.
*/
function matchesSignature(exitCode, stderr, signatures) {
	if (exitCode === null || exitCode === 0) return false;
	const lowered = stderr.toLowerCase();
	return signatures.some((signature) => lowered.includes(signature.toLowerCase()));
}
//#endregion
//#region lib/types/index.js
/**
* Sandbox-consuming bash executor. It wraps the exact local bash argv through
* `ctx.sandbox`, inherits local process mechanics, and reports the selected
* mode, enforcement, and denial facts. Positive runner-executable evidence
* identifies a broken confinement runner: foreground calls throw
* `SANDBOX_UNAVAILABLE`, while background processes carry `runnerFailed`;
* other provider rejections retain stage-neutral local-executor semantics. The
* tool owns approval and passes a complete per-call policy.
* @module @deepseek-ai/dsh-bash-sandbox
*/
/**
* Registers as `ctx.shell` in place of the local executor and requires a
* `ctx.sandbox` provider plus `ctx.sandboxPolicy`; the tool layer is
* unchanged. Tool calls pass the calling session's resolved policy; direct
* calls fall back to deployment policy. `result.sandbox` reports the mode and
* enforcement actually used.
*/
var SandboxBashExecutor = class extends LocalBashExecutor {
	static inject = [
		"subprocess",
		"sandbox",
		"sandboxPolicy"
	];
	mode;
	/**
	* Per-process confinement facts retained until settlement. Providers may
	* vary enforcement and diagnostic dialect between overlapping calls, so a
	* shared latest-wrap value would classify a process against the wrong facts.
	* Unconfined processes have no entry.
	*/
	processFacts = /* @__PURE__ */ new Map();
	constructor(ctx, config) {
		super(ctx, config);
		this.mode = ctx.sandboxPolicy.defaultMode;
	}
	/** The configured default mode — the capability fact the tool layer reads. */
	get sandboxMode() {
		return this.mode;
	}
	/**
	* Stamp a complete per-call policy onto the spec. Tool calls supply the
	* calling session's resolved mode and root; lower-level callers fall back to
	* the deployment policy.
	*/
	resolve(request) {
		return {
			...super.resolve(request),
			sandboxPolicy: request.sandboxPolicy ?? this.ctx.sandboxPolicy.resolve()
		};
	}
	async run(spec) {
		const policy = spec.sandboxPolicy;
		const { mode } = policy;
		if (mode === "danger-full-access") return {
			...await super.run(spec),
			sandbox: {
				mode,
				denied: false
			}
		};
		const confined = this.confine(spec.command, {
			...policy,
			mode
		});
		let result;
		try {
			result = await this.runArgv(spec, confined.argv);
		} catch (error) {
			if (spec.signal?.aborted === true) spec.signal.throwIfAborted();
			if (isRunnerSpawnFailure(error, confined.argv[0], spec.workdir)) throw new SandboxUnavailableError(mode, String(error));
			throw error;
		}
		const runnerFailure = classifyRunnerFailure(result.exitCode, result.stderr.text, confined.runnerFailureRules);
		if (runnerFailure !== void 0) throw new SandboxUnavailableError(mode, runnerFailure.detail);
		return {
			...result,
			sandbox: {
				mode,
				denied: classifyDenial(result, confined.denialSignatures),
				enforcement: confined.enforcement
			}
		};
	}
	start(spec) {
		const policy = spec.sandboxPolicy;
		const { mode } = policy;
		if (mode === "danger-full-access") return super.start(spec);
		const confined = this.confine(spec.command, {
			...policy,
			mode
		});
		let proc;
		try {
			proc = this.startArgv(spec, confined.argv);
		} catch (error) {
			if (isRunnerSpawnFailure(error, confined.argv[0], spec.workdir)) throw new SandboxUnavailableError(mode, String(error));
			throw error;
		}
		const { enforcement, denialSignatures, runnerFailureRules } = confined;
		this.processFacts.set(proc, {
			mode,
			enforcement,
			denialSignatures,
			runnerFailureRules,
			runnerProgram: confined.argv[0],
			workdir: spec.workdir
		});
		return proc;
	}
	/**
	* Stamp per-process sandbox facts before `done` settles. Full-access processes
	* have no facts; signal deaths are not denials.
	*/
	onProcessDone(proc, stderr, providerRejected, providerError) {
		const facts = this.processFacts.get(proc);
		if (facts !== void 0) {
			this.processFacts.delete(proc);
			const runnerFailed = providerRejected ? isRunnerSpawnFailure(providerError, facts.runnerProgram, facts.workdir) : classifyRunnerFailure(proc.exitCode, stderr, facts.runnerFailureRules) !== void 0;
			proc.sandbox = {
				mode: facts.mode,
				denied: !runnerFailed && matchesSignature(proc.exitCode, stderr, facts.denialSignatures),
				enforcement: facts.enforcement,
				...runnerFailed ? { runnerFailed } : {}
			};
		}
		super.onProcessDone(proc, stderr, providerRejected, providerError);
	}
	/**
	* Wrap one shell command via the `ctx.sandbox` provider. Provider errors
	* propagate unchanged; the returned argv is handed directly to the local
	* executor's subprocess path.
	* @param command - shell source for the confined inner `bash -c`.
	* @param policy - resolved confined execution policy.
	* @returns the provider's exact argv and settlement-classification facts.
	*/
	confine(command, policy) {
		return this.ctx.sandbox.confine([
			"bash",
			"-c",
			command
		], policy);
	}
};
//#endregion
export { SandboxBashExecutor, SandboxBashExecutor as default };

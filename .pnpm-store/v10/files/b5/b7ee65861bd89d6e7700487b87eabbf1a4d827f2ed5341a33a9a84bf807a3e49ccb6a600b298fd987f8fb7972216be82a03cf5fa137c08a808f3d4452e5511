import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { LAUNCHER_BIN, LAUNCHER_FAILURE_EXIT, grantArgs, launcherPath, probe } from "@deepseek-ai/node-addon-system/landlock-run";
import z from "@deepseek-ai/schemastery";
import { SandboxProvider, SandboxUnavailableError, writableRoots } from "@deepseek-ai/dsh-sandbox";
import { AclWriteGrant, assertTempRootOutsideWorkspace, tempWriteSid, workspaceWriteSid } from "@deepseek-ai/dsh-sandbox-windows-acl";
import { assertNever } from "@deepseek-ai/dsh-util-values";
//#region lib/types/profiles.js
/**
* Internal platform-profile builders for the local sandbox provider.
*
* @module @deepseek-ai/dsh-sandbox-local/profiles
*/
/**
* Build the bwrap profile arguments for one file-effect policy.
* @param policy - file-effect policy to express as bwrap mounts.
* @returns profile arguments before the trailing separator and command argv.
*/
function bwrapProfileArgs(policy) {
	const args = [
		"--ro-bind",
		"/",
		"/",
		"--dev",
		"/dev",
		"--unshare-pid",
		"--proc",
		"/proc",
		"--die-with-parent"
	];
	if (policy.mode === "workspace-write") {
		args.push("--tmpfs", "/tmp");
		args.push("--bind", policy.workspaceRoot, policy.workspaceRoot);
	}
	return args;
}
/**
* Build the Landlock launcher grants for one file-effect policy.
* @param policy - file-effect policy to express as Landlock allow-list grants.
* @returns launcher grant arguments before the trailing separator and command argv.
*/
function landlockProfileArgs(policy) {
	const readWrite = ["/dev/null"];
	if (policy.mode === "workspace-write") readWrite.push("/tmp", policy.workspaceRoot);
	return grantArgs({
		readOnly: ["/"],
		readWrite
	});
}
/** Quote one path as an SBPL string literal. */
function sbplString(path) {
	return `"${path.replaceAll("\\", String.raw`\\`).replaceAll("\"", String.raw`\"`)}"`;
}
/**
* Build the sandbox-exec arguments and SBPL profile for one policy. The
* writable roots come from the shared {@link writableRoots} helper (canonical,
* deduplicated) so the Seatbelt grant and the in-process fs fence
* (`@deepseek-ai/dsh-fs-sandbox`) can never drift apart.
* @param policy - file-effect policy to express as an SBPL profile.
* @returns sandbox-exec arguments before the trailing separator and command argv.
*/
function seatbeltProfileArgs(policy) {
	const forms = [
		"(version 1)",
		"(allow default)",
		"(deny file-write*)",
		`(allow file-write* (literal ${sbplString("/dev/null")}))`
	];
	const roots = writableRoots(policy);
	if (roots.length > 0) forms.push(`(allow file-write* ${roots.map((root) => `(subpath ${sbplString(root)})`).join(" ")})`);
	return ["-p", forms.join(" ")];
}
//#endregion
//#region lib/types/index.js
/**
* Local sandbox backend. It selects the platform runner chain (Linux bwrap then
* Landlock; macOS Seatbelt; Windows the ACL restricted-token runner), functionally probes
* competing candidates once, and reports each wrap's enforcement and stderr
* classification facts. Missing or unusable confinement fails closed rather
* than returning the original argv.
*
* The windows-acl rung additionally owns the write grants: the write SID is
* the per-WORKSPACE identity derived from the canonical workspace path
* (`workspaceWriteSid`), while every live session receives a RANDOM private
* temp directory and its own derived capability (`tempWriteSid`). The
* workspace-root ACE materializes once per workspace per server lifetime
* and STANDS (the cross-session reuse cache — the exact-ACE skip makes
* every later provision O(1) instead of re-propagating the tree per
* session); the private-temp ACEs are revoked on dispose. The runner
* receives both SIDs (their presence marks the seam-managed contract) and
* stops managing DACLs itself. The rung reports partial enforcement because
* WRITE_RESTRICTED must retain Everyone in its
* restricting list and NTFS hard links alias one file object across paths.
* @module @deepseek-ai/dsh-sandbox-local
*/
/** Probe whether `bwrap` can create the profile; the provider caches the bounded result. */
function defaultProbeBwrap(timeoutMs) {
	return spawnSync("bwrap", [
		...bwrapProfileArgs({
			mode: "read-only",
			workspaceRoot: "/"
		}),
		"--",
		"true"
	], {
		timeout: timeoutMs,
		stdio: "ignore"
	}).status === 0;
}
/**
* Functional Seatbelt probe: apply the real `read-only` profile through
* `sandbox-exec -p` and run `true` under it — exit 0 means the kernel
* accepted and enforced the profile (`sandbox-exec` exits non-zero when
* `sandbox_init` refuses it). A missing `sandbox-exec` (every non-macOS
* host) fails the spawn and probes `unusable`, exactly like the other
* rungs' absent binaries. Apple marks the CLI deprecated but ships it on
* every macOS; if it ever disappears, this probe is what fails closed.
*/
function defaultProbeSeatbelt(seatbeltExec, timeoutMs) {
	return spawnSync(seatbeltExec, [
		...seatbeltProfileArgs({
			mode: "read-only",
			workspaceRoot: "/"
		}),
		"--",
		"true"
	], {
		timeout: timeoutMs,
		stdio: "ignore"
	}).status === 0;
}
/**
* Functional windows-acl probe: run the runner in read-only mode (zero grants,
* no ACL mutation) around `cmd /c exit 0` — exit 0 means the runner created
* the restricted token and spawned the child under it. The win32 chain is a
* sole candidate, so the product never probes; the probe exists for override
* chains and mirrors the other rungs' shape.
*/
function defaultProbeWindowsAcl(runnerInvocation, timeoutMs) {
	const program = runnerInvocation[0];
	if (program === void 0) return false;
	return spawnSync(program, [
		...runnerInvocation.slice(1),
		"--workspace",
		tmpdir(),
		"--temp",
		tmpdir(),
		"--mode",
		"read-only",
		"--",
		"cmd",
		"/c",
		"exit",
		"0"
	], {
		timeout: timeoutMs,
		stdio: "ignore"
	}).status === 0;
}
/**
* The runner chain per platform — selection is BY PLATFORM first, probes
* second: a platform's chain is probed in preference order only when it has
* MORE than one candidate (probing arbitrates; it does not re-validate a
* choice that has no alternative). A platform with no chain fails closed at
* `confine()`. Linux prefers `bwrap` (its mount profile is closest to the
* mode vocabulary) over the Landlock launcher; darwin has exactly one
* candidate, selected without any probe.
*/
const PLATFORM_CHAINS = {
	linux: ["bwrap", "landlock"],
	darwin: ["seatbelt"],
	win32: ["windows-acl"]
};
/**
* Enforcement completeness a rung claims when selected WITHOUT a probe (a
* chain of one). `bwrap` and Seatbelt govern every promised file effect by
* construction, so the claim is a profile fact; `landlock` is listed for the
* table's totality but is unreachable without a probe (the Linux chain has
* two rungs, so it is only ever selected through its probe, whose report is
* what distinguishes full from per-ABI-partial — and the launcher additionally
* self-reports partial enforcement on stderr at every confined run).
*/
const STATIC_ENFORCEMENT = {
	bwrap: "full",
	landlock: "full",
	seatbelt: "full",
	"windows-acl": "partial"
};
/**
* A probe bound must be a positive finite number: Node treats
* `spawnSync({ timeout: 0 })` as NO timeout, so an unvalidated 0 would
* silently mean "unbounded" — the opposite of what the field promises.
*/
function assertPositiveFinite(name, value) {
	if (!Number.isFinite(value) || value <= 0) throw new Error(`sandbox-local: ${name} must be a positive finite number`);
}
/**
* The denial dialect each runner's kernel speaks — the case-insensitive stderr substrings a
* denied file effect produces under it, carried on every wrap (the seam's
* `ConfinedArgv.denialSignatures`).
*/
const DENIAL_SIGNATURES = {
	bwrap: ["read-only file system"],
	landlock: ["permission denied"],
	seatbelt: ["operation not permitted"],
	"windows-acl": [
		"access is denied",
		"access to the path",
		"permission denied"
	],
	runnerCommand: ["read-only file system", "permission denied"]
};
/**
* Runner-owned fatal diagnostics. Landlock has a versioned exit-125 plus
* fatal-line launcher-failure contract. Bubblewrap's current fatal paths exit
* 1 but its public contract does not reserve that status, while sandbox-exec
* publishes no launcher-failure status; those backends remain signature-only.
* The windows-acl runner prints `windows-acl-run: <detail>` on every
* runner-side failure and exits 127 — the rule is exit-gated on that status
* so a confined command that merely PRINTS the signature (or a runner
* cleanup failure reported on a non-zero child exit) is never misclassified
* as "the command did not run". Keep the Landlock tuple aligned with the
* assembled snapshot fixture at
* `packages/test-support/session-snapshot/tests/fixtures/partial-landlock-sandbox.ts`.
*/
const RUNNER_FAILURE_RULES = {
	bwrap: [{ fatalSignatures: ["bwrap: "] }],
	landlock: [{
		allowedExitCodes: [LAUNCHER_FAILURE_EXIT],
		fatalSignatures: [`${LAUNCHER_BIN}: `],
		informationalLines: [`${LAUNCHER_BIN}: partial enforcement (older Landlock ABI)`]
	}],
	seatbelt: [{ fatalSignatures: ["sandbox-exec: "] }],
	"windows-acl": [{
		allowedExitCodes: [127],
		fatalSignatures: ["windows-acl-run: "]
	}]
};
/**
* Local process-sandbox provider. Registers as `ctx.sandbox`. Caches the
* chain verdict and, on the windows-acl rung, the write grants
* ({@link AclWriteGrant}: the standing workspace-root grant per workspace
* and the revocable private-temp grant per live session/workspace pair, the
* latter revoked on provider dispose); the one-time probes spawn nothing
* else.
*/
var LocalSandboxProvider = class extends SandboxProvider {
	static Config = z.object({
		runnerCommand: z.array(z.string()).default([]),
		runnerFailureSignatures: z.array(z.string()).default([]),
		probeTimeoutMs: z.natural().default(5e3)
	});
	/** Test hook (mirrors the bash executors' `internals`). */
	internals = {};
	runnerCommand;
	configuredRunnerFailureSignatures;
	probeTimeoutMs;
	/** Cached chain verdict; undefined until the first confined wrap needs it. */
	selectedRunner;
	/**
	* Server-lifetime write grants (windows-acl rung): the STANDING
	* workspace-root grant per workspace (its ACE is the cross-session reuse
	* cache and outlives the provider — never revoked) and the REVOCABLE
	* private-temp grant per live session/workspace pair (revoked on provider
	* dispose).
	*/
	workspaceGrants = /* @__PURE__ */ new Map();
	tempCapabilities = /* @__PURE__ */ new Map();
	constructor(ctx, config) {
		super(ctx);
		const runner = config.runnerCommand;
		const runnerFailureSignatures = config.runnerFailureSignatures;
		if (runner.length === 0 && runnerFailureSignatures.length > 0) throw new Error("sandbox-local: runnerFailureSignatures requires runnerCommand");
		if (runner.length > 0 && runnerFailureSignatures.length === 0) throw new Error("sandbox-local: runnerCommand requires at least one runnerFailureSignatures entry");
		if (runnerFailureSignatures.some((signature) => signature.trim().length === 0 || /[\r\n]/u.test(signature))) throw new Error("sandbox-local: runnerFailureSignatures entries must be non-empty single-line strings");
		this.runnerCommand = runner.length > 0 ? runner : void 0;
		this.configuredRunnerFailureSignatures = runnerFailureSignatures;
		this.probeTimeoutMs = config.probeTimeoutMs;
		assertPositiveFinite("probeTimeoutMs", this.probeTimeoutMs);
		ctx.effect(() => () => {
			this.revokeAclGrants();
		});
	}
	/**
	* Wrap `argv` in the selected runner's invocation for `policy` — the configured
	* `runnerCommand` when present (the operator's assertion, no probe), else the platform
	* chain's runner speaking its own profile dialect.
	*
	* @param argv - the exact argv the caller is about to spawn.
	* @param policy - the file-effect policy this execution runs under.
	* @returns the wrapped argv plus the selected backend's enforcement completeness, denial
	*   signatures, and structured runner-failure rules; throws the fail-closed
	*   `SANDBOX_UNAVAILABLE` error when the platform has no usable runner.
	*/
	confine(argv, policy) {
		if (this.runnerCommand !== void 0) return {
			argv: [
				...this.runnerCommand,
				...bwrapProfileArgs(policy),
				"--",
				...argv
			],
			enforcement: "full",
			denialSignatures: DENIAL_SIGNATURES.runnerCommand,
			runnerFailureRules: [{ fatalSignatures: this.configuredRunnerFailureSignatures }]
		};
		const selected = this.selectRunner(policy.mode);
		return {
			argv: [
				...this.runnerArgv(selected.runner, policy),
				"--",
				...argv
			],
			enforcement: selected.enforcement,
			denialSignatures: DENIAL_SIGNATURES[selected.runner],
			runnerFailureRules: RUNNER_FAILURE_RULES[selected.runner]
		};
	}
	/** The selected rung's runner invocation (program + profile arguments) for one policy. */
	runnerArgv(runner, policy) {
		switch (runner) {
			case "bwrap": return ["bwrap", ...bwrapProfileArgs(policy)];
			case "landlock": return [this.landlockLauncher(), ...landlockProfileArgs(policy)];
			case "seatbelt": return [this.seatbeltExec(), ...seatbeltProfileArgs(policy)];
			case "windows-acl": return this.windowsAclRunnerArgv(policy);
			default: return assertNever(runner);
		}
	}
	/**
	* The windows-acl runner argv for one policy. With a calling session (the
	* policy's `sessionId`) under workspace-write, the grants are materialized
	* once per provider lifetime — the standing workspace-root grant per
	* workspace and a revocable, RANDOM private-temp capability per live
	* session/workspace pair. The runner receives `--write-sid` plus
	* `--temp-write-sid` and grants nothing itself. Agentless workspace-write
	* calls pass the ambient temp ROOT and no SID flags: the runner creates and
	* removes a random private child directory for that one invocation.
	* @param policy - the resolved per-call policy.
	* @returns the runner invocation.
	*/
	windowsAclRunnerArgv(policy) {
		const sessionId = policy.sessionId;
		if (sessionId === void 0 || policy.mode === "read-only") return [
			...this.windowsAclRunnerInvocation(),
			"--workspace",
			policy.workspaceRoot,
			"--temp",
			tmpdir(),
			"--mode",
			policy.mode
		];
		const temp = this.materializeAclGrant(sessionId, policy.workspaceRoot);
		return [
			...this.windowsAclRunnerInvocation(),
			"--workspace",
			policy.workspaceRoot,
			"--temp",
			temp.dir,
			"--mode",
			policy.mode,
			"--write-sid",
			workspaceWriteSid(policy.workspaceRoot),
			"--temp-write-sid",
			temp.writeSid
		];
	}
	/**
	* Materialize one workspace-write policy's ACEs once per provider
	* lifetime. The workspace SID and standing root grant are shared by the
	* workspace. The temp directory is random and carries a distinct SID, so
	* another session on the same workspace cannot use the shared workspace
	* SID to enter it. A fresh provider always chooses a new path; crash
	* residue therefore cannot collide with or authorize a resumed session.
	* Fail-closed: a half-materialized temp grant is revoked and its directory
	* removed before the error propagates.
	* @param sessionId - the policy's calling-session identity.
	* @param workspaceRoot - the resolved policy root.
	* @returns the pair's private temp directory and write capability.
	*/
	materializeAclGrant(sessionId, workspaceRoot) {
		assertTempRootOutsideWorkspace(workspaceRoot, tmpdir());
		const writeSid = workspaceWriteSid(workspaceRoot);
		if (!this.workspaceGrants.has(workspaceRoot)) {
			const grant = AclWriteGrant.create(writeSid);
			try {
				grant.add(workspaceRoot, true);
			} catch (error) {
				try {
					grant.dispose();
				} catch (cleanupError) {
					throw new AggregateError([error, cleanupError], "sandbox-local windows-acl workspace grant failed and its cleanup also failed");
				}
				throw error;
			}
			this.workspaceGrants.set(workspaceRoot, grant);
		}
		const key = JSON.stringify([String(sessionId), workspaceRoot]);
		const existing = this.tempCapabilities.get(key);
		if (existing !== void 0) return existing;
		const tempDir = mkdtempSync(join(tmpdir(), "dsh-"));
		const tempSid = tempWriteSid(tempDir);
		let grant;
		try {
			grant = AclWriteGrant.create(tempSid);
			grant.add(tempDir);
		} catch (error) {
			const cleanupFailures = [];
			if (grant !== void 0) try {
				grant.dispose();
			} catch (cleanupError) {
				cleanupFailures.push(cleanupError);
			}
			try {
				this.removeTempDir(tempDir);
			} catch (cleanupError) {
				cleanupFailures.push(cleanupError);
			}
			if (cleanupFailures.length > 0) throw new AggregateError([error, ...cleanupFailures], "sandbox-local windows-acl temp grant materialization failed and its cleanup also failed");
			throw error;
		}
		const capability = {
			dir: tempDir,
			writeSid: tempSid,
			grant
		};
		this.tempCapabilities.set(key, capability);
		return capability;
	}
	/**
	* Dispose every write grant (provider dispose): the revocable temp ACEs
	* are revoked, the private temp directories this provider created are
	* removed, and every SID allocation is freed; the standing workspace ACEs
	* stay (the reuse cache). Cleanup failures are reported, not thrown:
	* cordis teardown must not be aborted by grant cleanup. A crash skips all
	* of it, but a new provider never reuses the residue's random path or SID;
	* OS temp hygiene (or manual removal) eventually reclaims it.
	*/
	revokeAclGrants() {
		if (this.workspaceGrants.size === 0 && this.tempCapabilities.size === 0) return;
		const failures = [];
		for (const grant of [...this.workspaceGrants.values(), ...[...this.tempCapabilities.values()].map((capability) => capability.grant)]) try {
			grant.dispose();
		} catch (error) {
			failures.push(error);
		}
		for (const { dir } of this.tempCapabilities.values()) try {
			this.removeTempDir(dir);
		} catch (error) {
			failures.push(error);
		}
		this.workspaceGrants.clear();
		this.tempCapabilities.clear();
		if (failures.length > 0) {
			this.ctx.logger.warn(`sandbox-local: windows-acl grant cleanup completed with ${failures.length} failure(s)`);
			for (const error of failures) this.ctx.logger.warn(error);
		}
	}
	/** Remove one provider-owned private temp directory (injectable for cleanup tests). */
	removeTempDir(dir) {
		(this.internals.rmTempDir ?? ((path) => {
			rmSync(path, {
				recursive: true,
				force: true
			});
		}))(dir);
	}
	/**
	* Resolve which runner confines commands, once, for the provider's
	* lifetime: this platform's chain ({@link PLATFORM_CHAINS}), its sole
	* candidate selected directly, multiple candidates arbitrated by
	* functional probes in chain order. Fail closed when the platform has no
	* chain or no candidate passes — the command never runs.
	*/
	selectRunner(mode) {
		this.selectedRunner ??= this.chainVerdict();
		if (this.selectedRunner === "unavailable") throw new SandboxUnavailableError(mode);
		return this.selectedRunner;
	}
	/** Walk this platform's chain: sole candidate unprobed, several probed in order, none usable → unavailable. */
	chainVerdict() {
		const chain = this.internals.chain ?? PLATFORM_CHAINS[this.internals.platform ?? process.platform] ?? [];
		const [first, ...rest] = chain;
		if (first === void 0) return "unavailable";
		if (rest.length === 0) return {
			runner: first,
			enforcement: STATIC_ENFORCEMENT[first]
		};
		for (const runner of chain) {
			const enforcement = this.probeRunner(runner);
			if (enforcement !== "unusable") return {
				runner,
				enforcement
			};
		}
		return "unavailable";
	}
	/** One rung's functional probe (each at most once, via the chain walk). */
	probeRunner(runner) {
		switch (runner) {
			case "bwrap": return (this.internals.probeBwrap ?? (() => defaultProbeBwrap(this.probeTimeoutMs)))() ? "full" : "unusable";
			case "landlock": return (this.internals.probeLandlock ?? ((launcher) => probe(launcher, { timeoutMs: this.probeTimeoutMs })))(this.landlockLauncher());
			case "seatbelt": return (this.internals.probeSeatbelt ?? ((exec) => defaultProbeSeatbelt(exec, this.probeTimeoutMs)))(this.seatbeltExec()) ? "full" : "unusable";
			case "windows-acl": return (this.internals.probeWindowsAcl ?? (() => defaultProbeWindowsAcl(this.windowsAclRunnerInvocation(), this.probeTimeoutMs)))() ? "partial" : "unusable";
			default: return assertNever(runner);
		}
	}
	/** The Landlock launcher to probe and exec (test hook over the resolved one). */
	landlockLauncher() {
		return this.internals.landlockLauncher ?? launcherPath();
	}
	/** The `sandbox-exec` executable to probe and exec (test hook over the system one). */
	seatbeltExec() {
		return this.internals.seatbeltExec ?? "sandbox-exec";
	}
	/**
	* The windows-acl runner argv prefix: the built lib/runner.js entry when
	* present (production), else the package source through tsx (development).
	* The prefix stays `[node, runner, ...]` — a future native-exe runner keeps
	* the same argv contract and only swaps these entries.
	*/
	windowsAclRunnerInvocation() {
		const override = this.internals.windowsAclRunnerArgs;
		if (override !== void 0) return override;
		const builtEntry = this.internals.windowsAclRunnerEntry ?? fileURLToPath(import.meta.resolve("@deepseek-ai/dsh-sandbox-windows-acl/runner"));
		if (existsSync(builtEntry)) return [process.execPath, builtEntry];
		const sourceEntry = fileURLToPath(import.meta.resolve("@deepseek-ai/dsh-sandbox-windows-acl/src/runner.ts"));
		return [
			process.execPath,
			"--import",
			"tsx/esm",
			sourceEntry
		];
	}
};
//#endregion
export { LocalSandboxProvider, LocalSandboxProvider as default };

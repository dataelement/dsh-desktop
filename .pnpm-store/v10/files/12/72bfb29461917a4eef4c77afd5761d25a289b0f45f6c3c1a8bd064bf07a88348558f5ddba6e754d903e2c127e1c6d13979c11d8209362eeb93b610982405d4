import { C as bindManagedProcess, D as validateSubprocessSpec, E as spawnSubprocess, O as createProcessInspector, S as loadLinuxExecve, T as prepareManagedProcessBinding, _ as parseWindowsRunnerResult, c as runnerStdio, d as cleanupLinuxLaunchFiles, l as spawnRunnerInvocation, m as deserializeRunnerError, n as WINDOWS_RUNNER_SELECTION, o as runnerEnvironment, p as createLinuxLaunchFiles, s as runnerInvocationAvailable, u as targetEnvironment, w as childEnv, y as readLinuxStartupError } from "./runner-launch-COYGu0Dl.js";
import { closeSync, constants, existsSync, openSync } from "node:fs";
import { access, stat } from "node:fs/promises";
import { delimiter, extname, isAbsolute, resolve } from "node:path";
import * as nodePty from "node-pty";
import { SubprocessRuntime } from "@deepseek-ai/dsh-subprocess";
import { execFile, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { constants as constants$1, devNull } from "node:os";
import { setTimeout as setTimeout$1 } from "node:timers/promises";
import { loadWin32ProcessBindings, probeCurrentTokenJobSupport } from "@deepseek-ai/dsh-win32-process";
import { Buffer } from "node:buffer";
import { PassThrough } from "node:stream";
//#region lib/types/linux-scope.js
/** Linux user-systemd scope launch and managed-range ownership. */
const SYSTEMCTL_TIMEOUT_MS = 5e3;
const SCOPE_INITIAL_POLL_INTERVAL_MS = 50;
const MISSING_UNIT = /\bunit\b[^\r\n]*(?:could not be found|not found|not loaded)/iu;
function managerEnvironment() {
	const environment = childEnv({ LC_ALL: "C" });
	delete environment.SYSTEMD_LOG_TARGET;
	return environment;
}
function quietSystemdEnvironment() {
	return childEnv({
		LC_ALL: "C",
		SYSTEMD_LOG_TARGET: "null"
	});
}
function querySystemctl(command, args) {
	return new Promise((resolveResult) => {
		execFile(command, [...args], {
			encoding: "utf8",
			env: managerEnvironment(),
			timeout: SYSTEMCTL_TIMEOUT_MS
		}, (error, stdout, stderr) => {
			const code = error === null ? 0 : error.code;
			resolveResult({
				status: typeof code === "number" ? code : null,
				stdout,
				stderr,
				...error === null ? {} : { error }
			});
		});
	});
}
function unitStem(prefix) {
	return `${prefix}-${String(process.pid)}-${randomBytes(6).toString("hex")}`;
}
function sleepWithAbort(delayMs, signal) {
	return setTimeout$1(delayMs, void 0, { signal });
}
/**
* Confirm this exact runner entry and libc execve binding without a probe mode.
* @param internals - optional runner and libc-binding seams used by tests.
* @returns whether the bootstrap can enter the final target.
*/
function probeLinuxBootstrap(internals = {}) {
	try {
		(internals.loadLinuxExecve ?? loadLinuxExecve)();
		const invocation = internals.runnerInvocation ?? (internals.resolveRunnerInvocation ?? spawnRunnerInvocation)();
		return (internals.runnerAvailable ?? runnerInvocationAvailable)(invocation);
	} catch {
		return false;
	}
}
/**
* Confirm current literal-argv transient-scope support before selecting native launch.
* @param internals - optional systemd command seams used by tests.
* @returns whether the current user manager supports the required scope invocation.
*/
function probeLinuxScope(internals = {}) {
	const unitBase = unitStem("dsh-subprocess-probe");
	const result = (internals.spawnSync ?? spawnSync)(internals.systemdRun ?? "systemd-run", [
		"--user",
		"--scope",
		"--quiet",
		"--collect",
		"--expand-environment=no",
		`--unit=${unitBase}`,
		"--",
		internals.systemctl ?? "systemctl",
		"--user",
		"show",
		`${unitBase}.scope`,
		"--property=ActiveState",
		"--value"
	], {
		env: quietSystemdEnvironment(),
		stdio: "ignore",
		timeout: SYSTEMCTL_TIMEOUT_MS
	});
	return result.error === void 0 && result.status === 0;
}
/**
* Confirm that the current user manager remains reachable after a positive deep probe.
* @param internals - optional systemctl seam used by tests.
* @returns whether one lightweight manager query succeeds.
*/
function probeLinuxManager(internals = {}) {
	const result = (internals.spawnSync ?? spawnSync)(internals.systemctl ?? "systemctl", [
		"--user",
		"show",
		"--property=Version",
		"--value"
	], {
		env: managerEnvironment(),
		stdio: "ignore",
		timeout: SYSTEMCTL_TIMEOUT_MS
	});
	return result.error === void 0 && result.status === 0;
}
/**
* Re-check every Linux native prerequisite for one eligible spawn.
* @param internals - optional native capability seams used by tests.
* @returns whether the Linux native containment path is currently available.
*/
function probeLinuxNative(internals = {}) {
	return probeLinuxBootstrap(internals) && probeLinuxScope(internals);
}
var SystemdScopeOwner = class {
	unit;
	files;
	direct;
	systemctl;
	runSync;
	query;
	sleep;
	establishment = "pending";
	stopped = false;
	observation;
	killFailure;
	wakeGeneration = 0;
	wakeWaiter;
	constructor(unit, files, direct, systemctl, runSync, query, sleep) {
		this.unit = unit;
		this.files = files;
		this.direct = direct;
		this.systemctl = systemctl;
		this.runSync = runSync;
		this.query = query;
		this.sleep = sleep;
	}
	signal(signal) {
		if (this.stopped) return;
		this.observeRequestConsumption();
		const directFallbackRequired = this.establishment === "pending";
		if (directFallbackRequired && this.direct.running()) this.direct.signal(signal);
		const result = this.runSync(this.systemctl, [
			"--user",
			"kill",
			"--kill-whom=all",
			`--signal=${signal}`,
			this.unit
		], {
			encoding: "utf8",
			env: managerEnvironment(),
			timeout: SYSTEMCTL_TIMEOUT_MS
		});
		this.wakeObservation();
		if (result.error === void 0 && result.status === 0) {
			if (signal === "SIGKILL") this.killFailure = void 0;
			return;
		}
		if (!directFallbackRequired && this.direct.running()) this.direct.signal(signal);
		if (signal === "SIGKILL") {
			const output = `${result.stdout}\n${result.stderr}`;
			if (!MISSING_UNIT.test(output)) this.killFailure = result.error ?? /* @__PURE__ */ new Error(`systemctl could not signal ${this.unit}: ${output.trim() || `exit ${String(result.status)}`}`);
		}
	}
	terminateForHostExit() {
		if (this.stopped) return;
		try {
			if (this.direct.running()) this.direct.signal("SIGKILL");
		} catch {}
		try {
			this.runSync(this.systemctl, [
				"--user",
				"kill",
				"--kill-whom=all",
				"--signal=SIGKILL",
				this.unit
			], {
				env: managerEnvironment(),
				stdio: "ignore",
				timeout: SYSTEMCTL_TIMEOUT_MS
			});
		} catch {}
	}
	observeRequestConsumption() {
		if (this.establishment === "pending" && !existsSync(this.files.requestPath)) this.establishment = "established";
	}
	absentUnit() {
		this.observeRequestConsumption();
		if (this.establishment === "established") return false;
		if (!this.direct.running() && existsSync(this.files.requestPath)) return false;
		if (this.killFailure !== void 0) throw this.killFailure;
		return true;
	}
	parseUnitState(stdout) {
		const values = /* @__PURE__ */ new Map();
		for (const line of stdout.split(/\r?\n/u)) {
			if (line === "") continue;
			const separator = line.indexOf("=");
			if (separator <= 0) throw new Error(`systemctl returned malformed state for ${this.unit}: ${JSON.stringify(stdout.trim())}`);
			const name = line.slice(0, separator);
			if (values.has(name)) throw new Error(`systemctl returned duplicate ${name} for ${this.unit}`);
			values.set(name, line.slice(separator + 1));
		}
		const loadState = values.get("LoadState");
		const activeState = values.get("ActiveState");
		if (values.size !== 2 || loadState === void 0 || activeState === void 0) throw new Error(`systemctl returned incomplete state for ${this.unit}: ${JSON.stringify(stdout.trim())}`);
		return {
			loadState,
			activeState
		};
	}
	async rangeActive() {
		this.observeRequestConsumption();
		const result = await this.query(this.systemctl, [
			"--user",
			"show",
			this.unit,
			"--property=LoadState",
			"--property=ActiveState"
		]);
		const output = `${result.stdout}\n${result.stderr}`;
		if (result.status === 0) {
			const { loadState, activeState } = this.parseUnitState(result.stdout);
			if (loadState === "not-found" && activeState === "inactive") return this.absentUnit();
			if (loadState !== "loaded") throw new Error(`systemctl returned unknown state for ${this.unit}: ${JSON.stringify({
				loadState,
				activeState
			})}`);
			this.establishment = "established";
			if (activeState === "inactive" || activeState === "failed") return false;
			if (![
				"active",
				"activating",
				"reloading",
				"deactivating"
			].includes(activeState)) throw new Error(`systemctl returned unknown ActiveState for ${this.unit}: ${JSON.stringify(activeState)}`);
			if (this.killFailure !== void 0) throw this.killFailure;
			return true;
		}
		if (!MISSING_UNIT.test(output)) {
			if (result.error !== void 0) throw result.error;
			throw new Error(`systemctl could not read ${this.unit}: ${output.trim() || `exit ${String(result.status)}`}`);
		}
		return this.absentUnit();
	}
	wakeObservation() {
		this.wakeGeneration += 1;
		this.wakeWaiter?.resolve();
		this.wakeWaiter = void 0;
	}
	async waitForPoll(delayMs, generation) {
		if (generation !== this.wakeGeneration) return;
		const wake = Promise.withResolvers();
		const waiter = {
			generation,
			resolve: wake.resolve
		};
		const sleepController = new AbortController();
		this.wakeWaiter = waiter;
		try {
			await Promise.race([this.sleep(delayMs, sleepController.signal), wake.promise]);
		} finally {
			sleepController.abort();
			if (this.wakeWaiter === waiter) this.wakeWaiter = void 0;
		}
	}
	async waitForExit() {
		if (this.stopped) return;
		this.observation ??= (async () => {
			let pollIntervalMs = SCOPE_INITIAL_POLL_INTERVAL_MS;
			let generation = this.wakeGeneration;
			while (await this.rangeActive()) {
				await this.waitForPoll(pollIntervalMs, generation);
				generation = this.wakeGeneration;
				if (this.establishment === "established") pollIntervalMs = Math.min(pollIntervalMs * 2, SYSTEMCTL_TIMEOUT_MS);
			}
			this.stopped = true;
		})().catch((error) => {
			this.observation = void 0;
			throw error;
		});
		await this.observation;
	}
	cleanup() {
		cleanupLinuxLaunchFiles(this.files);
	}
};
function scopeArgs(unitBase, invocation, argv) {
	return [
		"--user",
		"--scope",
		"--quiet",
		"--collect",
		"--expand-environment=no",
		`--unit=${unitBase}`,
		"--",
		...invocation,
		"--",
		...argv
	];
}
function directOutcome(child, files) {
	return new Promise((resolveOutcome, rejectOutcome) => {
		let settled = false;
		child.once("error", (error) => {
			if (settled) return;
			settled = true;
			rejectOutcome(error);
		});
		child.once("exit", (exitCode, signal) => {
			if (settled) return;
			settled = true;
			try {
				const startup = readLinuxStartupError(files.startupErrorPath);
				if (startup !== void 0) {
					rejectOutcome(deserializeRunnerError(startup.error));
					return;
				}
				if (existsSync(files.requestPath)) {
					rejectOutcome(/* @__PURE__ */ new Error("subprocess scope exited before its bootstrap consumed the launch request"));
					return;
				}
				resolveOutcome({
					exitCode,
					signal
				});
			} catch (error) {
				rejectOutcome(error instanceof Error ? error : new Error(String(error)));
			}
		});
	});
}
function signalChildGroup(child, signal) {
	try {
		process.kill(-child.pid, signal);
	} catch {
		try {
			child.kill(signal);
		} catch {}
	}
}
/**
* Prepare one Linux PTY scope using the same launch request and bootstrap core.
* @param spec - terminal target request.
* @param targetEnv - validated complete target environment.
* @param internals - optional runner and systemd seams used by tests.
* @returns invocation facts and ownership callbacks for node-pty.
*/
function prepareLinuxTerminalScope(spec, targetEnv, internals = {}) {
	const invocation = internals.runnerInvocation ?? spawnRunnerInvocation();
	const files = createLinuxLaunchFiles({
		cwd: spec.cwd,
		env: targetEnv
	});
	const unitBase = unitStem("dsh-terminal");
	return {
		command: internals.systemdRun ?? "systemd-run",
		args: scopeArgs(unitBase, invocation, spec.argv),
		cwd: process.cwd(),
		env: runnerEnvironment(files.requestPath, invocation),
		bindOwner: (direct) => new SystemdScopeOwner(`${unitBase}.scope`, files, direct, internals.systemctl ?? "systemctl", internals.spawnSync ?? spawnSync, internals.systemctlQuery ?? querySystemctl, internals.sleep ?? sleepWithAbort),
		resolveOutcome: (outcome) => {
			const startup = readLinuxStartupError(files.startupErrorPath);
			if (startup !== void 0) throw deserializeRunnerError(startup.error);
			if (existsSync(files.requestPath)) throw new Error("terminal scope exited before its bootstrap consumed the launch request");
			return outcome;
		},
		cleanup: () => {
			cleanupLinuxLaunchFiles(files);
		}
	};
}
/**
* Launch one ordinary target inside a transient user scope.
* @param spec - ordinary target request.
* @param targetEnv - validated complete target environment.
* @param internals - optional runner and systemd seams used by tests.
* @returns direct streams, result, and managed-scope owner.
*/
function launchLinuxScope(spec, targetEnv, internals = {}) {
	const invocation = internals.runnerInvocation ?? spawnRunnerInvocation();
	const files = createLinuxLaunchFiles({
		cwd: spec.cwd,
		env: targetEnv
	});
	const unitBase = unitStem("dsh-subprocess");
	let child;
	try {
		child = (internals.spawn ?? spawn)(internals.systemdRun ?? "systemd-run", scopeArgs(unitBase, invocation, spec.argv), {
			cwd: process.cwd(),
			env: runnerEnvironment(files.requestPath, invocation),
			stdio: runnerStdio(spec, false),
			detached: true
		});
	} catch (error) {
		cleanupLinuxLaunchFiles(files);
		throw error;
	}
	const owner = new SystemdScopeOwner(`${unitBase}.scope`, files, {
		running: () => child.pid !== void 0 && child.exitCode === null && child.signalCode === null,
		signal: (signal) => {
			signalChildGroup(child, signal);
		}
	}, internals.systemctl ?? "systemctl", internals.spawnSync ?? spawnSync, internals.systemctlQuery ?? querySystemctl, internals.sleep ?? sleepWithAbort);
	return {
		stdin: child.stdin,
		stdout: child.stdout,
		stderr: child.stderr,
		direct: directOutcome(child, files),
		owner
	};
}
//#endregion
//#region lib/types/windows-job.js
/** Windows parent-side launch and ownership for the private Job runner. */
function isWindowsStartCancellationError(error) {
	return error.name === "Error" && error.message === "subprocess target start was cancelled" && error.code === void 0 && error.syscall === void 0 && error.path === void 0;
}
/**
* Re-check the runner entry, bindings, and current Job capability for every spawn.
* @param internals - optional runner and Win32 capability seams used by tests.
* @returns whether the Windows native containment path is currently available.
*/
function probeWindowsJob(internals = {}) {
	try {
		const invocation = internals.runnerInvocation ?? (internals.resolveRunnerInvocation ?? spawnRunnerInvocation)();
		if (!(internals.runnerAvailable ?? runnerInvocationAvailable)(invocation)) return false;
		const api = (internals.loadWin32ProcessBindings ?? loadWin32ProcessBindings)();
		(internals.probeCurrentTokenJobSupport ?? probeCurrentTokenJobSupport)(api);
		return true;
	} catch {
		return false;
	}
}
var WindowsJobOwner = class {
	runner;
	exited;
	directResultType;
	failInfrastructure;
	cancellationReason;
	cancellationReasonSet = false;
	terminationSent = false;
	constructor(runner, exited, directResultType, failInfrastructure) {
		this.runner = runner;
		this.exited = exited;
		this.directResultType = directResultType;
		this.failInfrastructure = failInfrastructure;
		this.exited.catch(() => {});
	}
	signal(_signal, cancellationReason) {
		if (!this.cancellationReasonSet) {
			this.cancellationReason = cancellationReason;
			this.cancellationReasonSet = true;
		}
		if (this.terminationSent || !this.runner.connected) return;
		this.terminationSent = true;
		try {
			this.runner.send?.({ type: "terminate" }, (error) => {
				if (error === null || this.directResultType() !== void 0) return;
				this.failInfrastructure(error);
				this.terminateForHostExit();
			});
		} catch (error) {
			this.failInfrastructure(error);
			this.terminateForHostExit();
		}
	}
	mapStartFailure(failure, serialized) {
		return this.cancellationReasonSet && isWindowsStartCancellationError(serialized) ? this.cancellationReason : failure;
	}
	async waitForExit() {
		await this.exited;
	}
	terminateForHostExit() {
		try {
			this.runner.kill("SIGKILL");
		} catch {}
	}
};
/**
* Launch one target through a runner that uniquely owns its Job handle.
* @param spec - ordinary target request.
* @param targetEnv - validated complete target environment.
* @param internals - optional runner launch seams used by tests.
* @returns direct streams, result, and runner-owned managed range.
*/
function launchWindowsJob(spec, targetEnv, internals = {}) {
	const invocation = internals.runnerInvocation ?? spawnRunnerInvocation();
	const [command, ...prefix] = invocation;
	const ignoredStdinFd = spec.stdio.stdin === "ignore" ? openSync(devNull, "r") : void 0;
	let child;
	try {
		child = (internals.spawn ?? spawn)(command, [
			...prefix,
			"--",
			...spec.argv
		], {
			cwd: process.cwd(),
			env: runnerEnvironment(WINDOWS_RUNNER_SELECTION, invocation),
			stdio: runnerStdio(spec, true, ignoredStdinFd ?? "pipe")
		});
	} finally {
		if (ignoredStdinFd !== void 0) closeSync(ignoredStdinFd);
	}
	const targetStdin = child.stdio[4];
	const direct = Promise.withResolvers();
	const rangeExit = Promise.withResolvers();
	let directResultType;
	let runnerSpawned = false;
	const failInfrastructure = (error) => {
		direct.reject(error);
		rangeExit.reject(error);
	};
	const owner = new WindowsJobOwner(child, rangeExit.promise, () => directResultType, failInfrastructure);
	child.on("message", (value) => {
		if (directResultType !== void 0) {
			failInfrastructure(/* @__PURE__ */ new Error("subprocess-local: Windows runner emitted more than one direct result"));
			owner.terminateForHostExit();
			return;
		}
		let result;
		try {
			result = parseWindowsRunnerResult(value);
		} catch (error) {
			failInfrastructure(error);
			owner.terminateForHostExit();
			return;
		}
		directResultType = result.type;
		if (result.type === "target-exit") direct.resolve({
			exitCode: result.exitCode,
			signal: null
		});
		else direct.reject(owner.mapStartFailure(deserializeRunnerError(result.error), result.error));
	});
	child.once("spawn", () => {
		runnerSpawned = true;
		try {
			if (child.send === void 0) throw new Error("subprocess-local: Windows runner has no IPC channel");
			child.send({
				type: "start",
				cwd: spec.cwd,
				env: targetEnv
			}, (error) => {
				if (error === null) return;
				failInfrastructure(error);
				owner.terminateForHostExit();
			});
		} catch (error) {
			failInfrastructure(error);
			owner.terminateForHostExit();
		}
	});
	child.once("error", (error) => {
		if (!runnerSpawned) {
			direct.reject(error);
			rangeExit.resolve();
			return;
		}
		failInfrastructure(error);
	});
	child.once("close", (exitCode, signal) => {
		if (!runnerSpawned) return;
		if (exitCode === 0 && signal === null && directResultType !== void 0) {
			rangeExit.resolve();
			return;
		}
		const status = signal !== null ? `signal ${signal}` : exitCode === null ? "without an exit status" : `exit code ${String(exitCode)}`;
		failInfrastructure(/* @__PURE__ */ new Error(`subprocess-local: Windows Job runner exited with ${status} before proving its managed range empty`));
	});
	return {
		stdin: spec.stdio.stdin === "ignore" ? null : targetStdin,
		stdout: child.stdio[5],
		stderr: child.stdio[6],
		direct: direct.promise,
		owner
	};
}
//#endregion
//#region lib/types/terminal.js
/** Local node-pty terminal-process implementation for the subprocess seam. */
function delay(ms, signal) {
	return new Promise((resolve) => {
		const finish = () => {
			clearTimeout(timer);
			signal?.removeEventListener("abort", finish);
			resolve();
		};
		const timer = setTimeout(finish, ms);
		signal?.addEventListener("abort", finish, { once: true });
	});
}
async function raceWithDelay(operation, ms, timeout) {
	const controller = new AbortController();
	try {
		return await Promise.race([operation, delay(ms, controller.signal).then(() => timeout)]);
	} finally {
		controller.abort();
	}
}
function signalName(number) {
	if (number === void 0 || number === 0) return null;
	for (const [name, value] of Object.entries(constants$1.signals)) if (value === number) return name;
	return null;
}
/**
* A local terminal whose native managed range or fallback process-session
* ownership stays below the PTY backend.
* The seam's terminate() promise — no write, inspection, or signal in flight
* after settlement — holds here without operation tracking only because every
* handle call completes synchronously under the hood (node-pty write, ps-based
* inspection). A first genuinely asynchronous step in any handle call must add
* the tracking a remote provider needs.
*/
var LocalTerminalHandle = class {
	terminal;
	inspector;
	graceMs;
	platform;
	managedOwner;
	resolveManagedOutcome;
	pid;
	output = new PassThrough();
	done;
	outcome = Promise.withResolvers();
	dataDisposable;
	exitDisposable;
	cleanup;
	managedOwnerCleaned = false;
	exited = false;
	trackedDescendants = [];
	/** The spawned shell's start identity; scans stop adopting members once the root pid no longer carries it. */
	rootIdentity;
	/**
	* @param terminal - allocated node-pty process.
	* @param inspector - platform process/session operations.
	* @param graceMs - TERM-to-KILL and exit-wait grace.
	* @param platform - host platform; defaults to the running platform, injectable for deterministic tests.
	*/
	constructor(terminal, inspector, graceMs, platform = process.platform, managedOwner, resolveManagedOutcome) {
		this.terminal = terminal;
		this.inspector = inspector;
		this.graceMs = graceMs;
		this.platform = platform;
		this.managedOwner = managedOwner;
		this.resolveManagedOutcome = resolveManagedOutcome;
		this.pid = terminal.pid;
		this.rootIdentity = inspector.snapshot().tree(this.pid).find((member) => member.pid === this.pid);
		this.done = this.outcome.promise;
		this.dataDisposable = terminal.onData((data) => {
			this.output.write(Buffer.from(data, "utf8"));
		});
		this.exitDisposable = terminal.onExit(({ exitCode, signal: exitSignal }) => {
			if (this.exited) return;
			this.exited = true;
			this.output.end();
			const outcome = {
				exitCode: exitSignal === void 0 || exitSignal === 0 ? exitCode : null,
				signal: signalName(exitSignal)
			};
			try {
				this.outcome.resolve(this.resolveManagedOutcome?.(outcome) ?? outcome);
			} catch (error) {
				this.outcome.reject(error);
			}
		});
	}
	/** Whether node-pty has not yet published the top-level exit event. */
	get running() {
		return !this.exited;
	}
	async write(data) {
		if (this.exited) throw new Error("terminal process has exited");
		this.terminal.write(data);
	}
	async inspectForeground() {
		this.descendants(this.inspector.snapshot());
		const processGroupId = this.inspector.foregroundPgid(this.pid);
		if (processGroupId === void 0) return void 0;
		return {
			processGroupId,
			inputWaiting: this.inspector.isStdinWaiting(processGroupId, this.pid)
		};
	}
	async signalForeground(signal) {
		const foreground = await this.inspectForeground();
		if (foreground === void 0) throw new Error(`cannot resolve foreground process group for terminal ${this.pid}`);
		if (signal === "SIGKILL" && foreground.processGroupId === this.pid) throw new Error("refusing to SIGKILL the terminal shell; terminate the terminal session instead");
		if (this.platform === "win32") {
			if (signal === "SIGINT") {
				this.terminal.write("");
				return foreground.processGroupId;
			}
			if (signal === "SIGTSTP" || signal === "SIGHUP") throw new Error(`signal ${signal} is unsupported on Windows; only SIGINT, SIGTERM, and SIGKILL are available`);
		}
		this.inspector.signalGroup(foreground.processGroupId, signal);
		return foreground.processGroupId;
	}
	terminate() {
		if (this.cleanup !== void 0) return this.cleanup;
		const cleanup = this.closeOnce();
		this.cleanup = cleanup;
		cleanup.catch(() => {
			this.cleanup = void 0;
		});
		return cleanup;
	}
	/**
	* Force-terminate the observable session synchronously during Node's exit
	* event. This does not claim quiescence and does not replace terminate().
	*/
	terminateForHostExit() {
		this.forceStopDescendants();
		this.forceStopShell();
		this.forceStopDescendants();
		this.managedOwner?.terminateForHostExit();
	}
	forceStopShell() {
		if (this.exited) return;
		if (this.rootIdentity !== void 0) {
			try {
				this.inspector.signalProcess(this.rootIdentity, "SIGKILL");
			} catch (_rootExitedDuringHostExit) {}
			return;
		}
		try {
			this.terminal.kill("SIGKILL");
		} catch (_unidentifiedShellExitedDuringHostExit) {}
	}
	survivors(members, observed) {
		return members.filter((member) => observed.alive(member));
	}
	descendants(observed) {
		const tree = observed.tree(this.pid);
		const root = tree.find((member) => member.pid === this.pid);
		const rootVerified = this.rootIdentity !== void 0 && root !== void 0 && root.started === this.rootIdentity.started;
		this.trackedDescendants = this.survivors(this.unionMembers(this.trackedDescendants, ...rootVerified ? [tree, observed.session(this.pid)] : []).filter((member) => member.pid !== this.pid), observed);
		return this.trackedDescendants;
	}
	async waitForMembers(members) {
		if (members.length === 0) return [];
		const until = Date.now() + this.graceMs;
		let survivors = this.survivors(members, this.inspector.snapshot());
		while (survivors.length > 0 && Date.now() < until) {
			await delay(Math.min(25, Math.max(1, until - Date.now())));
			survivors = this.survivors(members, this.inspector.snapshot());
		}
		return survivors;
	}
	signalMembers(members, signal) {
		for (const member of members) try {
			this.inspector.signalProcess(member, signal);
		} catch (_alreadyExitedDuringSignal) {}
	}
	forceStopDescendants() {
		let members = this.trackedDescendants;
		try {
			members = this.descendants(this.inspector.snapshot());
		} catch (_processTableUnavailableDuringHostExit) {}
		this.signalMembers(members, "SIGKILL");
	}
	unionMembers(...groups) {
		const members = [];
		const seen = /* @__PURE__ */ new Set();
		for (const group of groups) for (const member of group) {
			const key = `${member.pid}:${member.started}`;
			if (seen.has(key)) continue;
			seen.add(key);
			members.push(member);
		}
		return members;
	}
	async stopDescendants() {
		const captured = this.descendants(this.inspector.snapshot());
		this.signalMembers(captured, "SIGTERM");
		const capturedSurvivors = await this.waitForMembers(captured);
		const members = this.unionMembers(capturedSurvivors, this.descendants(this.inspector.snapshot()));
		this.signalMembers(members, "SIGKILL");
		const survivors = await this.waitForMembers(members);
		const observed = this.inspector.snapshot();
		return this.survivors(this.unionMembers(survivors, this.descendants(observed)), observed);
	}
	async stopShell() {
		if (this.platform === "win32") {
			await this.stopShellWindows();
			return;
		}
		if (!this.exited) {
			try {
				this.terminal.kill("SIGTERM");
			} catch (_topLevelAlreadyExitedDuringTerm) {}
			await Promise.race([this.done.then(() => void 0), delay(this.graceMs)]);
		}
		if (!this.exited) {
			try {
				this.terminal.kill("SIGKILL");
			} catch (_topLevelAlreadyExitedDuringKill) {}
			await Promise.race([this.done.then(() => void 0), delay(this.graceMs)]);
		}
		if (!this.exited) throw new Error(`terminal cleanup failed; surviving pid: ${this.pid}`);
	}
	async stopShellWindows() {
		const shellGone = () => this.exited || this.rootIdentity !== void 0 && !this.inspector.isAlive(this.rootIdentity);
		if (!shellGone() && this.rootIdentity !== void 0) {
			this.inspector.signalProcess(this.rootIdentity, "SIGTERM");
			await this.waitForWindowsShellExit();
		}
		if (!shellGone() && this.rootIdentity === void 0) {
			try {
				this.terminal.kill();
			} catch (_topLevelAlreadyExitedDuringKill) {}
			await Promise.race([this.done.then(() => void 0), delay(this.graceMs)]);
		}
		if (!shellGone() && this.rootIdentity !== void 0) {
			this.inspector.signalProcess(this.rootIdentity, "SIGKILL");
			await this.waitForWindowsShellExit();
		}
		if (!shellGone()) throw new Error(`terminal cleanup failed; surviving pid: ${this.pid}`);
	}
	async waitForWindowsShellExit() {
		const until = Date.now() + this.graceMs;
		while (!this.exited && Date.now() < until) {
			if (this.rootIdentity !== void 0 && !this.inspector.isAlive(this.rootIdentity)) return;
			await delay(Math.min(25, Math.max(1, until - Date.now())));
		}
	}
	async closeOnce() {
		if (this.managedOwner !== void 0) {
			try {
				await this.closeManagedRange(this.managedOwner);
				this.dataDisposable.dispose();
				this.exitDisposable.dispose();
			} finally {
				this.done.finally(() => {
					this.cleanupManagedOwner(this.managedOwner);
				}).catch(() => {});
			}
			return;
		}
		let survivors = await this.stopDescendants();
		if (survivors.length > 0) throw new Error(`terminal cleanup failed; surviving pids: ${survivors.map((member) => member.pid).join(", ")}`);
		await this.stopShell();
		survivors = await this.stopDescendants();
		if (survivors.length > 0) throw new Error(`terminal cleanup failed; surviving pids: ${survivors.map((member) => member.pid).join(", ")}`);
		this.settleExitIfGone();
		this.dataDisposable.dispose();
		this.exitDisposable.dispose();
	}
	cleanupManagedOwner(owner) {
		if (this.managedOwnerCleaned) return;
		this.managedOwnerCleaned = true;
		owner.cleanup?.();
	}
	async closeManagedRange(owner) {
		owner.signal("SIGTERM");
		const observation = owner.waitForExit();
		const first = await raceWithDelay(observation.then(() => ({ kind: "stopped" }), (error) => ({
			kind: "failed",
			error
		})), this.graceMs, { kind: "timeout" });
		if (first.kind !== "stopped") {
			owner.signal("SIGKILL");
			if (first.kind === "failed") {
				try {
					await owner.waitForExit();
				} catch (finalError) {
					throw new AggregateError([first.error, finalError], "terminal managed-range cleanup failed");
				}
				throw first.error;
			}
			await observation;
		}
		if (!this.exited) await raceWithDelay(this.done.then(() => void 0), this.graceMs, void 0);
		if (!this.exited) throw new Error(`terminal cleanup failed; surviving pid: ${this.pid}`);
	}
	settleExitIfGone() {
		if (this.platform !== "win32") return;
		if (this.exited) return;
		/* v8 ignore next -- stopShellWindows() verified the shell is gone or threw;
		the identity re-check is a defensive fence for a future caller. */
		if (this.rootIdentity !== void 0 && this.inspector.isAlive(this.rootIdentity)) return;
		this.exited = true;
		this.output.end();
		this.outcome.resolve({
			exitCode: null,
			signal: null
		});
	}
};
//#endregion
//#region lib/types/index.js
/**
* Local Service Provider for the subprocess capability seam. Each spawn owns a
* platform-selected managed range with the spec's per-stream stdio dispositions.
* Normal disposal terminates and joins live ranges; Node's synchronous exit
* phase force-stops any ranges the service still owns. It has no config: every
* disposition and limit arrives on the spec, so deployment-varying choices
* stay with the caller's config (the bash executor's, the LSP host's, …).
* @module @deepseek-ai/dsh-subprocess-local
*/
/**
* Local subprocess service: platform-selected managed ranges, Node-shaped stdio
* dispositions (raw pipes, inherit, bounded tail-keep collection with spill
* files), credential-scrubbed environment, and provider-owned range signalling.
* POSIX paths stage TERM before KILL; Windows paths terminate immediately.
* JavaScript-observable host exit also performs synchronous final termination.
*/
var LocalSubprocessRuntime = class extends SubprocessRuntime {
	/** Live handles retained for normal disposal and synchronous host-exit finalization. */
	live = /* @__PURE__ */ new Set();
	/** Live terminals retained through normal quiescence or host-exit finalization. */
	terminals = /* @__PURE__ */ new Set();
	/** Test hook: process, spill, and platform operations forwarded to spawnSubprocess. */
	internals = {};
	/** Provider-lifetime latch suppressing repeated weaker-containment warnings. */
	fallbackWarningIssued = false;
	/** Positive-only cache for the expensive Linux bootstrap and scope probe. */
	linuxDeepProbePassed = false;
	/** Test hook for platform process inspection; production resolves lazily on terminal spawn. */
	terminalInspector;
	constructor(ctx) {
		super(ctx);
		ctx.effect(() => {
			const onHostExit = () => {
				this.terminateForHostExit();
			};
			process.prependListener("exit", onHostExit);
			return async () => {
				await this.disposeManagedProcesses();
				process.off("exit", onHostExit);
			};
		}, "local subprocess teardown");
	}
	terminateForHostExit() {
		for (const handle of this.live) try {
			handle.terminateForHostExit();
		} catch (_ordinaryRangeTerminationFailed) {}
		for (const terminal of this.terminals) try {
			terminal.terminateForHostExit();
		} catch (_terminalTerminationFailed) {}
	}
	async disposeManagedProcesses() {
		const pending = [];
		for (const handle of this.live) {
			handle.terminate();
			pending.push(Promise.all([handle.done.catch(() => {}), handle.waitForExit()]).then(() => {
				this.live.delete(handle);
			}));
		}
		for (const terminal of this.terminals) pending.push(terminal.terminate().then(() => {
			this.terminals.delete(terminal);
		}));
		const outcomes = await Promise.allSettled(pending);
		const failures = [];
		for (const outcome of outcomes) if (outcome.status === "rejected") failures.push(outcome.reason);
		if (failures.length > 0) this.terminateForHostExit();
		if (failures.length === 1) throw failures[0];
		if (failures.length > 1) throw new AggregateError(failures, "local subprocess teardown failed");
	}
	async resolveExecutable(command, env, signal) {
		if (command.length === 0) throw new Error("subprocess-local: executable must be non-empty");
		signal?.throwIfAborted();
		const environment = childEnv(env);
		const absolute = isAbsolute(command);
		if (!absolute && (command.includes("/") || process.platform === "win32" && command.includes("\\"))) throw new Error(`subprocess-local: command ${JSON.stringify(command)} is a relative path; use an absolute path or a bare PATH name`);
		const candidates = absolute ? [command] : this.executableCandidates(command, environment);
		for (const candidate of candidates) {
			signal?.throwIfAborted();
			try {
				if (!(await stat(candidate)).isFile()) continue;
				await access(candidate, constants.X_OK);
				signal?.throwIfAborted();
				return candidate;
			} catch {}
		}
		signal?.throwIfAborted();
		throw new Error(absolute ? `subprocess-local: command ${JSON.stringify(command)} is not an executable file` : `subprocess-local: command ${JSON.stringify(command)} was not found on PATH`);
	}
	executableCandidates(command, env) {
		const path = environmentValue(env, "PATH") ?? "";
		const extensions = process.platform === "win32" && extname(command) === "" ? (environmentValue(env, "PATHEXT") ?? ".COM;.EXE;.BAT;.CMD").split(";") : [""];
		return path.split(delimiter).flatMap((directory) => extensions.map((extension) => resolve(process.cwd(), directory, command + extension)));
	}
	spawn(spec) {
		validateSubprocessSpec(spec);
		const env = targetEnvironment(spec);
		const containmentMode = this.selectContainmentMode("ordinary");
		let handle;
		if (containmentMode === "fallback") handle = spawnSubprocess(spec, this.internals);
		else {
			const binding = prepareManagedProcessBinding(this.internals);
			handle = bindManagedProcess(spec, containmentMode === "linux-scope" ? launchLinuxScope(spec, env) : launchWindowsJob(spec, env), binding);
		}
		this.live.add(handle);
		const release = () => handle.waitForExit().then(() => {
			this.live.delete(handle);
		});
		handle.done.then(release, release).catch(() => {});
		return handle;
	}
	selectContainmentMode(kind) {
		const platform = this.internals.platform ?? process.platform;
		let fallbackReason;
		if (platform === "linux") {
			const available = this.linuxDeepProbePassed ? probeLinuxManager() : probeLinuxNative();
			if (available) this.linuxDeepProbePassed = true;
			if (available) return "linux-scope";
			fallbackReason = "the current user-systemd scope or private bootstrap is unavailable";
		}
		if (kind === "ordinary" && platform === "win32") {
			if (probeWindowsJob()) return "windows-job";
		}
		this.warnFallback(platform, kind, fallbackReason);
		return "fallback";
	}
	warnFallback(platform, kind, selectedReason) {
		if (this.fallbackWarningIssued) return;
		this.fallbackWarningIssued = true;
		const reason = selectedReason ?? (platform === "darwin" ? "macOS has no supported persistent process-range owner" : platform === "win32" ? kind === "terminal" ? "Windows ConPTY remains outside Job containment" : "the Win32 Job runner is unavailable" : `platform ${platform} has no native managed range`);
		this.ctx.logger.warn(`subprocess-local is using weaker process-tree containment because ${reason}; descendants that escape the process group or direct-parent tree are not guaranteed to terminate or delay waitForExit()`);
	}
	async spawnTerminal(spec) {
		const file = spec.argv[0];
		if (file === void 0 || file.length === 0) throw new Error("subprocess-local: terminal argv must contain a program");
		spec.signal?.throwIfAborted();
		const env = targetEnvironment(spec);
		const options = {
			name: "dumb",
			rows: spec.rows,
			cols: spec.cols,
			cwd: spec.cwd,
			env
		};
		const inspector = this.terminalInspector ?? createProcessInspector();
		const scope = this.selectContainmentMode("terminal") === "linux-scope" ? prepareLinuxTerminalScope(spec, {
			...env,
			PWD: spec.cwd,
			TERM: "dumb"
		}) : void 0;
		if (scope !== void 0) {
			options.cwd = scope.cwd;
			options.env = scope.env;
		}
		let terminal;
		try {
			terminal = nodePty.spawn(scope?.command ?? file, scope?.args ?? [...spec.argv.slice(1)], options);
		} catch (error) {
			scope?.cleanup();
			throw error;
		}
		let handle;
		const owner = scope?.bindOwner({
			running: () => handle?.running ?? true,
			signal: (signal) => {
				try {
					terminal.kill(signal);
				} catch {}
			}
		});
		handle = new LocalTerminalHandle(terminal, inspector, spec.graceMs, this.internals.platform ?? process.platform, owner, scope?.resolveOutcome);
		this.terminals.add(handle);
		const release = async () => {
			await handle.terminate();
			this.terminals.delete(handle);
		};
		handle.done.then(release, release).catch(() => {});
		return handle;
	}
};
/** Read a Windows environment key using the platform's case-insensitive semantics. */
function environmentValue(env, name) {
	const exact = env[name];
	if (exact !== void 0 || process.platform !== "win32") return exact;
	const normalized = name.toUpperCase();
	return Object.entries(env).find(([key]) => key.toUpperCase() === normalized)?.[1];
}
//#endregion
export { LocalSubprocessRuntime, LocalSubprocessRuntime as default };

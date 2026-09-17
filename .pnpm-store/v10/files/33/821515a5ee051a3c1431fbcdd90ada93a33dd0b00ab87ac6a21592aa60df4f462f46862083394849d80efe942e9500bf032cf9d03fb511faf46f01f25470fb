import { S as loadLinuxExecve, a as resolveWindowsExecutable, b as serializeRunnerError, f as consumeLinuxLaunchRequest, g as linuxLaunchFilesFromLocator, h as isWindowsTerminateRequest, i as parseRunnerTargetArgv, r as consumeRunnerSelection, t as SUBPROCESS_RUNNER_ENV, v as parseWindowsStartRequest, x as writeLinuxStartupError } from "./runner-launch-COYGu0Dl.js";
import { closeSync } from "node:fs";
import { Win32Error, closeHandleChecked, isJobEmpty, loadWin32ProcessBindings, pollProcessExit, spawnCurrentTokenJobProcess, terminateJob } from "@deepseek-ai/dsh-win32-process";
//#region lib/types/spawn-runner.js
/** One-shot Linux exec bootstrap and Windows Job-owning subprocess runner. */
const defaultInternals = {
	/* v8 ignore next -- source/built/packaged subprocess smoke executes this only in a replaceable child process. */
	execve: (file, argv, env) => loadLinuxExecve()(file, argv, env),
	loadWin32ProcessBindings,
	spawnCurrentTokenJobProcess,
	closeFileDescriptor: closeSync,
	resolveWindowsExecutable,
	pollProcessExit,
	isJobEmpty,
	terminateJob,
	closeHandleChecked
};
const NODE_SPAWN_DETAIL_CODES = new Set(["EACCES", "ENOENT"]);
const WINDOWS_SPAWN_ERROR_CODES = new Map([
	[2, "ENOENT"],
	[3, "ENOENT"],
	[267, "ENOENT"],
	[5, "EPERM"],
	[193, "EFTYPE"],
	[740, "EACCES"]
]);
function nodeSpawnError(syscall, code, path) {
	return {
		name: "Error",
		message: `${syscall} ${code}`,
		code,
		syscall,
		...path === void 0 ? {} : { path }
	};
}
function asSpawnError(error, program) {
	const serialized = serializeRunnerError(error);
	if (!(error instanceof Win32Error)) return serialized.code === void 0 ? serialized : nodeSpawnError(`spawn ${program}`, serialized.code, program);
	const code = WINDOWS_SPAWN_ERROR_CODES.get(error.win32Code) ?? "UNKNOWN";
	if (NODE_SPAWN_DETAIL_CODES.has(code)) return nodeSpawnError(`spawn ${program}`, code, program);
	return nodeSpawnError("spawn", code);
}
function windowsPathNotFoundError(program) {
	return nodeSpawnError(`spawn ${program}`, "ENOENT", program);
}
function windowsStartCancelledError() {
	return {
		name: "Error",
		message: "subprocess target start was cancelled"
	};
}
function linuxPathNotFoundError(program) {
	return Object.assign(/* @__PURE__ */ new Error(`spawn ${program} ENOENT`), {
		code: "ENOENT",
		errno: -2,
		syscall: `spawn ${program}`,
		path: program,
		spawnargs: []
	});
}
function execLinuxFile(file, argv, env, internals) {
	try {
		return internals.execve(file, argv, env);
	} catch (error) {
		if (error.code !== "ENOEXEC") throw error;
		return internals.execve("/bin/sh", [
			"/bin/sh",
			file,
			...argv.slice(1)
		], env);
	}
}
function execLinuxTarget(request, argv, internals) {
	const program = argv[0];
	if (program.includes("/")) return execLinuxFile(program, argv, request.env, internals);
	const path = request.env.PATH ?? "/usr/bin:/bin";
	let permissionFailure;
	for (const directory of path.split(":")) {
		const root = directory.startsWith("/") ? directory : `${request.cwd}${request.cwd.endsWith("/") ? "" : "/"}${directory}`;
		const candidate = `${root}${root.endsWith("/") ? "" : "/"}${program}`;
		try {
			return execLinuxFile(candidate, argv, request.env, internals);
		} catch (error) {
			const code = error.code;
			if (code === "EACCES") {
				permissionFailure ??= error;
				continue;
			}
			if (code === "ENOENT" || code === "ENOTDIR") continue;
			throw error;
		}
	}
	throw permissionFailure ?? linuxPathNotFoundError(program);
}
function runLinux(locator, argv, host, internals) {
	const files = linuxLaunchFilesFromLocator(locator);
	let request;
	try {
		request = consumeLinuxLaunchRequest(files.requestPath);
	} catch (error) {
		writeLinuxStartupError(files, {
			type: "error",
			error: serializeRunnerError(error)
		});
		host.exitCode = 127;
		return;
	}
	try {
		host.chdir(request.cwd);
		execLinuxTarget({
			...request,
			cwd: host.cwd()
		}, argv, internals);
	} catch (error) {
		writeLinuxStartupError(files, {
			type: "error",
			error: asSpawnError(error, argv[0])
		});
		host.exitCode = 127;
	}
}
function sendMessage(host, result) {
	return new Promise((resolve, reject) => {
		if (!host.connected || host.send === void 0) {
			reject(/* @__PURE__ */ new Error("subprocess runner IPC is not connected"));
			return;
		}
		try {
			host.send(result, (error) => {
				if (error === null) resolve();
				else reject(error);
			});
		} catch (error) {
			reject(error instanceof Error ? error : new Error(String(error)));
		}
	});
}
var WindowsJobRunner = class {
	argv;
	host;
	internals;
	api;
	processHandle;
	jobHandle;
	pollTimer;
	startSeen = false;
	terminateRequested = false;
	resultStarted = false;
	resultDelivered = false;
	finished = false;
	completion = Promise.withResolvers();
	constructor(argv, host, internals) {
		this.argv = argv;
		this.host = host;
		this.internals = internals;
	}
	run() {
		if (!this.host.connected || this.host.send === void 0) {
			this.finish(127);
			return this.completion.promise;
		}
		this.host.on("message", this.onMessage);
		this.host.once("disconnect", this.onDisconnect);
		return this.completion.promise;
	}
	onMessage = (value) => {
		if (this.finished) return;
		if (isWindowsTerminateRequest(value)) {
			this.requestTermination();
			return;
		}
		if (this.startSeen) {
			this.runnerFailure(/* @__PURE__ */ new Error("subprocess runner received more than one Windows start request"));
			return;
		}
		let request;
		try {
			request = parseWindowsStartRequest(value);
		} catch (error) {
			this.runnerFailure(error);
			return;
		}
		this.startSeen = true;
		this.start(request);
	};
	onDisconnect = () => {
		if (this.finished) return;
		this.releaseOwnedJob();
		this.finish(127, false);
	};
	async start(request) {
		if (this.terminateRequested) {
			await this.publishTerminalResult({
				type: "error",
				error: windowsStartCancelledError()
			}, 0);
			return;
		}
		await new Promise((resolveImmediate) => {
			setImmediate(resolveImmediate);
		});
		if (this.finished) return;
		if (this.terminateRequested) {
			await this.publishTerminalResult({
				type: "error",
				error: windowsStartCancelledError()
			}, 0);
			return;
		}
		try {
			const [command, ...args] = this.argv;
			const applicationName = this.internals.resolveWindowsExecutable(command, request.cwd, request.env, void 0, { ...this.host.env });
			if (applicationName === void 0) {
				await this.publishTerminalResult({
					type: "error",
					error: windowsPathNotFoundError(command)
				}, 0);
				return;
			}
			this.api = this.internals.loadWin32ProcessBindings();
			const spawned = this.internals.spawnCurrentTokenJobProcess(this.api, {
				command,
				applicationName,
				args,
				cwd: request.cwd,
				env: request.env,
				stdio: {
					stdin: 4,
					stdout: 5,
					stderr: 6
				}
			});
			this.processHandle = spawned.process;
			this.jobHandle = spawned.job;
			for (const fileDescriptor of [
				4,
				5,
				6
			]) this.internals.closeFileDescriptor(fileDescriptor);
			this.pollTimer = setInterval(() => {
				this.poll();
			}, 10);
		} catch (error) {
			if (this.jobHandle === void 0 && error instanceof Win32Error && error.api === "CreateProcessW") {
				await this.publishTerminalResult({
					type: "error",
					error: asSpawnError(error, this.argv[0])
				}, 0);
				return;
			}
			await this.runnerFailure(error);
		}
	}
	requestTermination() {
		if (this.terminateRequested) return;
		this.terminateRequested = true;
		try {
			this.terminateOwnedJob();
		} catch (error) {
			this.runnerFailure(error);
		}
	}
	terminateOwnedJob() {
		const job = this.jobHandle;
		if (job === void 0) return;
		/* v8 ignore next -- a Job handle is assigned only after the bindings are loaded;
		* the guard above is the only reachable empty-owner state. */
		if (this.api === void 0) return;
		this.internals.terminateJob(this.api, job, 1);
	}
	poll() {
		if (this.finished) return;
		/* v8 ignore next -- poll is installed only after start() stores the bindings; retained as a defensive invariant guard. */
		if (this.api === void 0) return;
		try {
			if (this.processHandle !== void 0) {
				const exitCode = this.internals.pollProcessExit(this.api, this.processHandle);
				if (exitCode !== void 0) {
					this.internals.closeHandleChecked(this.api, this.processHandle, "ordinary direct process");
					this.processHandle = void 0;
					this.publishTerminalResult({
						type: "target-exit",
						exitCode
					});
				}
			}
			if (this.jobHandle !== void 0 && this.internals.isJobEmpty(this.api, this.jobHandle)) {
				this.internals.closeHandleChecked(this.api, this.jobHandle, "ordinary process Job");
				this.jobHandle = void 0;
				if (this.resultDelivered) this.finish(0);
			}
		} catch (error) {
			this.runnerFailure(error);
		}
	}
	async publishTerminalResult(result, exitCode) {
		/* v8 ignore next -- each state transition has a single result call site; the guard contains only re-entrant internal defects. */
		if (this.finished || this.resultStarted) return;
		this.resultStarted = true;
		try {
			await sendMessage(this.host, result);
			this.resultDelivered = true;
		} catch {
			this.releaseOwnedJob();
			this.finish(127, false);
			return;
		}
		if (exitCode !== void 0) {
			this.finish(exitCode);
			return;
		}
		if (this.jobHandle === void 0) this.finish(0);
	}
	async runnerFailure(error) {
		/* v8 ignore next -- callers stop/detach on finish; this guard contains only an already-queued internal callback. */
		if (this.finished) return;
		if (!this.resultStarted) {
			this.resultStarted = true;
			try {
				await sendMessage(this.host, {
					type: "error",
					error: serializeRunnerError(error)
				});
				this.resultDelivered = true;
			} catch {}
		}
		this.releaseOwnedJob();
		this.finish(127);
	}
	releaseOwnedJob() {
		if (this.pollTimer !== void 0) clearInterval(this.pollTimer);
		this.pollTimer = void 0;
		const api = this.api;
		if (api === void 0) return;
		if (this.jobHandle !== void 0) {
			try {
				this.internals.terminateJob(api, this.jobHandle, 1);
			} catch {}
			try {
				this.internals.closeHandleChecked(api, this.jobHandle, "ordinary process Job cleanup");
			} catch {}
			this.jobHandle = void 0;
		}
		if (this.processHandle !== void 0) {
			try {
				this.internals.closeHandleChecked(api, this.processHandle, "ordinary direct process cleanup");
			} catch {}
			this.processHandle = void 0;
		}
	}
	finish(exitCode, disconnect = true) {
		if (this.finished) return;
		this.finished = true;
		if (this.pollTimer !== void 0) clearInterval(this.pollTimer);
		this.pollTimer = void 0;
		this.host.off("message", this.onMessage);
		this.host.off("disconnect", this.onDisconnect);
		this.host.exitCode = exitCode;
		if (disconnect && this.host.connected) this.host.disconnect();
		this.completion.resolve();
	}
};
/**
* Execute the selected Linux bootstrap or Windows Job runner.
* @param selection - Windows sentinel or Linux launch-request locator.
* @param argv - private runner arguments beginning with the target delimiter.
* @param host - process transport and lifecycle host.
* @param internals - native and filesystem operations used by the runner.
*/
async function runSpawnRunner(selection, argv, host = process, internals = defaultInternals) {
	Reflect.deleteProperty(host.env, SUBPROCESS_RUNNER_ENV);
	const targetArgv = parseRunnerTargetArgv(argv);
	if (selection === "windows") {
		await new WindowsJobRunner(targetArgv, host, internals).run();
		return;
	}
	runLinux(selection, targetArgv, host, internals);
}
/**
* Best-effort reporting for failures before the selected runner established its owner.
* @param selection - Windows sentinel, Linux launch-request locator, or no selection.
* @param error - failure raised before normal runner settlement.
* @param host - process transport and lifecycle host.
*/
async function reportSpawnRunnerFailure(selection, error, host = process) {
	if (selection === "windows") {
		try {
			await sendMessage(host, {
				type: "error",
				error: serializeRunnerError(error)
			});
		} catch {}
		host.exitCode = 127;
		if (host.connected) host.disconnect();
		return;
	}
	if (selection !== void 0) try {
		writeLinuxStartupError(linuxLaunchFilesFromLocator(selection), {
			type: "error",
			error: serializeRunnerError(error)
		});
	} catch {}
	host.exitCode = 127;
}
//#endregion
//#region lib/types/bin.js
/** Thin executable/importable entry for the provider-private runner core. */
/**
* Run a selector already removed by a packaging bootstrap.
* @param selection - private runner selector or Linux launch-request locator.
*/
async function runSelectedSubprocessRunner(selection) {
	try {
		await runSpawnRunner(selection, process.argv.slice(2));
	} catch (error) {
		await reportSpawnRunnerFailure(selection, error);
	}
}
if (import.meta.main) {
	const selection = consumeRunnerSelection();
	if (selection === void 0) process.exitCode = 127;
	else runSelectedSubprocessRunner(selection);
}
//#endregion
export { runSelectedSubprocessRunner };

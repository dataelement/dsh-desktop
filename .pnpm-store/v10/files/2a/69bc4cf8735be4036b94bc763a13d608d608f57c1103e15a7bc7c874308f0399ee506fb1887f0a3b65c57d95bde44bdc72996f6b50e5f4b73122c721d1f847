import koffi from "koffi";
/** Win32 code reporting a caller-provided buffer is too small. */
const ERROR_INSUFFICIENT_BUFFER = 122;
/** Job limit that terminates every member when the final Job handle closes. */
const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 8192;
//#endregion
//#region lib/types/errors.js
/** Win32 call failure with the exact API name and error code. */
var Win32Error = class extends Error {
	/** Win32 function whose checked result failed. */
	api;
	/** Exact GetLastError value or direct Win32 API error code. */
	win32Code;
	constructor(api, win32Code, detail) {
		super(`${api} failed (Win32 ${win32Code})${detail === void 0 ? "" : `: ${detail}`}`);
		this.name = "Win32Error";
		this.api = api;
		this.win32Code = win32Code;
	}
};
//#endregion
//#region lib/types/ffi.js
/** Lazy Koffi bindings for generic Win32 process, stdio, and Job operations. */
const PVOID = koffi.pointer("void");
const PPVOID = koffi.pointer(PVOID);
/**
* Return whether a Koffi pointer represents NULL.
* @param value - pointer value returned by Koffi or a Win32 call.
* @returns true for null, undefined, or address zero.
*/
function isNullPtr(value) {
	return value === null || value === void 0 || value === 0n;
}
/** Koffi STARTUPINFOW layout. */
const STARTUPINFOW = koffi.struct("DSH_STARTUPINFOW", {
	cb: "uint32",
	lpReserved: "str16",
	lpDesktop: "str16",
	lpTitle: "str16",
	dwX: "uint32",
	dwY: "uint32",
	dwXSize: "uint32",
	dwYSize: "uint32",
	dwXCountChars: "uint32",
	dwYCountChars: "uint32",
	dwFillAttribute: "uint32",
	dwFlags: "uint32",
	wShowWindow: "uint16",
	cbReserved2: "uint16",
	lpReserved2: koffi.pointer("uint8"),
	hStdInput: PVOID,
	hStdOutput: PVOID,
	hStdError: PVOID
});
/** Koffi PROCESS_INFORMATION layout. */
const PROCESS_INFORMATION = koffi.struct("DSH_PROCESS_INFORMATION", {
	hProcess: PVOID,
	hThread: PVOID,
	dwProcessId: "uint32",
	dwThreadId: "uint32"
});
/* v8 ignore start -- ABI guards are pinned by native header probes. */
if (STARTUPINFOW.size !== 104) throw new Error(`STARTUPINFOW layout mismatch: koffi computed ${STARTUPINFOW.size}, expected 104`);
if (PROCESS_INFORMATION.size !== 24) throw new Error(`PROCESS_INFORMATION layout mismatch: koffi computed ${PROCESS_INFORMATION.size}, expected 24`);
/* v8 ignore stop */
/**
* Allocate a pointer-sized out-parameter slot.
* @returns allocated native slot.
*/
function allocPtrSlot() {
	return koffi.alloc(PVOID, 1);
}
/**
* Allocate a uint32 out-parameter slot.
* @returns allocated native slot.
*/
function allocUint32() {
	return koffi.alloc("uint32", 1);
}
/**
* Decode a pointer out-parameter.
* @param slot - pointer-sized slot filled by Win32.
* @returns decoded pointer, or null for address zero.
*/
function decodePtr(slot) {
	const value = koffi.decode(slot, PVOID);
	return isNullPtr(value) ? null : value;
}
/**
* Decode a uint32 out-parameter.
* @param slot - uint32 slot filled by Win32.
* @returns decoded unsigned value.
*/
function decodeUint32(slot) {
	return koffi.decode(slot, "uint32");
}
/**
* Allocate a zeroed STARTUPINFOW.
* @returns allocated struct pointer.
*/
function allocStartupInfo() {
	return koffi.alloc(STARTUPINFOW, 1);
}
/**
* Encode the stdio-bearing STARTUPINFOW fields.
* @param startupInfo - allocated STARTUPINFOW pointer.
* @param fields - fields required for inherited stdio.
*/
function encodeStartupInfo(startupInfo, fields) {
	koffi.encode(startupInfo, STARTUPINFOW, fields);
}
/**
* Allocate a zeroed PROCESS_INFORMATION.
* @returns allocated struct pointer.
*/
function allocProcessInfo() {
	return koffi.alloc(PROCESS_INFORMATION, 1);
}
/**
* Decode PROCESS_INFORMATION.
* @param processInfo - struct pointer filled by CreateProcess.
* @returns process/thread handles and ids.
*/
function decodeProcessInfo(processInfo) {
	return koffi.decode(processInfo, PROCESS_INFORMATION);
}
let cachedContext;
let cached;
/* v8 ignore start -- exercised by native Windows ABI and sandbox jobs. */
function bindingContext() {
	if (cachedContext !== void 0) return cachedContext;
	const kernel32 = koffi.load("kernel32.dll");
	const advapi32 = koffi.load("advapi32.dll");
	const bind = (lib, name, result, args) => lib.func("__stdcall", name, result, args);
	cachedContext = {
		kernel32,
		advapi32,
		bind
	};
	return cachedContext;
}
function bindings() {
	if (cached !== void 0) return cached;
	const { kernel32, advapi32, bind } = bindingContext();
	const node = koffi.load(null);
	cached = {
		closeHandle: bind(kernel32, "CloseHandle", "int", [PVOID]),
		getLastError: bind(kernel32, "GetLastError", "uint32", []),
		formatMessageW: bind(kernel32, "FormatMessageW", "uint32", [
			"uint32",
			PVOID,
			"uint32",
			"uint32",
			PVOID,
			"uint32",
			PVOID
		]),
		createPipe: bind(kernel32, "CreatePipe", "int", [
			PPVOID,
			PPVOID,
			PVOID,
			"uint32"
		]),
		setHandleInformation: bind(kernel32, "SetHandleInformation", "int", [
			PVOID,
			"uint32",
			"uint32"
		]),
		createProcessAsUserW: bind(advapi32, "CreateProcessAsUserW", "int", [
			PVOID,
			"str16",
			"str16",
			PVOID,
			PVOID,
			"int",
			"uint32",
			PVOID,
			"str16",
			koffi.pointer(STARTUPINFOW),
			koffi.pointer(PROCESS_INFORMATION)
		]),
		createProcessW: bind(kernel32, "CreateProcessW", "int", [
			"str16",
			"str16",
			PVOID,
			PVOID,
			"int",
			"uint32",
			PVOID,
			"str16",
			koffi.pointer(STARTUPINFOW),
			koffi.pointer(PROCESS_INFORMATION)
		]),
		readFile: bind(kernel32, "ReadFile", "int", [
			PVOID,
			PVOID,
			"uint32",
			koffi.pointer("uint32"),
			PVOID
		]),
		peekNamedPipe: bind(kernel32, "PeekNamedPipe", "int", [
			PVOID,
			PVOID,
			"uint32",
			koffi.pointer("uint32"),
			koffi.pointer("uint32"),
			koffi.pointer("uint32")
		]),
		waitForSingleObject: bind(kernel32, "WaitForSingleObject", "uint32", [PVOID, "uint32"]),
		getExitCodeProcess: bind(kernel32, "GetExitCodeProcess", "int", [PVOID, koffi.pointer("uint32")]),
		createJobObjectW: bind(kernel32, "CreateJobObjectW", PVOID, [PVOID, "str16"]),
		setInformationJobObject: bind(kernel32, "SetInformationJobObject", "int", [
			PVOID,
			"int",
			PVOID,
			"uint32"
		]),
		queryInformationJobObject: bind(kernel32, "QueryInformationJobObject", "int", [
			PVOID,
			"int",
			PVOID,
			"uint32",
			PVOID
		]),
		assignProcessToJobObject: bind(kernel32, "AssignProcessToJobObject", "int", [PVOID, PVOID]),
		resumeThread: bind(kernel32, "ResumeThread", "uint32", [PVOID]),
		terminateProcess: bind(kernel32, "TerminateProcess", "int", [PVOID, "uint32"]),
		terminateJobObject: bind(kernel32, "TerminateJobObject", "int", [PVOID, "uint32"]),
		getStdHandle: bind(kernel32, "GetStdHandle", PVOID, ["int"]),
		uvGetOsfhandle: node.func("uv_get_osfhandle", PVOID, ["int"])
	};
	return cached;
}
/**
* Extend the shared process table with caller-owned Win32 API families.
* @param create - binds only the caller-specific operations from the shared libraries.
* @returns generic process bindings combined with the caller-specific operations.
*/
function extendWin32ProcessBindings(create) {
	return {
		...bindings(),
		...create(bindingContext())
	};
}
/**
* Load the generic process binding table without policy-specific extensions.
* @returns shared Win32 process, stdio, and Job operations.
*/
function loadWin32ProcessBindings() {
	return bindings();
}
/* v8 ignore stop */
/**
* Format a Win32 error code through FormatMessageW.
* @param api - active binding table.
* @param win32Code - captured GetLastError value.
* @returns trimmed system message, or an empty string when unavailable.
*/
function errorText(api, win32Code) {
	const buffer = Buffer.alloc(1024);
	const length = api.formatMessageW(4608, null, win32Code, 0, buffer, buffer.length / 2, null);
	return length === 0 ? "" : buffer.subarray(0, length * 2).toString("utf16le").trim();
}
/**
* Throw the current GetLastError value.
* @param api - active binding table.
* @param name - failing Win32 operation.
* @param detail - optional operation context.
* @returns never; always throws Win32Error.
*/
function throwLastError(api, name, detail) {
	const win32Code = api.getLastError();
	throw new Win32Error(name, win32Code, detail ?? errorText(api, win32Code));
}
/**
* Throw an explicitly captured Win32 error code.
* @param api - active binding table.
* @param name - failing Win32 operation.
* @param win32Code - error captured before cleanup.
* @param detail - optional operation context.
* @returns never; always throws Win32Error.
*/
function throwWin32(api, name, win32Code, detail) {
	throw new Win32Error(name, win32Code, detail ?? errorText(api, win32Code));
}
//#endregion
//#region lib/types/process.js
/** Typed Win32 process operations over the shared binding table. */
/**
* Quote one argument according to CommandLineToArgvW parsing.
* @param argument - one argv entry.
* @returns bare or quoted command-line segment.
*/
function quoteArg(argument) {
	if (argument === "") return "\"\"";
	if (!/[\s"]/u.test(argument)) return argument;
	let quoted = "\"";
	for (let index = 0; index < argument.length; index++) {
		let backslashes = 0;
		while (index < argument.length && argument.charAt(index) === "\\") {
			backslashes += 1;
			index += 1;
		}
		if (index === argument.length) quoted += "\\".repeat(backslashes * 2);
		else if (argument.charAt(index) === "\"") quoted += "\\".repeat(backslashes * 2 + 1) + "\"";
		else quoted += "\\".repeat(backslashes) + argument.charAt(index);
	}
	return quoted + "\"";
}
/**
* Build the mutable command line accepted by CreateProcessAsUserW.
* @param program - executable argv entry.
* @param args - remaining argv entries.
* @returns joined Win32 command line.
*/
function buildCommandLine(program, args) {
	return [program, ...args].map(quoteArg).join(" ");
}
function compareWindowsEnvironmentKeys([left], [right]) {
	const foldedLeft = left.toUpperCase();
	const foldedRight = right.toUpperCase();
	return foldedLeft < foldedRight ? -1 : foldedLeft > foldedRight ? 1 : 0;
}
function encodeWindowsEnvironment(env) {
	const strings = Object.entries(env).sort(compareWindowsEnvironmentKeys).map(([key, value]) => `${key}=${value}`);
	return Buffer.from(`${strings.join("\0")}\0\0`, "utf16le");
}
function freeNative(pointer) {
	if (pointer !== void 0) koffi.free(pointer);
}
function closeBestEffort(api, handle) {
	if (!isNullPtr(handle)) api.closeHandle(handle);
}
function createPipe(api, owned) {
	const readSlot = allocPtrSlot();
	let writeSlot;
	try {
		writeSlot = allocPtrSlot();
		if (api.createPipe(readSlot, writeSlot, null, 0) === 0) throwLastError(api, "CreatePipe");
		const read = decodePtr(readSlot);
		const write = decodePtr(writeSlot);
		if (read === null || write === null) {
			closeBestEffort(api, read);
			closeBestEffort(api, write);
			throwLastError(api, "CreatePipe", "null pipe handle");
		}
		owned.add(read);
		owned.add(write);
		return {
			read,
			write
		};
	} finally {
		freeNative(writeSlot);
		koffi.free(readSlot);
	}
}
function closeOwned(api, owned, handle) {
	/* v8 ignore next -- each successfully decoded pipe end is uniquely owned. */
	if (!owned.delete(handle)) return;
	api.closeHandle(handle);
}
function closeAllOwned(api, owned) {
	for (const handle of owned) api.closeHandle(handle);
	owned.clear();
}
function createRestrictedProcess(api, options, commandLine, creationFlags, startupInfo, processInfo) {
	return api.createProcessAsUserW(options.token, null, commandLine, null, null, 1, creationFlags, null, options.cwd, startupInfo, processInfo);
}
/**
* Spawn a process with anonymous-pipe stdout/stderr and immediate stdin EOF.
* @param api - active binding table.
* @param options - command, cwd, args, and restricted primary token.
* @returns caller-owned process and pipe read handles.
*/
function spawnPipedProcess(api, options) {
	const owned = /* @__PURE__ */ new Set();
	let startupInfo;
	let processInfo;
	try {
		const stdIn = createPipe(api, owned);
		const stdOut = createPipe(api, owned);
		const stdErr = createPipe(api, owned);
		for (const [handle, label] of [
			[stdIn.read, "stdin read end"],
			[stdOut.write, "stdout write end"],
			[stdErr.write, "stderr write end"]
		]) if (api.setHandleInformation(handle, 1, 1) === 0) throwLastError(api, "SetHandleInformation", label);
		startupInfo = allocStartupInfo();
		encodeStartupInfo(startupInfo, {
			cb: 104,
			dwFlags: 256,
			hStdInput: stdIn.read,
			hStdOutput: stdOut.write,
			hStdError: stdErr.write
		});
		processInfo = allocProcessInfo();
		if (createRestrictedProcess(api, options, buildCommandLine(options.command, options.args), 0, startupInfo, processInfo) === 0) throwWin32(api, "CreateProcessAsUserW", api.getLastError(), `command: ${options.command}, cwd: ${options.cwd}`);
		const info = decodeProcessInfo(processInfo);
		if (info.hProcess === null || info.hThread === null) {
			if (info.hProcess !== null) api.terminateProcess(info.hProcess, 1);
			closeBestEffort(api, info.hThread);
			closeBestEffort(api, info.hProcess);
			throw new Error(`CreateProcessAsUserW succeeded but returned null process/thread handles (pid ${info.dwProcessId})`);
		}
		closeOwned(api, owned, stdIn.read);
		closeOwned(api, owned, stdIn.write);
		closeOwned(api, owned, stdOut.write);
		closeOwned(api, owned, stdErr.write);
		closeBestEffort(api, info.hThread);
		owned.delete(stdOut.read);
		owned.delete(stdErr.read);
		return {
			pid: info.dwProcessId,
			process: info.hProcess,
			stdoutRead: stdOut.read,
			stderrRead: stdErr.read
		};
	} catch (error) {
		closeAllOwned(api, owned);
		throw error;
	} finally {
		freeNative(processInfo);
		freeNative(startupInfo);
	}
}
/**
* Drain one anonymous pipe until the writer closes it.
* @param api - active binding table.
* @param handle - caller-owned pipe read end.
* @returns complete bytes read before EOF; the handle is always closed.
* @throws when a Win32 pipe operation fails.
*/
async function drainPipe(api, handle) {
	const chunks = [];
	let countSlot;
	try {
		countSlot = allocUint32();
		for (;;) {
			if (api.peekNamedPipe(handle, null, 0, null, countSlot, null) === 0) {
				const win32Code = api.getLastError();
				if (win32Code === 109 || win32Code === 232) break;
				throwLastError(api, "PeekNamedPipe", `drain failure after ${chunks.length} chunk(s)`);
			}
			const available = decodeUint32(countSlot);
			if (available > 0) {
				const chunk = Buffer.alloc(available);
				if (api.readFile(handle, chunk, chunk.length, countSlot, null) === 0) throwLastError(api, "ReadFile", `drain failure after ${chunks.length} chunk(s)`);
				chunks.push(chunk.subarray(0, decodeUint32(countSlot)));
			}
			await new Promise((resolve) => setTimeout(resolve, 1));
		}
		return Buffer.concat(chunks);
	} finally {
		freeNative(countSlot);
		api.closeHandle(handle);
	}
}
/**
* Wait for a process and always close its handle.
* @param api - active binding table.
* @param process - caller-owned process handle.
* @returns direct process exit code.
*/
function waitForProcessExit(api, process) {
	let exitCodeSlot;
	try {
		if (api.waitForSingleObject(process, 4294967295) === 4294967295) throwLastError(api, "WaitForSingleObject");
		exitCodeSlot = allocUint32();
		if (api.getExitCodeProcess(process, exitCodeSlot) === 0) throwLastError(api, "GetExitCodeProcess");
		return decodeUint32(exitCodeSlot);
	} finally {
		freeNative(exitCodeSlot);
		api.closeHandle(process);
	}
}
function createKillOnCloseJob(api) {
	const job = api.createJobObjectW(null, null);
	if (isNullPtr(job)) throwLastError(api, "CreateJobObjectW");
	const information = Buffer.alloc(144);
	information.writeUInt32LE(JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, 16);
	if (api.setInformationJobObject(job, 9, information, information.length) === 0) {
		const win32Code = api.getLastError();
		api.closeHandle(job);
		throwWin32(api, "SetInformationJobObject", win32Code);
	}
	return job;
}
const UV_INVALID_OS_FILE_HANDLE = 18446744073709551615n;
const UV_INVALID_FILE_DESCRIPTOR = 18446744073709551614n;
function inheritedStandardHandles(api) {
	const get = (selector, label) => {
		const handle = api.getStdHandle(selector);
		if (!isNullPtr(handle)) return handle;
		throwLastError(api, "GetStdHandle", `null ${label} handle`);
	};
	return {
		stdin: get(-10, "stdin"),
		stdout: get(-11, "stdout"),
		stderr: get(-12, "stderr")
	};
}
function targetCarrierHandles(api, descriptors) {
	const get = (fileDescriptor, label) => {
		const handle = api.uvGetOsfhandle(fileDescriptor);
		if (isNullPtr(handle) || handle === UV_INVALID_OS_FILE_HANDLE || handle === UV_INVALID_FILE_DESCRIPTOR) throw new Error(`uv_get_osfhandle returned an invalid handle for target ${label} fd ${String(fileDescriptor)}`);
		return handle;
	};
	return {
		stdin: get(descriptors.stdin, "stdin"),
		stdout: get(descriptors.stdout, "stdout"),
		stderr: get(descriptors.stderr, "stderr")
	};
}
/** Shared suspended-create, Job-assignment, and resume lifecycle. */
function spawnJobProcess(api, options, resolveStdio, createName, create) {
	const job = createKillOnCloseJob(api);
	const enabled = [];
	let startupInfo;
	let processInfo;
	let created = 0;
	let createFailureCode = 0;
	try {
		const stdio = resolveStdio();
		for (const [handle, label] of [
			[stdio.stdin, "stdin"],
			[stdio.stdout, "stdout"],
			[stdio.stderr, "stderr"]
		]) {
			if (api.setHandleInformation(handle, 1, 1) === 0) throwLastError(api, "SetHandleInformation", `${label} (enable inherit)`);
			enabled.push(handle);
		}
		startupInfo = allocStartupInfo();
		encodeStartupInfo(startupInfo, {
			cb: 104,
			dwFlags: 256,
			hStdInput: stdio.stdin,
			hStdOutput: stdio.stdout,
			hStdError: stdio.stderr
		});
		processInfo = allocProcessInfo();
		created = create(startupInfo, processInfo);
		if (created === 0) createFailureCode = api.getLastError();
	} catch (error) {
		freeNative(processInfo);
		api.closeHandle(job);
		throw error;
	} finally {
		freeNative(startupInfo);
		for (const handle of enabled) api.setHandleInformation(handle, 1, 0);
	}
	if (created === 0) {
		freeNative(processInfo);
		api.closeHandle(job);
		throwWin32(api, createName, createFailureCode, `command: ${options.command}, cwd: ${options.cwd}`);
	}
	let info;
	try {
		info = decodeProcessInfo(processInfo);
	} finally {
		freeNative(processInfo);
	}
	if (info.hProcess === null || info.hThread === null) {
		if (info.hProcess !== null) api.terminateProcess(info.hProcess, 1);
		api.closeHandle(job);
		closeBestEffort(api, info.hThread);
		closeBestEffort(api, info.hProcess);
		throw new Error(`${createName} succeeded but returned null process/thread handles (pid ${info.dwProcessId})`);
	}
	if (api.assignProcessToJobObject(job, info.hProcess) === 0) {
		const win32Code = api.getLastError();
		api.terminateProcess(info.hProcess, 1);
		closeBestEffort(api, info.hThread);
		closeBestEffort(api, info.hProcess);
		api.closeHandle(job);
		throwWin32(api, "AssignProcessToJobObject", win32Code, `pid ${info.dwProcessId}`);
	}
	if (api.resumeThread(info.hThread) === 4294967295) {
		const win32Code = api.getLastError();
		closeBestEffort(api, info.hThread);
		closeBestEffort(api, info.hProcess);
		api.closeHandle(job);
		throwWin32(api, "ResumeThread", win32Code, `pid ${info.dwProcessId}`);
	}
	closeBestEffort(api, info.hThread);
	return {
		pid: info.dwProcessId,
		process: info.hProcess,
		job
	};
}
/**
* Spawn a restricted-token process suspended, assign its Job, then resume it.
* @param api - active binding table.
* @param options - command, cwd, args, and restricted primary token.
* @returns caller-owned process and Job handles after successful resume.
* @remarks Node clears stdio handle inheritability at startup through
* uv_disable_stdio_inheritance. This operation temporarily restores the bits
* required by STARTF_USESTDHANDLES. Restoring them afterward is best-effort:
* failure must not replace the already-created child's outcome.
*/
function spawnInheritedJobProcess(api, options) {
	const commandLine = buildCommandLine(options.command, options.args);
	return spawnJobProcess(api, options, () => inheritedStandardHandles(api), "CreateProcessAsUserW", (startupInfo, processInfo) => createRestrictedProcess(api, options, commandLine, 4, startupInfo, processInfo));
}
/**
* Spawn an ordinary process suspended, assign its Job, then resume it.
* @param api - active binding table.
* @param options - command, cwd, argv, and target carrier descriptors.
* @returns caller-owned process and Job handles after successful resume.
*/
function spawnCurrentTokenJobProcess(api, options) {
	const commandLine = buildCommandLine(options.command, options.args);
	const environment = encodeWindowsEnvironment(options.env);
	return spawnJobProcess(api, options, () => targetCarrierHandles(api, options.stdio), "CreateProcessW", (startupInfo, processInfo) => api.createProcessW(options.applicationName, commandLine, null, null, 1, 1028, environment, options.cwd, startupInfo, processInfo));
}
/**
* Verify that an unnamed kill-on-close Job can be created and released now.
* @param api - active binding table.
*/
function probeCurrentTokenJobSupport(api) {
	closeHandleChecked(api, createKillOnCloseJob(api), "current-token Job capability probe");
}
/**
* Poll one process handle without blocking the runner event loop.
* @param api - active binding table.
* @param process - caller-owned process handle.
* @returns the direct exit code when signalled, or undefined while running.
*/
function pollProcessExit(api, process) {
	const waitResult = api.waitForSingleObject(process, 0);
	if (waitResult === 258) return void 0;
	if (waitResult === 4294967295) throwLastError(api, "WaitForSingleObject");
	const exitCodeSlot = allocUint32();
	try {
		if (api.getExitCodeProcess(process, exitCodeSlot) === 0) throwLastError(api, "GetExitCodeProcess");
		return decodeUint32(exitCodeSlot);
	} finally {
		koffi.free(exitCodeSlot);
	}
}
/**
* Return whether a Job has no active processes.
* @param api - active binding table.
* @param job - caller-owned Job handle.
* @returns true once the Job reports zero active processes.
*/
function isJobEmpty(api, job) {
	const information = Buffer.alloc(48);
	if (api.queryInformationJobObject(job, 1, information, information.length, null) === 0) throwLastError(api, "QueryInformationJobObject", "active process count");
	return information.readUInt32LE(40) === 0;
}
/**
* Terminate every process in a Job.
* @param api - active binding table.
* @param job - caller-owned Job handle.
* @param exitCode - direct Windows exit code assigned to members.
*/
function terminateJob(api, job, exitCode) {
	if (api.terminateJobObject(job, exitCode) === 0) throwLastError(api, "TerminateJobObject");
}
/**
* Close a caller-owned handle and report a labelled Win32 failure.
* @param api - active binding table.
* @param handle - handle to close.
* @param detail - lifecycle label for diagnostics.
*/
function closeHandleChecked(api, handle, detail) {
	if (api.closeHandle(handle) === 0) throwLastError(api, "CloseHandle", detail);
}
//#endregion
export { ERROR_INSUFFICIENT_BUFFER, Win32Error, allocPtrSlot, allocUint32, closeHandleChecked, decodePtr, decodeUint32, drainPipe, extendWin32ProcessBindings, isJobEmpty, isNullPtr, loadWin32ProcessBindings, pollProcessExit, probeCurrentTokenJobSupport, spawnCurrentTokenJobProcess, spawnInheritedJobProcess, spawnPipedProcess, terminateJob, throwLastError, throwWin32, waitForProcessExit };

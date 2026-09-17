import { accessSync, chmodSync, closeSync, constants, existsSync, lstatSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync, readlinkSync, rmdirSync, statSync, unlinkSync, writeFileSync, writeSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join } from "node:path";
import { scrubbedParentEnv } from "@deepseek-ai/dsh-subprocess";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { setTimeout as setTimeout$1 } from "node:timers/promises";
import { MAX_TIMER_DELAY_MS } from "@deepseek-ai/dsh-timeout";
import koffi from "koffi";
import { getSystemErrorMessage, getSystemErrorName, inspect } from "node:util";
import { fileURLToPath } from "node:url";
//#region lib/types/managed-owner.js
/** Minimal managed-range ownership bound to one ordinary subprocess handle. */
/**
* Apply an optional abort bound to one shared wait promise.
* @param pending - managed-range wait shared by all callers.
* @param signal - optional caller cancellation signal.
* @returns whether the managed-range wait completed before cancellation.
*/
async function waitWithAbort(pending, signal) {
	if (signal?.aborted) {
		pending.catch(() => {});
		return false;
	}
	if (signal === void 0) {
		await pending;
		return true;
	}
	const aborted = Promise.withResolvers();
	const onAbort = () => {
		aborted.resolve(false);
	};
	signal.addEventListener("abort", onAbort, { once: true });
	try {
		return await Promise.race([pending.then(() => true), aborted.promise]);
	} finally {
		signal.removeEventListener("abort", onAbort);
	}
}
//#endregion
//#region lib/types/windows-inspector.js
/**
* Windows process-table operations for terminal readiness, signalling, and
* teardown: Toolhelp32 snapshot enumeration with GetProcessTimes creation-time
* identity and process-handle wait-state liveness, the shell pid as a pseudo
* process group (Windows has no POSIX groups), and taskkill tree signalling.
* The koffi bindings load lazily so
* non-Windows processes never touch Win32 libraries; all decision logic takes
* an injectable internals boundary so suites can pin it on any host.
* @module dsh-subprocess-local/windows-inspector
*/
/**
* Walk a process table from one root in children-first order, retaining only
* members whose start identity is readable (unreadable members are detector
* misses, exactly like an unreadable `/proc` entry on Linux).
* @param entries - the process table snapshot.
* @param rootPid - the tree root to descend from.
* @param started - creation-time identity resolver for one member.
* @returns the root and its current transitive descendants, children first.
*/
function windowsProcessTree(entries, rootPid, started) {
	const root = new Map(entries.map((entry) => [entry.pid, entry])).get(rootPid);
	if (root === void 0) return [];
	const byParent = /* @__PURE__ */ new Map();
	for (const entry of entries) {
		const children = byParent.get(entry.parentPid) ?? [];
		children.push(entry);
		byParent.set(entry.parentPid, children);
	}
	const visited = /* @__PURE__ */ new Set();
	const result = [];
	const visit = (entry) => {
		if (visited.has(entry.pid)) return;
		visited.add(entry.pid);
		for (const child of byParent.get(entry.pid) ?? []) visit(child);
		const identity = started(entry.pid);
		if (identity !== void 0) result.push({
			pid: entry.pid,
			started: identity
		});
	};
	visit(root);
	return result;
}
/**
* Windows {@link ProcessInspector}. The shell pid stands in for a foreground
* process group: it is a stable pseudo-group that lets the prompt-marker
* readiness path compare foreground identities, while every actual signal
* targets the console-wide tree through taskkill (SIGINT is delivered by the
* terminal handle as a `\x03` input write and never reaches this layer).
*/
var WindowsProcessInspector = class {
	internals;
	constructor(internals = defaultWindowsProcessInternals()) {
		this.internals = internals;
	}
	foregroundPgid(shellPid) {
		return shellPid;
	}
	isStdinWaiting(_pgid, _shellPid) {
		return false;
	}
	isAlive(identity) {
		const state = this.internals.processState(identity.pid);
		return state?.active === true && state.started === identity.started;
	}
	snapshot() {
		let entries;
		return {
			tree: (rootPid) => windowsProcessTree(entries ??= this.internals.snapshot(), rootPid, (pid) => this.internals.processState(pid)?.started),
			session: () => [],
			alive: (identity) => this.isAlive(identity)
		};
	}
	signalGroup(pgid, signal) {
		this.internals.taskkill(pgid, signal === "SIGKILL");
	}
	signalProcess(identity, signal) {
		if (this.isAlive(identity)) this.internals.taskkill(identity.pid, signal === "SIGKILL");
	}
};
/**
* Create the Windows process inspector.
* @param internals - injectable process operations; defaults to the koffi-backed table.
* @returns the Windows inspector.
*/
function createWindowsProcessInspector(internals = defaultWindowsProcessInternals()) {
	return new WindowsProcessInspector(internals);
}
/** Terminate one Windows process tree with taskkill, contained like POSIX group signalling. */
function taskkillTree(pid, force) {
	if (pid <= 0) return;
	spawnSync("taskkill", [
		"/PID",
		String(pid),
		"/T",
		...force ? ["/F"] : []
	], {
		stdio: "ignore",
		windowsHide: true
	});
}
/**
* True for NULL and INVALID_HANDLE_VALUE returns from Win32 handle APIs.
* @param value - a handle as koffi may hand it back (pointer, null, or 0n).
* @returns whether the value signals an invalid handle.
*/
function isInvalidHandle(value) {
	if (value === null || value === void 0) return true;
	const asBigInt = value;
	return asBigInt === 0n || asBigInt === 18446744073709551615n || asBigInt === -1n;
}
const PVOID = koffi.pointer("void");
/**
* Resolve the koffi Win32 struct types once. Registration is lazy and cached
* because koffi's type registry is global per process: test runners that
* re-evaluate this module (a hoisted `vi.mock` re-imports the graph) must not
* re-register the names.
*/
function win32Structs() {
	if (cachedStructs !== void 0) return cachedStructs;
	const PROCESSENTRY32W = koffi.struct("PROCESSENTRY32W", {
		dwSize: "uint32",
		cntUsage: "uint32",
		th32ProcessID: "uint32",
		th32DefaultHeapID: PVOID,
		th32ModuleID: "uint32",
		cCntThreads: "uint32",
		th32ParentProcessID: "uint32",
		pcPriClassBase: "int32",
		dwFlags: "uint32",
		szExeFile: koffi.array("char16", 260)
	});
	const FILETIME = koffi.struct("FILETIME", {
		dwLowDateTime: "uint32",
		dwHighDateTime: "uint32"
	});
	/* v8 ignore start -- a layout-mismatch guard fires only on ABI breakage; the windows-native suites exercise the real struct. */
	if (PROCESSENTRY32W.size !== 568) throw new Error(`PROCESSENTRY32W layout mismatch: koffi computed ${PROCESSENTRY32W.size}, Windows headers say 568`);
	/* v8 ignore stop */
	cachedStructs = {
		PROCESSENTRY32W,
		FILETIME
	};
	return cachedStructs;
}
let cachedStructs;
const TH32CS_SNAPPROCESS = 2;
const WAIT_OBJECT_0 = 0;
const WAIT_TIMEOUT = 258;
let cachedBindings;
/**
* Resolve the lazy Win32 bindings (throws the first binding failure, fail-closed).
* @returns the cached binding table.
*/
function win32Bindings() {
	if (cachedBindings !== void 0) return cachedBindings;
	const { PROCESSENTRY32W, FILETIME } = win32Structs();
	const kernel32 = koffi.load("kernel32.dll");
	const bind = (name, result, args) => kernel32.func("__stdcall", name, result, args);
	cachedBindings = {
		createToolhelp32Snapshot: bind("CreateToolhelp32Snapshot", PVOID, ["uint32", "uint32"]),
		process32FirstW: bind("Process32FirstW", "int", [PVOID, koffi.pointer(PROCESSENTRY32W)]),
		process32NextW: bind("Process32NextW", "int", [PVOID, koffi.pointer(PROCESSENTRY32W)]),
		openProcess: bind("OpenProcess", PVOID, [
			"uint32",
			"int",
			"uint32"
		]),
		getProcessTimes: bind("GetProcessTimes", "int", [
			PVOID,
			koffi.pointer(FILETIME),
			koffi.pointer(FILETIME),
			koffi.pointer(FILETIME),
			koffi.pointer(FILETIME)
		]),
		waitForSingleObject: bind("WaitForSingleObject", "uint32", [PVOID, "uint32"]),
		closeHandle: bind("CloseHandle", "int", [PVOID])
	};
	return cachedBindings;
}
/**
* Allocate koffi memory as a branded {@link NativePtr}; koffi's TS types are
* `any`, so the cast goes through `unknown` to keep the unsafe surface here.
* @param type - the koffi type to allocate.
* @param count - element count.
* @returns the branded allocation pointer.
*/
function allocNative(type, count) {
	return koffi.alloc(type, count);
}
/** Enumerate the current process table through Toolhelp32. */
function snapshotWindowsProcesses(bindings) {
	const { PROCESSENTRY32W } = win32Structs();
	const snapshot = bindings.createToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
	/* v8 ignore next -- an invalid snapshot for the process flag is not producible through the public API;
	the guard mirrors POSIX's unreadable-proc tolerance and isInvalidHandle is unit-tested. */
	if (isInvalidHandle(snapshot)) return [];
	const entries = [];
	try {
		const entry = allocNative(PROCESSENTRY32W, 1);
		koffi.encode(entry, "uint32", PROCESSENTRY32W.size);
		let ok = bindings.process32FirstW(snapshot, entry);
		while (ok !== 0) {
			const record = koffi.decode(entry, PROCESSENTRY32W);
			entries.push({
				pid: record.th32ProcessID,
				parentPid: record.th32ParentProcessID
			});
			ok = bindings.process32NextW(snapshot, entry);
		}
	} finally {
		bindings.closeHandle(snapshot);
	}
	return entries;
}
/** Read one process's creation identity and current wait state. */
function windowsProcessState(bindings, pid) {
	const { FILETIME } = win32Structs();
	const handle = bindings.openProcess(1052672, 0, pid);
	if (isInvalidHandle(handle)) return void 0;
	try {
		const creation = allocNative(FILETIME, 1);
		const exit = allocNative(FILETIME, 1);
		const kernel = allocNative(FILETIME, 1);
		const user = allocNative(FILETIME, 1);
		/* v8 ignore next -- a GetProcessTimes failure after a successful open races process exit and
		cannot be staged deterministically; the absent-process path is covered and the caller
		treats undefined as a detector miss. */
		if (bindings.getProcessTimes(handle, creation, exit, kernel, user) === 0) return void 0;
		const record = koffi.decode(creation, FILETIME);
		const wait = bindings.waitForSingleObject(handle, 0);
		/* v8 ignore next -- an opened process handle has exactly one of these two
		zero-time wait states; an unexpected Win32 failure is an unreadable process. */
		if (wait !== WAIT_OBJECT_0 && wait !== WAIT_TIMEOUT) return void 0;
		return {
			started: `${record.dwHighDateTime}:${record.dwLowDateTime}`,
			active: wait === WAIT_TIMEOUT
		};
	} finally {
		bindings.closeHandle(handle);
	}
}
/** The koffi-backed default internals; bindings resolve lazily on first use. */
function defaultWindowsProcessInternals() {
	return {
		snapshot: () => snapshotWindowsProcesses(win32Bindings()),
		processState: (pid) => windowsProcessState(win32Bindings(), pid),
		taskkill: taskkillTree
	};
}
//#endregion
//#region lib/types/process-inspector.js
/** Platform process-table inspection for terminal readiness, signals, and teardown. */
/* v8 ignore start -- thin OS bindings; injected logic is unit-tested and real platform composition exercises them. */
const DEFAULT_INTERNALS = {
	readFile: (path) => readFileSync(path, "utf8"),
	readDir: (path) => readdirSync(path),
	readLink: (path) => readlinkSync(path, "utf8"),
	stat: (path) => statSync(path),
	open: (path) => openSync(path, "r"),
	read: (fd, buffer, length, position) => readSync(fd, buffer, 0, length, position),
	close: closeSync,
	exec: (file, args) => execFileSync(file, args, { encoding: "utf8" }),
	kill: (pid, signal) => process.kill(pid, signal)
};
/**
* Parse fields used from Linux `/proc/<pid>/stat`, including parenthesized comm text.
* @param text - complete stat line.
* @returns Parsed identity/group fields, or undefined for malformed input.
*/
function parseProcStat(text) {
	const open = text.indexOf("(");
	const close = text.lastIndexOf(")");
	if (open <= 0 || close <= open) return void 0;
	const pid = Number(text.slice(0, open).trim());
	const rest = text.slice(close + 2).trim().split(/\s+/);
	const state = rest[0] || "";
	const parentPid = Number(rest[1]);
	const pgrp = Number(rest[2]);
	const session = Number(rest[3]);
	const ttyDevice = Number(rest[4]);
	const tpgid = Number(rest[5]);
	const started = rest[19];
	if (![
		pid,
		parentPid,
		pgrp,
		session,
		ttyDevice,
		tpgid
	].every(Number.isSafeInteger) || state.length !== 1 || started === void 0) return void 0;
	return {
		pid,
		parentPid,
		pgrp,
		session,
		state,
		ttyDevice,
		tpgid,
		started
	};
}
function readLinuxStat(internals, pid) {
	try {
		return parseProcStat(internals.readFile(`/proc/${pid}/stat`));
	} catch (_unreadableProcEntry) {
		return;
	}
}
function linuxDeviceNumber(value) {
	return value >>> 0;
}
function readLinuxTerminalDevice(internals, pid, ttyDevice, tid) {
	const terminalDevice = linuxDeviceNumber(ttyDevice);
	if (terminalDevice === 0) return void 0;
	const path = tid === void 0 ? `/proc/${pid}/fd/0` : `/proc/${pid}/task/${tid}/fd/0`;
	try {
		if (internals.readLink(path) === "/dev/tty") return terminalDevice;
		const status = internals.stat(path);
		return status.isCharacterDevice() && linuxDeviceNumber(status.rdev) === terminalDevice ? terminalDevice : void 0;
	} catch (_unreadableStdinDevice) {
		return;
	}
}
/**
* Report whether a Linux process group has an executing member. `false`
* means the group contains only zombie/dead entries; `undefined` means the
* process table could not prove either outcome.
* @param processGroupId - POSIX process-group id to inspect.
* @param internals - injectable process-table operations.
* @returns Live-member presence, or `undefined` when unavailable/absent.
*/
function linuxProcessGroupHasLiveMembers(processGroupId, internals = DEFAULT_INTERNALS) {
	let entries;
	try {
		entries = internals.readDir("/proc");
	} catch (_unreadableProcDirectory) {
		return;
	}
	let matched = false;
	for (const entry of entries) {
		if (!/^\d+$/.test(entry)) continue;
		const stat = readLinuxStat(internals, Number(entry));
		if (stat?.pgrp !== processGroupId) continue;
		matched = true;
		if (!/^[ZXx]$/.test(stat.state)) return true;
	}
	return matched ? false : void 0;
}
function numericEntries(internals, path) {
	try {
		return internals.readDir(path).filter((entry) => /^\d+$/.test(entry)).map(Number);
	} catch (_unreadableProcDirectory) {
		return [];
	}
}
function readSyscall(internals, pid, tid) {
	try {
		const text = internals.readFile(`/proc/${pid}/task/${tid}/syscall`).trim();
		if (text === "running" || text.startsWith("-1 ")) return void 0;
		const fields = text.split(/\s+/);
		const number = Number(fields[0]);
		const args = fields.slice(1, 7).map((field) => Number.parseInt(field, 16));
		if (!Number.isSafeInteger(number) || args.some((value) => !Number.isSafeInteger(value))) return void 0;
		return {
			number,
			args
		};
	} catch (_unreadableSyscall) {
		return;
	}
}
function readMemory(internals, pid, address, length) {
	let fd;
	try {
		fd = internals.open(`/proc/${pid}/mem`);
		const buffer = Buffer.alloc(length);
		const count = internals.read(fd, buffer, length, address);
		return buffer.subarray(0, count);
	} catch (_unreadableProcessMemory) {
		return;
	} finally {
		if (fd !== void 0) internals.close(fd);
	}
}
function fdSetHasStdin(internals, pid, address) {
	return address !== 0 && (readMemory(internals, pid, address, 8)?.[0] ?? 0) % 2 === 1;
}
function pollHasStdin(internals, pid, address, count) {
	if (address === 0 || count <= 0) return false;
	const memory = readMemory(internals, pid, address, Math.min(count, 1024) * 8);
	if (memory === void 0) return false;
	for (let offset = 0; offset + 8 <= memory.length; offset += 8) if (memory.readInt32LE(offset) === 0 && (memory.readInt16LE(offset + 4) & 1) !== 0) return true;
	return false;
}
function epollHasStdin(internals, pid, tid, epfd) {
	try {
		return internals.readFile(`/proc/${pid}/task/${tid}/fdinfo/${epfd}`).split("\n").some((line) => /^tfd:\s+0\b/.test(line.trim()));
	} catch (_unreadableFdInfo) {
		return false;
	}
}
const SYSCALLS = {
	x64: {
		read: 0,
		select: 23,
		pselect: 270,
		poll: 7,
		ppoll: 271,
		epollWait: 232,
		epollPwait: 281
	},
	arm64: {
		read: 63,
		pselect: 72,
		ppoll: 73,
		epollPwait: 22
	}
};
const SUPPORTED_SYSCALL_TABLES = Object.values(SYSCALLS);
function linuxSyscallTables(arch) {
	const primary = SYSCALLS[arch];
	if (primary === void 0) return void 0;
	return [primary, ...SUPPORTED_SYSCALL_TABLES.filter((table) => table !== primary)];
}
function syscallWaitsOnStdin(internals, pid, tid, syscall, tables) {
	const [a0 = 0, a1 = 0, a2 = 0] = syscall.args;
	for (const table of tables) {
		if (syscall.number === table.read) return a0 === 0;
		if (syscall.number === table.select || syscall.number === table.pselect) return a0 >= 1 && fdSetHasStdin(internals, pid, a1);
		if (syscall.number === table.poll || syscall.number === table.ppoll) return a1 >= 1 && pollHasStdin(internals, pid, a0, a1);
		if (syscall.number === table.epollWait || syscall.number === table.epollPwait) return a2 >= 1 && epollHasStdin(internals, pid, tid, a0);
	}
	return false;
}
var PosixProcessInspector = class {
	internals;
	constructor(internals) {
		this.internals = internals;
	}
	signalGroup(pgid, signal) {
		this.internals.kill(-pgid, signal);
	}
	signalProcess(identity, signal) {
		if (this.isAlive(identity)) this.internals.kill(identity.pid, signal);
	}
};
function quiescent(state) {
	return state !== void 0 && /^[ZXx]$/.test(state);
}
var PosixProcessSnapshot = class {
	rows;
	byPid;
	constructor(rows) {
		this.rows = rows;
		this.byPid = new Map(rows.map((row) => [row.pid, row]));
	}
	tree(rootPid) {
		return processTree(this.rows, rootPid);
	}
	session(sessionId) {
		return this.rows.flatMap((row) => row.session === sessionId ? [{
			pid: row.pid,
			started: row.started
		}] : []);
	}
	alive(identity) {
		const row = this.byPid.get(identity.pid);
		return row?.started === identity.started && !quiescent(row.state);
	}
};
function processTree(entries, rootPid) {
	const root = new Map(entries.map((entry) => [entry.pid, entry])).get(rootPid);
	if (root === void 0) return [];
	const byParent = /* @__PURE__ */ new Map();
	for (const entry of entries) {
		const children = byParent.get(entry.parentPid) ?? [];
		children.push(entry);
		byParent.set(entry.parentPid, children);
	}
	const visited = /* @__PURE__ */ new Set();
	const result = [];
	const visit = (entry) => {
		if (visited.has(entry.pid)) return;
		visited.add(entry.pid);
		for (const child of byParent.get(entry.pid) ?? []) visit(child);
		result.push({
			pid: entry.pid,
			started: entry.started
		});
	};
	visit(root);
	return result;
}
var LinuxProcessInspector = class extends PosixProcessInspector {
	arch;
	constructor(arch, internals) {
		super(internals);
		this.arch = arch;
	}
	foregroundPgid(shellPid) {
		const tpgid = readLinuxStat(this.internals, shellPid)?.tpgid;
		return tpgid !== void 0 && tpgid > 0 ? tpgid : void 0;
	}
	isStdinWaiting(pgid, shellPid) {
		const tables = linuxSyscallTables(this.arch);
		if (tables === void 0) return false;
		const shell = readLinuxStat(this.internals, shellPid);
		if (shell === void 0) return false;
		const terminalDevice = readLinuxTerminalDevice(this.internals, shellPid, shell.ttyDevice);
		if (terminalDevice === void 0) return false;
		for (const pid of numericEntries(this.internals, "/proc")) {
			const process = readLinuxStat(this.internals, pid);
			if (process?.pgrp !== pgid) continue;
			for (const tid of numericEntries(this.internals, `/proc/${pid}/task`)) {
				const syscall = readSyscall(this.internals, pid, tid);
				if (syscall !== void 0 && syscallWaitsOnStdin(this.internals, pid, tid, syscall, tables) && readLinuxTerminalDevice(this.internals, pid, process.ttyDevice, tid) === terminalDevice) return true;
			}
		}
		return false;
	}
	isAlive(identity) {
		const stat = readLinuxStat(this.internals, identity.pid);
		return stat?.started === identity.started && !quiescent(stat.state);
	}
	snapshot() {
		return new PosixProcessSnapshot(numericEntries(this.internals, "/proc").flatMap((pid) => {
			const stat = readLinuxStat(this.internals, pid);
			return stat === void 0 ? [] : [{
				pid,
				parentPid: stat.parentPid,
				started: stat.started,
				session: stat.session,
				state: stat.state
			}];
		}));
	}
};
function macProcessTable(internals) {
	return internals.exec("/bin/ps", ["-axo", "pid=,ppid=,lstart="]).split("\n").flatMap((line) => {
		const match = /^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line);
		if (match?.[1] === void 0 || match[2] === void 0 || match[3] === void 0) return [];
		return [{
			pid: Number(match[1]),
			parentPid: Number(match[2]),
			started: match[3],
			session: void 0,
			state: void 0
		}];
	});
}
var MacProcessInspector = class extends PosixProcessInspector {
	foregroundPgid(shellPid) {
		try {
			const value = Number(this.internals.exec("/bin/ps", [
				"-o",
				"tpgid=",
				"-p",
				String(shellPid)
			]).trim());
			return Number.isSafeInteger(value) && value > 0 ? value : void 0;
		} catch (_missingProcess) {
			return;
		}
	}
	isStdinWaiting(_pgid, _shellPid) {
		return false;
	}
	isAlive(identity) {
		return macProcessTable(this.internals).some((entry) => entry.pid === identity.pid && entry.started === identity.started);
	}
	snapshot() {
		return new PosixProcessSnapshot(macProcessTable(this.internals));
	}
};
/**
* Create the supported platform inspector or fail at plugin load.
* @param platform - target Node platform.
* @param arch - target CPU architecture for Linux syscall numbers.
* @param internals - filesystem/process boundary, injectable for deterministic tests.
* @returns Platform process inspector.
*/
function createProcessInspector(platform = process.platform, arch = process.arch, internals = DEFAULT_INTERNALS) {
	if (platform === "linux") return new LinuxProcessInspector(arch, internals);
	if (platform === "darwin") return new MacProcessInspector(internals);
	if (platform === "win32") return createWindowsProcessInspector();
	throw new Error(`subprocess-local: terminal inspection is unsupported on platform ${platform}`);
}
//#endregion
//#region lib/types/spawn.js
/**
* Process plumbing for the local subprocess service: ordinary process launch
* with per-stream stdio dispositions, tail-keep collection with spill
* files, provider-owned range signalling, and common termination scheduling.
* POSIX owners stage TERM before KILL; Windows owners terminate immediately.
* This layer reacts to an abort signal; callers own deadlines, teardown
* ladders, and cause classification.
* @module dsh-subprocess-local/spawn
*/
/**
* Build a child environment: explicit caller entries override the scrubbed
* parent base using the target platform's environment-key semantics. A string
* deliberately restores or overrides an entry; an explicit `undefined`
* tombstone removes an ordinary ambient entry.
* @param extra - explicit caller entries and tombstones, merged after the scrub.
* @returns the environment to hand to `spawn` for the child process.
*/
function childEnv(extra) {
	const env = scrubbedParentEnv();
	if (process.platform !== "win32") return {
		...env,
		...extra
	};
	let entries = Object.entries(env);
	for (const [key, value] of Object.entries(extra ?? {})) {
		const normalized = key.toUpperCase();
		entries = entries.filter(([inherited]) => inherited.toUpperCase() !== normalized);
		entries.push([key, value]);
	}
	return Object.fromEntries(entries);
}
/**
* Liveness-poll cadence for tree-exit waits. The timer stays ref'd: an
* awaited teardown must keep the event loop alive until the tree really
* exits, or the parent can exit while claiming quiescence and orphan the
* survivors it promised to reap.
*/
function sleepTick() {
	return setTimeout$1(15);
}
let spillCounter = 0;
let defaultSpillDir;
/**
* The default spill location: a private (0700) per-process directory under
* the OS tmpdir, created lazily. Predictable world-readable paths would let
* other local users read command output or pre-create symlinks. At a
* JavaScript-observable process exit the directory is removed only when it
* holds no completed spill file (spill files are retained as full-output
* recovery artifacts until an external cleanup).
*/
function privateSpillDir() {
	defaultSpillDir ??= mkdtempSync(join(tmpdir(), "dsh-subprocess-"));
	return defaultSpillDir;
}
/* v8 ignore next 4 -- exit listeners run after the coverage dump; removal is verified by the CI /tmp residue measurement. */
process.once("exit", () => {
	if (defaultSpillDir === void 0) return;
	try {
		rmdirSync(defaultSpillDir);
	} catch {}
});
/**
* Prepare fallible output storage before starting a managed native process.
* @param internals - optional caller-owned spill directory.
* @returns binding inputs whose spill directory is ready for use.
*/
function prepareManagedProcessBinding(internals = {}) {
	return { spillDir: internals.spillDir ?? privateSpillDir() };
}
/**
* Collects one stream with a bounded in-memory tail. With a spill cap, on
* first overflow a spill file is created and every chunk (including those
* already collected) is appended there while the full stream remains within
* the cap; without one, only the in-memory tail is ever retained (the
* diagnostic-tail shape — a language server's stderr).
*
* Tail-keep rationale (pi/OpenCode): errors and final results cluster at the
* end of command output; the spill file covers the head.
*/
var OutputCollector = class {
	maxBytes;
	maxSpillBytes;
	label;
	spillDir;
	chunks = [];
	bytes = 0;
	dropped = false;
	spillFd;
	spillFile;
	spillDisabled;
	/** Total bytes ever pushed (not just retained). */
	total = 0;
	constructor(maxBytes, maxSpillBytes, label, spillDir) {
		this.maxBytes = maxBytes;
		this.maxSpillBytes = maxSpillBytes;
		this.label = label;
		this.spillDir = spillDir;
		this.spillDisabled = maxSpillBytes === void 0;
	}
	/**
	* Ingest one stream chunk, counting it toward the whole-stream total. On
	* first overflow of the in-memory cap a spill file is opened (when spilling
	* is enabled) and every chunk (already-collected ones included) is appended
	* there from then on; the in-memory tail then drops whole chunks from its
	* head (or the head of a single over-cap chunk) until it fits the cap again.
	* @param chunk - the raw bytes from one stream 'data' event.
	*/
	push(chunk) {
		this.total += chunk.length;
		const overflows = this.bytes + chunk.length > this.maxBytes;
		if (!this.spillDisabled && (overflows || this.spillFd !== void 0)) this.spillAll(chunk);
		this.chunks.push(chunk);
		this.bytes += chunk.length;
		while (this.bytes > this.maxBytes) {
			const head = this.chunks[0];
			const excess = this.bytes - this.maxBytes;
			if (head.length <= excess) {
				this.chunks.shift();
				this.bytes -= head.length;
			} else {
				this.chunks[0] = head.subarray(excess);
				this.bytes -= excess;
			}
			this.dropped = true;
		}
	}
	/** Open the spill file lazily and append `chunk` (and any prior chunks once). */
	spillAll(chunk) {
		if (this.maxSpillBytes !== void 0 && this.total > this.maxSpillBytes) {
			this.discardSpill();
			return;
		}
		if (this.spillFd === void 0) {
			this.spillFile = join(this.spillDir, `dsh-subprocess-${process.pid}-${++spillCounter}-${randomBytes(6).toString("hex")}-${this.label}.log`);
			this.spillFd = openSync(this.spillFile, "wx", 384);
			for (const prior of this.chunks) writeSync(this.spillFd, prior);
		}
		writeSync(this.spillFd, chunk);
	}
	/** Stop spilling and remove the file once it can no longer hold the complete stream. */
	discardSpill() {
		const fd = this.spillFd;
		const file = this.spillFile;
		this.spillFd = void 0;
		this.spillFile = void 0;
		this.spillDisabled = true;
		if (fd !== void 0) try {
			closeSync(fd);
		} catch {
			this.spillFd = fd;
		}
		if (file !== void 0) try {
			unlinkSync(file);
		} catch {}
	}
	/**
	* Incremental read in whole-stream byte coordinates: returns everything
	* pushed since `fromByte`. When `fromByte` has already slid out of the
	* in-memory tail window, the read is `lossy` — it returns the whole
	* retained tail and the gap is only recoverable from the spill file.
	* @param fromByte - whole-stream offset to resume from (a prior read's `nextOffset`; 0 for the first read).
	* @returns the delta text, the offset for the next read, the `lossy` flag, and the spill path when one was created.
	*/
	readFrom(fromByte) {
		const windowStart = this.total - this.bytes;
		const buffer = Buffer.concat(this.chunks);
		const lossy = fromByte < windowStart;
		return {
			text: (lossy ? buffer : buffer.subarray(fromByte - windowStart)).toString("utf8"),
			nextOffset: this.total,
			lossy,
			...this.spillFile !== void 0 ? { spillPath: this.spillFile } : {}
		};
	}
	/**
	* Close the spill file once the stream has ended. A failed close (delayed
	* writeback fault) stops advertising the spill path — the file may be
	* missing its tail — while every in-memory read keeps working. Idempotent;
	* the spawn path seals both collectors at settlement so reads after exit
	* never point at a still-open file.
	*/
	seal() {
		if (this.spillFd === void 0) return;
		try {
			closeSync(this.spillFd);
		} catch {
			this.spillFile = void 0;
		}
		this.spillFd = void 0;
	}
	/**
	* Seal the spill file and return the final output.
	* @returns the final collected output: tail text, truncation flag, and the spill path when intact.
	*/
	finalize() {
		this.seal();
		return {
			text: Buffer.concat(this.chunks).toString("utf8"),
			truncated: this.dropped,
			...this.spillFile !== void 0 ? { spillPath: this.spillFile } : {}
		};
	}
};
/**
* Terminate one Windows process tree with `taskkill /T /F`. Contained like
* POSIX group signalling — delivery races tree exit, so an absent tree, a
* nonzero status, or a missing taskkill binary must not break idempotent
* teardown.
* @param pid - root process id, when the spawn published one.
*/
function taskkillProcessTree(pid) {
	if (pid === void 0 || pid <= 0) return;
	spawnSync("taskkill", [
		"/PID",
		String(pid),
		"/T",
		"/F"
	], {
		stdio: "ignore",
		windowsHide: true
	});
}
/**
* Signal a detached process tree with platform-correct semantics: POSIX
* signals the negative process-group id and falls back to the direct child
* when the group is gone; Windows terminates the tree via taskkill (any
* signal value force-terminates — Node maps signals to TerminateProcess).
*/
function signalTree(platform, pid, sig, child, taskkill) {
	/* v8 ignore next -- kill/terminate gate on treeAlive(), which is false without a pid; this guard protects direct callers only. */
	if (pid === void 0) return;
	if (platform === "win32") {
		taskkill(pid);
		return;
	}
	try {
		process.kill(-pid, sig);
	} catch {
		/* v8 ignore start -- the fallback needs a live child whose group signal fails
		(EPERM-style), which POSIX CI cannot stage; the swallow keeps teardown idempotent. */
		try {
			child.kill(sig);
		} catch {}
	}
}
/**
* Validate the synchronous portion of one ordinary spawn request.
* @param spec - exact target request.
* @throws when grace, cancellation, or argv is invalid before launch.
*/
function validateSubprocessSpec(spec) {
	if (!Number.isFinite(spec.graceMs) || spec.graceMs <= 0 || spec.graceMs > MAX_TIMER_DELAY_MS) throw new Error(`subprocess graceMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (spec.signal?.aborted) {
		let reason = "aborted";
		try {
			reason = String(spec.signal.reason ?? reason);
		} catch {}
		throw new Error(`aborted before spawn: ${reason}`);
	}
	const [program] = spec.argv;
	if (program === void 0 || program.length === 0) throw new Error("invalid argv: expected a non-empty program name at argv[0]");
}
function directChildResult(child) {
	return new Promise((resolve, reject) => {
		let completed = false;
		child.once("error", (error) => {
			/* v8 ignore next -- ChildProcess may report a later operational error after its
			terminal exit event; the first terminal event owns the result. */
			if (completed) return;
			completed = true;
			reject(error);
		});
		child.once("exit", (exitCode, signal) => {
			/* v8 ignore next -- a spawn/kill error may be followed by exit; a Promise can publish only the first terminal event. */
			if (completed) return;
			completed = true;
			resolve({
				exitCode,
				signal
			});
		});
	});
}
function fallbackOwner(platform, pid, child, taskkill, linuxGroupHasLiveMembers, direct) {
	let stopped = false;
	let directSettled = false;
	let observation;
	direct.then(() => {
		directSettled = true;
	}, () => {
		directSettled = true;
	});
	const alive = () => {
		if (stopped || pid === void 0) return false;
		if (platform === "win32") return child.exitCode === null && child.signalCode === null;
		try {
			process.kill(-pid, 0);
			if (directSettled && platform === "linux" && linuxGroupHasLiveMembers(pid) === false) return false;
			return true;
		} catch (error) {
			const code = error.code;
			if (code === "ESRCH") return false;
			/* v8 ignore start -- EPERM and non-POSIX negative-pid failures are platform defenses. */
			if (code === "EPERM") return true;
			return child.exitCode === null && child.signalCode === null;
		}
	};
	return {
		signal: (signal) => {
			if (!alive()) {
				stopped = true;
				return;
			}
			signalTree(platform, pid, signal, child, taskkill);
		},
		waitForExit: async () => {
			/* v8 ignore next -- bindManagedProcess memoizes this owner wait; the guard only
			protects direct internal re-entry after signal() observed absence. */
			if (stopped) return;
			observation ??= (async () => {
				while (alive()) await sleepTick();
				stopped = true;
			})();
			await observation;
		},
		terminateForHostExit: () => {
			if (stopped) return;
			signalTree(platform, pid, "SIGKILL", child, taskkill);
		}
	};
}
/**
* Bind platform launch facts to the existing stdio, outcome, abort, and termination lifecycle.
* @param spec - fully resolved argv, cwd, stdio, grace, cancellation, environment.
* @param launch - platform streams, direct outcome, and managed-range owner.
* @param internals - test-only spill-directory override.
* @returns live subprocess handle.
*/
function bindManagedProcess(spec, launch, internals = {}) {
	const { spillDir } = prepareManagedProcessBinding(internals);
	const { stdin, stdout, stderr } = launch;
	const isCollect = (mode) => mode !== "pipe" && mode !== "inherit";
	const outMode = spec.stdio.stdout;
	const errMode = spec.stdio.stderr;
	const stdinMode = spec.stdio.stdin;
	const collectStream = (mode, stream, label) => {
		if (!isCollect(mode) || stream === null) return void 0;
		const collector = new OutputCollector(mode.maxBytes, mode.spill?.maxBytes, label, spillDir);
		stream.on("data", (chunk) => {
			collector.push(chunk);
		});
		return collector;
	};
	const stdoutCollector = collectStream(outMode, stdout, "stdout");
	const stderrCollector = collectStream(errMode, stderr, "stderr");
	const observeOutputStream = (mode, stream) => {
		if (mode === "inherit" || stream === null || stream.readableEnded || stream.destroyed) return void 0;
		return new Promise((resolve) => {
			const settle = () => {
				stream.off("end", settle);
				stream.off("close", settle);
				stream.off("error", settle);
				resolve();
			};
			stream.once("end", settle);
			stream.once("close", settle);
			stream.once("error", settle);
		});
	};
	const stdoutClosed = observeOutputStream(outMode, stdout);
	const stderrClosed = observeOutputStream(errMode, stderr);
	const outputStreamsClosed = Promise.all([stdoutClosed, stderrClosed]);
	const stopCollectors = () => {
		if (stdoutCollector !== void 0) stdout?.destroy();
		if (stderrCollector !== void 0) stderr?.destroy();
		stdoutCollector?.seal();
		stderrCollector?.seal();
	};
	let graceTimer;
	let terminationStarted = false;
	let rangeExitObserved = false;
	let rangeExitObservation;
	let settled = false;
	const scheduleOwnerCleanup = () => {
		if (launch.owner.cleanup === void 0) return false;
		queueMicrotask(() => {
			done.finally(() => {
				launch.owner.cleanup?.();
			}).catch(() => {});
		});
		return true;
	};
	/**
	* Start or reuse the handle's managed-range exit observer. A failed read
	* before direct settlement can be retried. Once direct settlement permits
	* cleanup, retain a failed observation because removing its private evidence
	* must not turn a later wait into a false success. The first confirmed
	* absence is the permanent no-more-signals boundary and cancels pending
	* escalation before stale identity can be used.
	*/
	const observeRangeExit = () => {
		rangeExitObservation ??= (async () => {
			await launch.owner.waitForExit();
			rangeExitObserved = true;
			if (graceTimer !== void 0) clearTimeout(graceTimer);
			graceTimer = void 0;
			spec.signal?.removeEventListener("abort", onAbort);
			scheduleOwnerCleanup();
		})().catch((error) => {
			if (!settled || !scheduleOwnerCleanup()) rangeExitObservation = void 0;
			throw error;
		});
		return rangeExitObservation;
	};
	const kill = (sig, cancellationReason) => {
		if (rangeExitObserved) return;
		launch.owner.signal(sig, cancellationReason);
	};
	const terminateWithReason = (cancellationReason) => {
		if (rangeExitObserved || terminationStarted) return;
		terminationStarted = true;
		observeRangeExit().catch(() => {});
		kill("SIGTERM", cancellationReason);
		graceTimer = setTimeout(() => {
			graceTimer = void 0;
			kill("SIGKILL");
		}, spec.graceMs);
	};
	const terminate = () => {
		terminateWithReason(/* @__PURE__ */ new Error("subprocess terminated before target start"));
	};
	const terminateForHostExit = () => {
		launch.owner.terminateForHostExit();
	};
	const onAbort = () => {
		terminateWithReason(spec.signal?.reason);
	};
	spec.signal?.addEventListener("abort", onAbort, { once: true });
	if (typeof stdinMode === "object" && stdin !== null) {
		stdin.on("error", () => {});
		stdin.end(stdinMode.data);
	}
	const done = new Promise((resolve, reject) => {
		let pipeDrainTimer;
		const settle = (outcome) => {
			if (settled) return;
			settled = true;
			stopCollectors();
			cleanup();
			resolve(outcome);
		};
		const fail = (error) => {
			settled = true;
			terminate();
			stopCollectors();
			cleanup();
			reject(error);
		};
		launch.direct.then((outcome) => {
			if (stdoutClosed === void 0 && stderrClosed === void 0) {
				settle(outcome);
				return;
			}
			pipeDrainTimer = setTimeout(() => {
				settle(outcome);
			}, spec.graceMs);
			outputStreamsClosed.then(() => {
				settle(outcome);
			});
		}, fail);
		function cleanup() {
			if (pipeDrainTimer !== void 0) clearTimeout(pipeDrainTimer);
		}
	});
	const waitForExit = async (signal) => {
		if (rangeExitObserved) return true;
		return waitWithAbort(observeRangeExit(), signal);
	};
	return {
		/* v8 ignore start -- pipe-mode streams exist on every conforming launch;
		the null-coalesces guard an internal adapter defect only. */
		stdin: stdinMode === "pipe" ? stdin ?? void 0 : void 0,
		stdout: outMode === "pipe" ? stdout ?? void 0 : void 0,
		stderr: errMode === "pipe" ? stderr ?? void 0 : void 0,
		/* v8 ignore stop */
		collected: {
			...stdoutCollector !== void 0 ? { stdout: stdoutCollector } : {},
			...stderrCollector !== void 0 ? { stderr: stderrCollector } : {}
		},
		done,
		terminate,
		terminateForHostExit,
		waitForExit
	};
}
/**
* Spawn one detached PGID/taskkill fallback and bind the common lifecycle.
* @param spec - fully resolved argv, cwd, stdio, grace, cancellation, environment.
* @param internals - test-only spill-directory, platform, and taskkill overrides.
* @returns live subprocess handle.
*/
function spawnSubprocess(spec, internals = {}) {
	const binding = prepareManagedProcessBinding(internals);
	const platform = internals.platform ?? process.platform;
	const [program, ...args] = spec.argv;
	const child = (internals.spawn ?? spawn)(program, args, {
		cwd: spec.cwd,
		env: childEnv(spec.env),
		stdio: [
			spec.stdio.stdin === "ignore" ? "ignore" : "pipe",
			spec.stdio.stdout === "inherit" ? "inherit" : "pipe",
			spec.stdio.stderr === "inherit" ? "inherit" : "pipe"
		],
		detached: platform !== "win32",
		windowsHide: platform === "win32"
	});
	const direct = directChildResult(child);
	const pid = child.pid;
	const owner = fallbackOwner(platform, pid, child, internals.taskkill ?? taskkillProcessTree, internals.linuxProcessGroupHasLiveMembers ?? linuxProcessGroupHasLiveMembers, direct);
	return bindManagedProcess(spec, {
		stdin: child.stdin,
		stdout: child.stdout,
		stderr: child.stderr,
		direct,
		owner
	}, binding);
}
//#endregion
//#region lib/types/linux-execve.js
/** Lazy libc execve and descriptor bindings used by the one-shot Linux bootstrap. */
const STANDARD_FILE_DESCRIPTORS = [
	0,
	1,
	2
];
const F_GETFD = 1;
const F_SETFD = 2;
const FD_CLOEXEC = 1;
let cachedExecve;
function systemError(errno, syscall, path) {
	const uvError = -errno;
	const code = getSystemErrorName(uvError);
	const detail = getSystemErrorMessage(uvError);
	const subject = path === void 0 ? syscall : `${syscall} '${path}'`;
	const error = Object.assign(/* @__PURE__ */ new Error(`${code}: ${detail}, ${subject}`), {
		code,
		errno: uvError,
		syscall
	});
	return path === void 0 ? error : Object.assign(error, { path });
}
/**
* Load libc's execve and fcntl symbols on first use and retain the native bindings.
* @returns a process-replacing execve operation that throws Node-style errors on failure.
*/
function loadLinuxExecve() {
	if (cachedExecve !== void 0) return cachedExecve;
	const libc = koffi.load(null);
	const nativeExecve = libc.func("int execve(const char *pathname, const char **argv, const char **envp)");
	const nativeFcntl = libc.func("int fcntl(int fd, int cmd, int arg)");
	cachedExecve = (file, argv, env) => {
		for (const fd of STANDARD_FILE_DESCRIPTORS) {
			const flags = nativeFcntl(fd, F_GETFD, 0);
			if (flags === -1) throw systemError(koffi.errno(), "fcntl");
			if ((flags & FD_CLOEXEC) === 0) continue;
			if (nativeFcntl(fd, F_SETFD, flags & -2) === -1) throw systemError(koffi.errno(), "fcntl");
		}
		nativeExecve(file, [...argv, null], [...Object.entries(env).map(([key, value]) => `${key}=${value}`), null]);
		throw systemError(koffi.errno(), "execve", file);
	};
	return cachedExecve;
}
//#endregion
//#region lib/types/runner-protocol.js
/** Closed private transports shared by the native subprocess runner. */
function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function hasExactKeys(value, required, optional = []) {
	const allowed = new Set([...required, ...optional]);
	return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key));
}
function isStringRecord(value) {
	return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}
function isSerializedRunnerError(value) {
	if (!isRecord(value) || !hasExactKeys(value, ["name", "message"], [
		"code",
		"syscall",
		"path"
	])) return false;
	return typeof value.name === "string" && typeof value.message === "string" && (value.code === void 0 || typeof value.code === "string") && (value.syscall === void 0 || typeof value.syscall === "string") && (value.path === void 0 || typeof value.path === "string");
}
function parseErrorResult(value) {
	if (!hasExactKeys(value, ["type", "error"]) || !isSerializedRunnerError(value.error)) throw new Error("subprocess runner emitted an invalid error result");
	if (value.type !== "error") throw new Error("subprocess runner emitted an unknown error result");
	return {
		type: "error",
		error: value.error
	};
}
/**
* Create a private 0700 directory and one complete 0600 launch request.
* @param request - target cwd and complete environment for the bootstrap.
* @returns private paths owned by this launch.
*/
function createLinuxLaunchFiles(request) {
	const directory = mkdtempSync(join(tmpdir(), "dsh-subprocess-launch-"));
	const files = {
		directory,
		requestPath: join(directory, "launch-request.json"),
		startupErrorPath: join(directory, "startup-error.json")
	};
	try {
		chmodSync(directory, 448);
		writeFileSync(files.requestPath, JSON.stringify(request), {
			flag: "wx",
			mode: 384
		});
		return files;
	} catch (error) {
		cleanupLinuxLaunchFiles(files);
		throw error;
	}
}
/**
* Derive the only permitted startup-error path from an absolute request locator.
* @param requestPath - absolute path to the private launch-request file.
* @returns validated sibling paths for this launch.
*/
function linuxLaunchFilesFromLocator(requestPath) {
	if (!isAbsolute(requestPath) || basename(requestPath) !== "launch-request.json") throw new Error("subprocess runner received an invalid Linux launch-request locator");
	const directory = dirname(requestPath);
	return {
		directory,
		requestPath,
		startupErrorPath: join(directory, "startup-error.json")
	};
}
/**
* Strictly read and remove a one-shot Linux launch request.
* @param requestPath - private launch-request path to consume.
* @returns validated target cwd and environment.
*/
function consumeLinuxLaunchRequest(requestPath) {
	const text = readFileSync(requestPath, "utf8");
	unlinkSync(requestPath);
	const value = JSON.parse(text);
	if (!isRecord(value) || !hasExactKeys(value, ["cwd", "env"]) || typeof value.cwd !== "string" || !isStringRecord(value.env)) throw new Error("subprocess runner received an invalid Linux launch request");
	return {
		cwd: value.cwd,
		env: value.env
	};
}
/**
* Publish one strict 0600 Linux pre-exec error.
* @param files - private paths for this launch.
* @param error - bounded spawn or runner failure to publish.
*/
function writeLinuxStartupError(files, error) {
	writeFileSync(files.startupErrorPath, JSON.stringify(error), {
		flag: "wx",
		mode: 384
	});
}
/**
* Read the Linux pre-exec error, if the bootstrap published one.
* @param path - expected startup-error path.
* @returns the validated failure, or undefined when none was published.
*/
function readLinuxStartupError(path) {
	if (!existsSync(path)) return void 0;
	const value = JSON.parse(readFileSync(path, "utf8"));
	if (!isRecord(value)) throw new Error("subprocess runner emitted an invalid startup error");
	return parseErrorResult(value);
}
/**
* Strictly parse the single Windows start message.
* @param value - untrusted IPC payload.
* @returns validated target start request.
*/
function parseWindowsStartRequest(value) {
	if (!isRecord(value) || !hasExactKeys(value, [
		"type",
		"cwd",
		"env"
	]) || value.type !== "start" || typeof value.cwd !== "string" || !isStringRecord(value.env)) throw new Error("subprocess runner received an invalid Windows start request");
	return {
		type: "start",
		cwd: value.cwd,
		env: value.env
	};
}
/**
* Return true only for the exact, payload-free Windows terminate control.
* @param value - untrusted IPC payload.
* @returns whether the payload is the exact terminate request.
*/
function isWindowsTerminateRequest(value) {
	return isRecord(value) && hasExactKeys(value, ["type"]) && value.type === "terminate";
}
/**
* Strictly parse one of the two Windows direct-result branches.
* @param value - untrusted IPC payload.
* @returns validated direct-result message.
*/
function parseWindowsRunnerResult(value) {
	if (!isRecord(value) || typeof value.type !== "string") throw new Error("subprocess runner emitted an invalid Windows result");
	if (value.type === "error") return parseErrorResult(value);
	if (value.type === "target-exit") {
		const validExitCode = typeof value.exitCode === "number" && Number.isSafeInteger(value.exitCode) && value.exitCode >= 0;
		if (!hasExactKeys(value, ["type", "exitCode"]) || !validExitCode) throw new Error("subprocess runner emitted an invalid target-exit result");
		return {
			type: "target-exit",
			exitCode: value.exitCode
		};
	}
	throw new Error(`subprocess runner emitted an unknown Windows result: ${value.type}`);
}
/**
* Convert an unknown failure into the bounded cross-process error record.
* @param error - failure caught at the process boundary.
* @returns bounded serializable error fields.
*/
function serializeRunnerError(error) {
	const source = error instanceof Error ? error : new Error(String(error));
	const node = source;
	return {
		name: source.name,
		message: source.message,
		...typeof node.code === "string" ? { code: node.code } : {},
		...typeof node.syscall === "string" ? { syscall: node.syscall } : {},
		...typeof node.path === "string" ? { path: node.path } : {}
	};
}
/**
* Rebuild a Node-shaped Error from a strict runner record.
* @param serialized - validated bounded error fields.
* @returns reconstructed Error with supported Node fields.
*/
function deserializeRunnerError(serialized) {
	const error = new Error(serialized.message);
	error.name = serialized.name;
	return Object.assign(error, {
		...serialized.code === void 0 ? {} : { code: serialized.code },
		...serialized.syscall === void 0 ? {} : { syscall: serialized.syscall },
		...serialized.path === void 0 ? {} : { path: serialized.path }
	});
}
/**
* Best-effort removal of only the private paths created for this Linux spawn.
* @param files - exact private paths owned by this launch.
*/
function cleanupLinuxLaunchFiles(files) {
	try {
		if (lstatSync(files.directory).isSymbolicLink()) {
			unlinkSync(files.directory);
			return;
		}
		for (const path of [files.requestPath, files.startupErrorPath]) try {
			unlinkSync(path);
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
		rmdirSync(files.directory);
	} catch {}
}
//#endregion
//#region lib/types/runner-launch.js
/** Parent-side invocation and bootstrap state for the private native runner. */
/** The one private environment variable consumed before target state is restored. */
const SUBPROCESS_RUNNER_ENV = "DSH_SUBPROCESS_RUNNER";
/** Sentinel used by the packaged bootstrap for the Windows IPC runner. */
const WINDOWS_RUNNER_SELECTION = "windows";
const SOURCE_TSCONFIG_PATH = fileURLToPath(new URL("../../../../tsconfig.base.json", import.meta.url));
const RUNNER_CONTROL_ENV_PREFIXES = ["NODE_", "TSX_"];
/**
* Resolve the source, built, or packaged entry that calls the same runner core.
* @returns executable and arguments for the active runtime form.
*/
function spawnRunnerInvocation() {
	if ("pkg" in process) return [process.execPath];
	/* v8 ignore next -- built-artifact smoke imports the emitted JavaScript runner entry;
	* source-unit coverage cannot change import.meta.url. */
	if (extname(fileURLToPath(import.meta.url)) !== ".ts") return [process.execPath, fileURLToPath(import.meta.resolve("@deepseek-ai/dsh-subprocess-local/runner"))];
	return [
		process.execPath,
		"--import",
		import.meta.resolve("tsx/esm"),
		fileURLToPath(new URL("./bin.ts", import.meta.url))
	];
}
/**
* Check the concrete runner executable and entry paths without executing a probe mode.
* @param invocation - resolved executable and runner-entry arguments.
* @returns whether every concrete executable or entry path is accessible.
*/
function runnerInvocationAvailable(invocation = spawnRunnerInvocation()) {
	try {
		if (isAbsolute(invocation[0])) accessSync(invocation[0], constants.X_OK);
		const entry = invocation.at(-1);
		if (entry !== void 0 && entry !== invocation[0] && isAbsolute(entry)) accessSync(entry, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}
/**
* Build the bootstrap-safe environment; target overrides arrive through request/IPC.
* @param selection - private runner selector or Linux launch-request locator.
* @param invocation - resolved runner invocation whose source form needs the workspace paths map.
* @returns environment for the runner before target state is restored.
*/
function runnerEnvironment(selection, invocation) {
	const entry = invocation?.at(-1);
	const env = childEnv();
	for (const name of Object.keys(env)) {
		const normalized = name.toUpperCase();
		if (RUNNER_CONTROL_ENV_PREFIXES.some((prefix) => normalized.startsWith(prefix))) Reflect.deleteProperty(env, name);
	}
	return {
		...env,
		[SUBPROCESS_RUNNER_ENV]: selection,
		SYSTEMD_LOG_TARGET: "null",
		...entry?.endsWith(".ts") === true ? { TSX_TSCONFIG_PATH: SOURCE_TSCONFIG_PATH } : {}
	};
}
/**
* Read and delete the private selector before importing or restoring target state.
* @param env - mutable environment containing the private selector.
* @returns the consumed selector, or undefined when no runner was requested.
*/
function consumeRunnerSelection(env = process.env) {
	const selection = env[SUBPROCESS_RUNNER_ENV];
	Reflect.deleteProperty(env, SUBPROCESS_RUNNER_ENV);
	return selection;
}
/**
* Require the private argv delimiter and at least one target argv entry.
* @param argv - private runner arguments.
* @returns copied target argv after the private delimiter.
*/
function parseRunnerTargetArgv(argv) {
	if (argv[0] !== "--" || argv.length < 2) throw new Error("subprocess runner requires target argv after a private -- delimiter");
	return [...argv.slice(1)];
}
/**
* Build direct Linux target stdio, or isolated Windows runner stdio with IPC
* on fd 3 and target carriers on fd 4 through fd 6.
* @param spec - ordinary subprocess request whose stdio modes are preserved.
* @param ipc - whether to isolate the runner and add its private Node IPC descriptor.
* @param stdinCarrier - runner fd 4 carrier; Windows ignore passes an opened null-device fd.
* @returns child-process stdio options for the runner.
*/
function runnerStdio(spec, ipc, stdinCarrier = "pipe") {
	const targetStdio = [
		spec.stdio.stdin === "ignore" ? "ignore" : "pipe",
		spec.stdio.stdout === "inherit" ? "inherit" : "pipe",
		spec.stdio.stderr === "inherit" ? "inherit" : "pipe"
	];
	if (!ipc) return targetStdio;
	return [
		"ignore",
		"ignore",
		"ignore",
		"ipc",
		stdinCarrier,
		spec.stdio.stdout === "inherit" ? 1 : "pipe",
		spec.stdio.stderr === "inherit" ? 2 : "pipe"
	];
}
function windowsEnvironmentValue(env, name) {
	for (const key of Object.keys(env).sort()) if (key.toUpperCase() === name) return env[key];
}
function executableCandidateExists(candidate) {
	try {
		return !statSync(candidate).isDirectory();
	} catch {
		try {
			const entry = lstatSync(candidate);
			return entry.isFile() || entry.isSymbolicLink();
		} catch {
			return false;
		}
	}
}
function windowsPathDirectories(path) {
	const directories = [];
	let start = 0;
	while (start < path.length) {
		if (path.charAt(start) === ";") {
			start += 1;
			continue;
		}
		const quote = path.charAt(start);
		const quoted = quote === "\"" || quote === "'";
		const quoteEnd = quoted ? path.indexOf(quote, start + 1) : -1;
		const separator = path.indexOf(";", quoted ? quoteEnd < 0 ? path.length : quoteEnd : start);
		const end = separator < 0 ? path.length : separator;
		let directory = path.slice(start, end);
		if (directory.startsWith("\"") || directory.startsWith("'")) directory = directory.slice(1);
		if (directory.endsWith("\"") || directory.endsWith("'")) directory = directory.slice(0, -1);
		if (directory.length > 0) directories.push(directory);
		start = end + 1;
	}
	return directories;
}
function windowsFileNameStart(command) {
	let start = command.length;
	while (start > 0 && !/[\\/:]/u.test(command.charAt(start - 1))) start -= 1;
	return start;
}
function windowsSearchPathJoin(directory, name, cwd) {
	let prefix = cwd;
	let adjustedDirectory = directory;
	const slash = (value) => value === "\\" || value === "/";
	if (directory.length > 2 && slash(directory.charAt(0)) && slash(directory.charAt(1))) prefix = "";
	else if (directory.length >= 1 && slash(directory.charAt(0))) prefix = cwd.slice(0, 2);
	else if (directory.length >= 2 && directory.charAt(1) === ":" && (directory.length < 3 || !slash(directory.charAt(2)))) if (cwd.length < 2 || cwd.slice(0, 2).toLowerCase() !== directory.slice(0, 2).toLowerCase()) prefix = "";
	else adjustedDirectory = directory.slice(2);
	else if (directory.length > 2 && directory.charAt(1) === ":") prefix = "";
	const append = (base, part) => {
		if (base.length === 0 || part.length === 0) return base + part;
		return /[\\/:]$/u.test(base) ? base + part : `${base}\\${part}`;
	};
	return append(append(prefix, adjustedDirectory), name);
}
function windowsExecutableNames(command, name) {
	const dot = name.indexOf(".");
	const hasExtension = dot >= 0 && dot < name.length - 1;
	const separator = name.endsWith(".") ? "" : ".";
	return [
		...hasExtension ? [command] : [],
		`${command}${separator}com`,
		`${command}${separator}exe`
	];
}
/**
* Resolve the executable path with libuv/Node Windows spawn search order while
* preserving the caller's original command-line argv entry separately.
* @param command - original target argv[0].
* @param cwd - final target working directory used for relative search roots.
* @param env - final target environment containing the child PATH.
* @param exists - injectable non-directory candidate probe used by tests.
* @param currentEnv - runner environment supplying PATH fallback and cwd-search policy.
* @returns a resolved application name suitable for `CreateProcessW`, or undefined when no candidate exists.
*/
function resolveWindowsExecutable(command, cwd, env, exists = executableCandidateExists, currentEnv = process.env) {
	const nameStart = windowsFileNameStart(command);
	const directory = command.slice(0, nameStart);
	const name = command.slice(nameStart);
	const hasPath = nameStart !== 0;
	const roots = [];
	if (hasPath) roots.push(directory);
	else {
		if (windowsEnvironmentValue(currentEnv, "NODEFAULTCURRENTDIRECTORYINEXEPATH") === void 0) roots.push("");
		const path = windowsEnvironmentValue(env, "PATH") ?? windowsEnvironmentValue(currentEnv, "PATH") ?? "";
		roots.push(...windowsPathDirectories(path));
	}
	for (const root of roots) {
		const base = windowsSearchPathJoin(root, name, cwd);
		for (const candidate of windowsExecutableNames(base, name)) if (exists(candidate)) return candidate;
	}
}
function throwNullByteError(property, value, argument) {
	const subject = argument ? `The argument '${property}'` : `The property '${property}'`;
	const error = /* @__PURE__ */ new TypeError(`${subject} must be a string without null bytes. Received ${inspect(value)}`);
	Object.assign(error, { code: "ERR_INVALID_ARG_VALUE" });
	throw error;
}
function validateNoNullByte(property, value, argument = false) {
	if (value.includes("\0")) throwNullByteError(property, value, argument);
}
/**
* Materialize and synchronously validate the final target environment.
* @param spec - final target argv, cwd, and environment overrides.
* @returns complete target environment after Node-equivalent validation.
*/
function targetEnvironment(spec) {
	spec.argv.forEach((value, index) => {
		validateNoNullByte(index === 0 ? "file" : `args[${String(index - 1)}]`, value, true);
	});
	validateNoNullByte("options.cwd", spec.cwd);
	const env = Object.fromEntries(Object.entries(childEnv(spec.env)).filter((entry) => entry[1] !== void 0));
	for (const [key, value] of Object.entries(env)) {
		validateNoNullByte(`options.env['${key}']`, key);
		validateNoNullByte(`options.env['${key}']`, value);
	}
	return env;
}
//#endregion
export { bindManagedProcess as C, validateSubprocessSpec as D, spawnSubprocess as E, createProcessInspector as O, loadLinuxExecve as S, prepareManagedProcessBinding as T, parseWindowsRunnerResult as _, resolveWindowsExecutable as a, serializeRunnerError as b, runnerStdio as c, cleanupLinuxLaunchFiles as d, consumeLinuxLaunchRequest as f, linuxLaunchFilesFromLocator as g, isWindowsTerminateRequest as h, parseRunnerTargetArgv as i, spawnRunnerInvocation as l, deserializeRunnerError as m, WINDOWS_RUNNER_SELECTION as n, runnerEnvironment as o, createLinuxLaunchFiles as p, consumeRunnerSelection as r, runnerInvocationAvailable as s, SUBPROCESS_RUNNER_ENV as t, targetEnvironment as u, parseWindowsStartRequest as v, childEnv as w, writeLinuxStartupError as x, readLinuxStartupError as y };

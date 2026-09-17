import { DirectoryPicker } from "@deepseek-ai/dsh-host-directory-picker";
import { runNativeCommand } from "@deepseek-ai/dsh-native-command";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
//#region lib/types/win32-dialog-bindings.js
const WM_CLOSE = 16;
/**
* Encode a canonical GUID string as its 16 little-endian bytes.
* @param text - the `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` form.
* @returns the in-memory GUID bytes CoCreateInstance expects.
*/
function guidBytes(text) {
	const match = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.exec(text);
	const bytes = Buffer.alloc(16);
	bytes.writeUInt32LE(parseInt(match[1], 16), 0);
	bytes.writeUInt16LE(parseInt(match[2], 16), 4);
	bytes.writeUInt16LE(parseInt(match[3], 16), 6);
	Buffer.from(match[4] + match[5], "hex").copy(bytes, 8);
	return bytes;
}
guidBytes("dc1c5a9c-e88a-4dde-a5a1-60f82a20aef7");
guidBytes("d57c7288-d4ad-4768-be02-9d969532d960");
/**
* Post `WM_CLOSE` to every window of a native thread — the driver's abort
* lever against the worker blocked inside `Show`, after which `Show` returns
* `HRESULT_CANCELLED` and the worker unwinds normally.
* @param threadId - the dialog thread's native id (from the `showing` notice).
*/
async function closeThreadWindows(threadId) {
	const koffi = (await import("koffi")).default;
	const user32 = koffi.load("user32.dll");
	const enumThreadWindows = user32.func("__stdcall", "EnumThreadWindows", "int", [
		"uint32",
		"void *",
		"intptr"
	]);
	const postMessageW = user32.func("__stdcall", "PostMessageW", "int", [
		"void *",
		"uint32",
		"uintptr",
		"intptr"
	]);
	const protoEnumProc = koffi.proto("int __stdcall DshEnumThreadWndProc(void *hwnd, intptr lparam)");
	const callback = koffi.register((hwnd) => {
		postMessageW(hwnd, WM_CLOSE, 0, 0);
		return 1;
	}, koffi.pointer(protoEnumProc));
	try {
		enumThreadWindows(threadId, callback, 0);
	} finally {
		koffi.unregister(callback);
	}
}
//#endregion
//#region lib/types/win32-dialog-host.js
/**
* Real-process half of the Win32 dialog driver: spawn the dialog child
* process (source or built plane) and close a dialog thread's windows. The
* module itself loads everywhere (the import chain from native-picker.ts is
* static); what stays win32-only is koffi, imported dynamically inside the
* bindings' functions. The driver's logic is tested against fakes of this
* surface instead.
*/
/**
* Spawn the dialog child process. Built consumers launch the bundled CJS
* entry next to this module under plain node; unbuilt (source) consumers
* bootstrap tsx first, mirroring the dsh CLI's source launch. The child
* opens its dialog as foreground on its own: `runFolderDialog` synthesizes
* an Alt press before `Show`, which matters when a background host spawned
* the child.
* @param data - the child payload (dialog title).
* @returns the spawned child process.
*/
function spawnDialogWorker(data) {
	const env = {
		...process.env,
		DSH_DIALOG_TITLE: data.title
	};
	const stdio = [
		"ignore",
		"inherit",
		"inherit",
		"ipc"
	];
	/* v8 ignore next 3 -- the built-output arm: tests always run unbuilt (src/) */
	if (!import.meta.url.endsWith(".ts")) return spawn(process.execPath, [fileURLToPath(new URL("./worker.cjs", import.meta.url))], {
		env,
		stdio,
		windowsHide: true
	});
	return spawn(process.execPath, [
		"--import",
		import.meta.resolve("tsx/esm"),
		fileURLToPath(new URL("./win32-dialog-worker.ts", import.meta.url))
	], {
		env,
		stdio,
		windowsHide: true
	});
}
//#endregion
//#region lib/types/win32-dialog.js
/**
* Main-thread driver for the Win32 folder dialog: spawns the dialog child
* process (which blocks inside the modal `Show`), maps its message protocol
* onto a promise, and services aborts by posting `WM_CLOSE` to the dialog
* thread's windows until the child reports back. The real process/window
* surface is injectable so every driver path is testable on any platform.
*/
/** The dialog title every host shows. */
const DIALOG_TITLE = "Select Workspace Directory";
/** `WM_CLOSE` re-post cadence while an abort waits for the worker to unwind. */
const CLOSE_RETRY_MS = 150;
/** Abort-service attempts before force-terminating the worker. */
const CLOSE_MAX_ATTEMPTS = 20;
/** Fail loudly if the closed worker-to-driver union gains an unhandled member. */
/* v8 ignore start -- closed-union backstop; unreachable without a TypeScript contract violation */
function assertNever(value) {
	throw new TypeError(`unknown win32 dialog worker message kind: ${String(value)}`);
}
/* v8 ignore stop */
/**
* Open the modern Win32 folder picker off the event loop.
* @param signal - caller lifetime; abort closes the dialog and rejects.
* @param internals - Worker/window hooks for deterministic tests.
* @returns the selected path, or null when the user cancels.
*/
async function pickWin32Directory(signal, internals = {}) {
	if (signal.aborted) throw new Error("native directory picker aborted");
	const spawnWorker = internals.spawnWorker ?? spawnDialogWorker;
	const closeWindows = internals.closeThreadWindows ?? closeThreadWindows;
	const closeRetryMs = internals.closeRetryMs ?? CLOSE_RETRY_MS;
	const worker = spawnWorker({ title: DIALOG_TITLE });
	let dialogThreadId;
	let closeTimer;
	let settled = false;
	return await new Promise((resolve, reject) => {
		const settle = (outcome) => {
			if (settled) return;
			settled = true;
			if (closeTimer !== void 0) clearInterval(closeTimer);
			signal.removeEventListener("abort", onAbort);
			worker.unref?.();
			outcome();
		};
		const postClose = () => {
			if (dialogThreadId !== void 0) closeWindows(dialogThreadId).catch(() => void 0);
		};
		const serviceAbort = () => {
			let attempts = 0;
			closeTimer = setInterval(() => {
				attempts += 1;
				if (attempts > CLOSE_MAX_ATTEMPTS) {
					settle(() => {
						worker.kill();
						reject(/* @__PURE__ */ new Error("native directory picker aborted (dialog unresponsive; worker killed)"));
					});
					return;
				}
				postClose();
			}, closeRetryMs);
			postClose();
		};
		const onAbort = () => {
			serviceAbort();
		};
		signal.addEventListener("abort", onAbort, { once: true });
		worker.on("message", (message) => {
			switch (message.kind) {
				case "showing":
					dialogThreadId = message.threadId;
					if (signal.aborted) postClose();
					return;
				case "done":
					settle(() => {
						if (signal.aborted) reject(/* @__PURE__ */ new Error("native directory picker aborted"));
						else resolve(message.path);
					});
					return;
				case "error":
					settle(() => {
						reject(/* @__PURE__ */ new Error(`win32 folder dialog failed: ${message.message}`));
					});
					return;
				/* v8 ignore next 2 -- closed worker-owned union; a fourth kind becomes a compile error */
				default: assertNever(message);
			}
		});
		worker.on("error", (error) => {
			settle(() => {
				reject(error);
			});
		});
		worker.on("exit", () => {
			settle(() => {
				reject(/* @__PURE__ */ new Error("win32 folder dialog worker exited before reporting a result"));
			});
		});
	});
}
//#endregion
//#region lib/types/native-picker.js
/** Cross-platform native single-directory chooser behind the native backend's capability. */
function outputPath(stdout) {
	const path = stdout.replace(/[\r\n]+$/, "");
	return path === "" ? null : path;
}
function errorCode(error) {
	if (typeof error !== "object" || error === null || !("code" in error)) return void 0;
	const code = error.code;
	return typeof code === "string" || typeof code === "number" ? code : void 0;
}
function errorStderr(error) {
	if (typeof error !== "object" || error === null || !("stderr" in error)) return "";
	const stderr = error.stderr;
	return typeof stderr === "string" ? stderr : "";
}
function isMissingCommand(error) {
	return errorCode(error) === "ENOENT";
}
function rethrowIfAborted(signal, error) {
	if (signal.aborted) throw error;
}
/**
* Open the platform directory picker.
* @param signal - caller/connection lifetime; abort terminates the native command.
* @param internals - Platform and runner hooks for deterministic tests.
* @returns the selected path, or null when the user cancels.
*/
async function pickNativeDirectory(signal, internals = {}) {
	const platform = internals.platform ?? process.platform;
	const run = internals.run ?? runNativeCommand;
	if (platform === "darwin") try {
		return outputPath((await run("osascript", [
			"-e",
			"set selectedFolder to choose folder with prompt \"Select Workspace Directory\"",
			"-e",
			"POSIX path of selectedFolder"
		], signal)).stdout);
	} catch (error) {
		if (!signal.aborted && errorCode(error) === 1 && /(?:User canceled|-128)/i.test(errorStderr(error))) return null;
		throw error;
	}
	if (platform === "win32") return await (internals.pickWin32Dialog ?? pickWin32Directory)(signal);
	if (platform === "linux") {
		try {
			return outputPath((await run("zenity", [
				"--file-selection",
				"--directory",
				"--title=Select Workspace Directory"
			], signal)).stdout);
		} catch (error) {
			rethrowIfAborted(signal, error);
			if (errorCode(error) === 1) return null;
			if (!isMissingCommand(error)) throw error;
		}
		try {
			return outputPath((await run("kdialog", [
				"--getexistingdirectory",
				".",
				"--title",
				"Select Workspace Directory"
			], signal)).stdout);
		} catch (error) {
			rethrowIfAborted(signal, error);
			if (errorCode(error) === 1) return null;
			if (isMissingCommand(error)) throw new Error("no supported native directory picker found (install zenity or kdialog)");
			throw error;
		}
	}
	throw new Error(`native directory picker is unsupported on ${platform}`);
}
//#endregion
//#region lib/types/index.js
/**
* Native backend of the directory-picker seam: registers `ctx.directoryPicker`
* with the `native` capability, opening one native OS chooser on the host
* display per pick (macOS `osascript`, Linux Zenity with a KDialog fallback;
* Windows opens the modern `IFileOpenDialog` in a spawned child process — a
* koffi-driven COM conversation on the child's main thread, preceded by a
* synthesized Alt press so the dialog activates as foreground even when a
* background host spawned the child). Only viable when
* the operator sits at the host's screen; remote deployments compose the
* browse backend instead.
* @module @deepseek-ai/dsh-host-directory-picker-native
*/
/** The `ctx.directoryPicker` native implementation (stable capability object per service life). */
var NativeDirectoryPicker = class extends DirectoryPicker {
	nativeCapability = {
		kind: "native",
		/* v8 ignore next -- pure forward to pickNativeDirectory (its spec owns behavior); invoking here opens a real chooser. */
		pick: (signal) => pickNativeDirectory(signal)
	};
	/**
	* The native interaction capability.
	* @returns the stable `native` capability object.
	*/
	capability() {
		return this.nativeCapability;
	}
};
//#endregion
export { NativeDirectoryPicker as default, pickNativeDirectory };

//#region lib/types/win32-dialog-bindings.js
/**
* koffi-backed Win32 bindings for the folder dialog: the COM vtable calls
* behind {@link Win32DialogBindings} plus the cross-thread window closer the
* driver uses to service aborts. The module loads on every platform; koffi
* itself is imported lazily inside each function, so non-Windows processes
* never load it — the same containment as the repo's other `win32.ts`
* modules.
*
* The COM surface used here (IModalWindow/IFileDialog/IFileOpenDialog and
* IShellItem vtable order, the GUIDs, `FOS_*` and `SIGDN_FILESYSPATH`) is
* frozen Windows ABI since Vista; slots are offsets into the vtable at the
* object's first pointer.
*/
/**
* Read a valid NUL-terminated UTF-16 allocation without an external buffer.
* Generic `koffi.decode(..., 'str16')` expects a pointer variable, so the
* buffer holds the string address rather than the string bytes.
* @param koffi - the loaded koffi binding.
* @param address - the string address surfaced by the `_Out_ void **` param.
* @param pointerSize - the process's pointer width (`koffi.sizeof('void *')`).
* @returns the decoded UTF-16 path.
*/
function readUtf16(koffi, address, pointerSize) {
	const pointer = Buffer.alloc(8);
	pointer.writeBigUInt64LE(BigInt(address));
	return koffi.decode(pointer.subarray(0, pointerSize), "str16");
}
const COINIT_APARTMENTTHREADED = 2;
const CLSCTX_INPROC_SERVER = 1;
const SIGDN_FILESYSPATH = -2147123200;
/**
* Thread DPI awareness contexts, best first: per-monitor-v2 (Windows 10
* 1703+), per-monitor (1607+), then system-aware. `SetThreadDpiAwarenessContext`
* returns NULL for an unsupported context instead of throwing, so the caller
* cascades to the best one the host accepts; DPI stays a cosmetic
* best-effort — an unsupported host still gets the modern dialog.
*/
const DPI_AWARENESS_CONTEXTS = [
	-4,
	-3,
	-2
];
/** `VK_MENU`: the synthesized Alt press's virtual key. */
const VK_MENU = 18;
/** `KEYEVENTF_KEYUP`: the synthesized Alt press's release flag. */
const KEYEVENTF_KEYUP = 2;
/** IFileOpenDialog vtable slots (IUnknown 0-2, IModalWindow 3, IFileDialog 4+). */
const SLOT_RELEASE = 2;
const SLOT_SHOW = 3;
const SLOT_SET_OPTIONS = 9;
const SLOT_SET_TITLE = 17;
const SLOT_GET_RESULT = 20;
/** IShellItem vtable slot for `GetDisplayName`. */
const SLOT_GET_DISPLAY_NAME = 5;
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
const CLSID_FILE_OPEN_DIALOG = guidBytes("dc1c5a9c-e88a-4dde-a5a1-60f82a20aef7");
const IID_IFILE_OPEN_DIALOG = guidBytes("d57c7288-d4ad-4768-be02-9d969532d960");
/**
* Load koffi and expose the dialog bindings for this thread.
* @returns the bindings {@link runFolderDialog} sequences against.
*/
async function loadWin32DialogBindings() {
	const koffi = (await import("koffi")).default;
	const ole32 = koffi.load("ole32.dll");
	const user32 = koffi.load("user32.dll");
	const kernel32 = koffi.load("kernel32.dll");
	const pointerSize = koffi.sizeof("void *");
	const coInitializeEx = ole32.func("__stdcall", "CoInitializeEx", "int32", ["void *", "uint32"]);
	const coUninitialize = ole32.func("__stdcall", "CoUninitialize", "void", []);
	const coCreateInstance = ole32.func("__stdcall", "CoCreateInstance", "int32", [
		"void *",
		"void *",
		"uint32",
		"void *",
		"void *"
	]);
	const coTaskMemFree = ole32.func("__stdcall", "CoTaskMemFree", "void", ["void *"]);
	const getCurrentThreadId = kernel32.func("__stdcall", "GetCurrentThreadId", "uint32", []);
	const keybdEvent = user32.func("__stdcall", "keybd_event", "void", [
		"uint8",
		"uint8",
		"uint32",
		"uintptr"
	]);
	const protoShow = koffi.proto("int32 __stdcall DshDialogShow(void *self, void *owner)");
	const protoSetOptions = koffi.proto("int32 __stdcall DshDialogSetOptions(void *self, uint32 options)");
	const protoSetTitle = koffi.proto("int32 __stdcall DshDialogSetTitle(void *self, str16 title)");
	const protoGetResult = koffi.proto("int32 __stdcall DshDialogGetResult(void *self, _Out_ void **item)");
	const protoGetDisplayName = koffi.proto("int32 __stdcall DshItemGetDisplayName(void *self, int32 form, _Out_ void **name)");
	const protoRelease = koffi.proto("uint32 __stdcall DshComRelease(void *self)");
	/** Bind vtable slot `slot` of COM object `self` to a caller through `proto`. */
	const method = (self, slot, proto) => {
		const vtable = koffi.decode(self, "void *");
		const fn = koffi.decode(vtable, slot * pointerSize, "void *");
		return (...args) => koffi.call(fn, proto, self, ...args);
	};
	return {
		setThreadDpiAwareness: () => {
			let setContext;
			try {
				setContext = user32.func("__stdcall", "SetThreadDpiAwarenessContext", "void *", ["intptr"]);
			} catch {
				return;
			}
			for (const context of DPI_AWARENESS_CONTEXTS) if (setContext(context) !== null) return;
		},
		coInitializeSta: () => coInitializeEx(null, COINIT_APARTMENTTHREADED),
		coUninitialize: () => {
			coUninitialize();
		},
		currentThreadId: () => getCurrentThreadId(),
		pressAltForForeground: () => {
			keybdEvent(VK_MENU, 0, 0, 0);
			keybdEvent(VK_MENU, 0, KEYEVENTF_KEYUP, 0);
		},
		createFolderDialog: () => {
			const out = Buffer.alloc(pointerSize);
			const created = coCreateInstance(CLSID_FILE_OPEN_DIALOG, null, CLSCTX_INPROC_SERVER, IID_IFILE_OPEN_DIALOG, out);
			if (created < 0) throw new Error(`CoCreateInstance(FileOpenDialog) failed: HRESULT 0x${(created >>> 0).toString(16)}`);
			const dialog = koffi.decode(out, "void *");
			return {
				setOptions: (options) => method(dialog, SLOT_SET_OPTIONS, protoSetOptions)(options),
				setTitle: (title) => method(dialog, SLOT_SET_TITLE, protoSetTitle)(title),
				show: () => method(dialog, SLOT_SHOW, protoShow)(null),
				resultPath: () => {
					const itemOut = [null];
					const gotItem = method(dialog, SLOT_GET_RESULT, protoGetResult)(itemOut);
					if (gotItem < 0) return { hr: gotItem };
					const item = itemOut[0];
					try {
						const nameOut = [null];
						const gotName = method(item, SLOT_GET_DISPLAY_NAME, protoGetDisplayName)(SIGDN_FILESYSPATH, nameOut);
						if (gotName < 0) return { hr: gotName };
						const path = readUtf16(koffi, nameOut[0], pointerSize);
						coTaskMemFree(nameOut[0]);
						return {
							hr: gotName,
							path
						};
					} finally {
						method(item, SLOT_RELEASE, protoRelease)();
					}
				},
				release: () => {
					method(dialog, SLOT_RELEASE, protoRelease)();
				}
			};
		}
	};
}
/**
* Throw when an HRESULT signals failure.
* @param hr - the HRESULT to check.
* @param what - the failing call's name for the error message.
* @returns the (successful) HRESULT unchanged.
*/
function check(hr, what) {
	if (hr < 0) throw new Error(`${what} failed: HRESULT 0x${(hr >>> 0).toString(16)}`);
	return hr;
}
/**
* Run one modal folder-picker conversation on the calling thread: DPI opt-in,
* STA init, dialog creation, `Show`, and result extraction, releasing the
* dialog on every path.
* @param bindings - the native surface (koffi-backed in production, fakes in tests).
* @param title - the dialog title text.
* @param onShowing - called with the native thread id immediately before the
*   blocking `Show`, so a driver on another thread can close the dialog.
* @returns the selected filesystem path, or null when the user cancels.
*/
function runFolderDialog(bindings, title, onShowing) {
	bindings.setThreadDpiAwareness();
	check(bindings.coInitializeSta(), "CoInitializeEx");
	try {
		const dialog = bindings.createFolderDialog();
		try {
			check(dialog.setOptions(104), "SetOptions");
			check(dialog.setTitle(title), "SetTitle");
			onShowing(bindings.currentThreadId());
			bindings.pressAltForForeground();
			const shown = dialog.show();
			if (shown === -2147023673) return null;
			check(shown, "Show");
			const result = dialog.resultPath();
			check(result.hr, "GetResult");
			return result.path;
		} finally {
			dialog.release();
		}
	} finally {
		bindings.coUninitialize();
	}
}
//#endregion
//#region lib/types/win32-dialog-worker.js
/**
* Child-process entry for the Win32 folder dialog: blocks THIS process
* inside the modal `Show` so the host event loop stays live, reporting over
* the IPC channel. Spawned as a child process (not a worker thread) so a
* native fault stays contained and the modal call never wedges the host.
* A background host (the web GUI server) leaves this process without
* foreground rights, so `runFolderDialog` synthesizes an Alt press
* immediately before `Show` and the dialog then activates as foreground.
* Protocol: `{kind:'showing',threadId}` right
* before the blocking call (the driver's abort lever needs the native
* thread id), then exactly one of `{kind:'done',path}` or
* `{kind:'error',message}`.
*/
const title = process.env.DSH_DIALOG_TITLE ?? "";
if (title === "") throw new Error("win32-dialog-worker: DSH_DIALOG_TITLE is required");
if (process.send === void 0) throw new Error("win32-dialog-worker must run as a child process with an IPC channel");
const send = process.send.bind(process);
const post = (message) => {
	/* v8 ignore next 3 -- disconnect needs a live IPC channel the unit lane must not sever (built-worker.e2e.ts owns the real close path). */
	send(message, () => {
		if (process.connected) process.disconnect();
	});
};
/* v8 ignore next 3 -- the handler exits(0), which would kill the unit lane; built-worker.e2e.ts owns the real disconnect lifecycle. */
process.on("disconnect", () => process.exit(0));
(async () => {
	try {
		post({
			kind: "done",
			path: runFolderDialog(await loadWin32DialogBindings(), title, (threadId) => {
				post({
					kind: "showing",
					threadId
				});
			})
		});
	} catch (error) {
		post({
			kind: "error",
			message: error instanceof Error ? error.stack ?? error.message : String(error)
		});
	}
})();
//#endregion

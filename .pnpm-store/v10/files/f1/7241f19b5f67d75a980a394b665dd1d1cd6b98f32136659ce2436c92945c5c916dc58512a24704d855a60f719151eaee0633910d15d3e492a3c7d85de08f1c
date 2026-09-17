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
import type { Win32DialogBindings } from './win32-dialog-logic.ts';
/**
 * Load koffi and expose the dialog bindings for this thread.
 * @returns the bindings {@link runFolderDialog} sequences against.
 */
export declare function loadWin32DialogBindings(): Promise<Win32DialogBindings>;
/**
 * Post `WM_CLOSE` to every window of a native thread — the driver's abort
 * lever against the worker blocked inside `Show`, after which `Show` returns
 * `HRESULT_CANCELLED` and the worker unwinds normally.
 * @param threadId - the dialog thread's native id (from the `showing` notice).
 */
export declare function closeThreadWindows(threadId: number): Promise<void>;
//# sourceMappingURL=win32-dialog-bindings.d.ts.map
/**
 * Main-thread driver for the Win32 folder dialog: spawns the dialog child
 * process (which blocks inside the modal `Show`), maps its message protocol
 * onto a promise, and services aborts by posting `WM_CLOSE` to the dialog
 * thread's windows until the child reports back. The real process/window
 * surface is injectable so every driver path is testable on any platform.
 */
import type { Win32DialogWorkerData, Win32DialogWorkerMessage } from './win32-dialog-worker.ts';
/** The child-process surface the driver drives (satisfied by `node:child_process`). */
export interface Win32DialogWorkerLike {
    /**
     * Subscribe to a child-process event.
     * @param event - `message`, `error`, or `exit`.
     * @param listener - the event consumer.
     */
    on(event: 'message', listener: (message: Win32DialogWorkerMessage) => void): unknown;
    on(event: 'error', listener: (error: Error) => void): unknown;
    on(event: 'exit', listener: (code: number) => void): unknown;
    /**
     * Force-stop the child; the abort path's last resort when `WM_CLOSE`
     * never lands (e.g. the dialog window was never created).
     * @returns whether a kill signal was delivered.
     */
    kill(): boolean;
    /**
     * Release the event-loop reference. Called once the pick settles so a
     * child stuck in the native modal call never blocks process exit.
     */
    unref?(): void;
}
/** Injectable process surface for deterministic driver tests. */
export interface Win32DialogInternals {
    /** Replaces the real child spawn (`win32-dialog-host.ts`). */
    spawnWorker?: (data: Win32DialogWorkerData) => Win32DialogWorkerLike;
    /** Replaces the real `WM_CLOSE` poster (`win32-dialog-host.ts`). */
    closeThreadWindows?: (threadId: number) => Promise<void>;
    /** Abort-service cadence override so tests never wait wall-clock time. */
    closeRetryMs?: number;
}
/** The dialog title every host shows. */
export declare const DIALOG_TITLE = "Select Workspace Directory";
/**
 * Open the modern Win32 folder picker off the event loop.
 * @param signal - caller lifetime; abort closes the dialog and rejects.
 * @param internals - Worker/window hooks for deterministic tests.
 * @returns the selected path, or null when the user cancels.
 */
export declare function pickWin32Directory(signal: AbortSignal, internals?: Win32DialogInternals): Promise<string | null>;
//# sourceMappingURL=win32-dialog.d.ts.map
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
/** The driver-to-child payload: the dialog title (passed via env). */
export interface Win32DialogWorkerData {
    title: string;
}
/** One notice or outcome posted back to the driver. */
export type Win32DialogWorkerMessage = {
    kind: 'showing';
    threadId: number;
} | {
    kind: 'done';
    path: string | null;
} | {
    kind: 'error';
    message: string;
};
//# sourceMappingURL=win32-dialog-worker.d.ts.map
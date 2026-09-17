/**
 * Real-process half of the Win32 dialog driver: spawn the dialog child
 * process (source or built plane) and close a dialog thread's windows. The
 * module itself loads everywhere (the import chain from native-picker.ts is
 * static); what stays win32-only is koffi, imported dynamically inside the
 * bindings' functions. The driver's logic is tested against fakes of this
 * surface instead.
 */
import { spawn } from 'node:child_process';
import type { Win32DialogWorkerData } from './win32-dialog-worker.ts';
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
export declare function spawnDialogWorker(data: Win32DialogWorkerData): ReturnType<typeof spawn>;
export { closeThreadWindows } from './win32-dialog-bindings.ts';
//# sourceMappingURL=win32-dialog-host.d.ts.map
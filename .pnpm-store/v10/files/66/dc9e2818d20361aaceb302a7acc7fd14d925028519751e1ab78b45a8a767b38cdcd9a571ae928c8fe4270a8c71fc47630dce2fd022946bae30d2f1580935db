/** Typed Win32 process operations over the shared binding table. */
import type { CurrentTokenProcessBindings, NativePtr, Win32ProcessBindings } from './ffi.ts';
/**
 * Quote one argument according to CommandLineToArgvW parsing.
 * @param argument - one argv entry.
 * @returns bare or quoted command-line segment.
 */
export declare function quoteArg(argument: string): string;
/**
 * Build the mutable command line accepted by CreateProcessAsUserW.
 * @param program - executable argv entry.
 * @param args - remaining argv entries.
 * @returns joined Win32 command line.
 */
export declare function buildCommandLine(program: string, args: readonly string[]): string;
interface ProcessSpawnOptions {
    /** Executable argv entry passed through CreateProcess. */
    command: string;
    /** Arguments excluding the executable. */
    args: readonly string[];
    /** Existing child working directory. */
    cwd: string;
}
/** Ordinary process creation inputs used by the local Win32 runner. */
export interface CurrentTokenProcessSpawnOptions extends ProcessSpawnOptions {
    /** Resolved executable path passed separately from the preserved argv entry. */
    applicationName: string;
    /** Complete target environment passed without mutating the runner. */
    env: Readonly<Record<string, string>>;
    /** Runner CRT descriptors carrying target stdin, stdout, and stderr. */
    stdio: CurrentTokenStdioFileDescriptors;
}
/** Runner CRT descriptors whose OS handles become the target standard handles. */
export interface CurrentTokenStdioFileDescriptors {
    stdin: number;
    stdout: number;
    stderr: number;
}
/** Restricted-token process creation inputs owned by the Windows ACL sandbox. */
export interface RestrictedProcessSpawnOptions extends ProcessSpawnOptions {
    /** Restricted primary token supplied by sandbox policy. */
    token: NativePtr;
}
/** Piped child resources whose process and read handles remain caller-owned. */
export interface SpawnedPipedProcess {
    /** Direct child process id. */
    pid: number;
    /** Process handle closed by waitForProcessExit. */
    process: NativePtr;
    /** Stdout pipe read end closed by drainPipe. */
    stdoutRead: NativePtr;
    /** Stderr pipe read end closed by drainPipe. */
    stderrRead: NativePtr;
}
/** Suspended child assigned to one caller-owned kill-on-close Job before resume. */
export interface SpawnedJobProcess {
    /** Direct child process id. */
    pid: number;
    /** Process handle closed by waitForProcessExit. */
    process: NativePtr;
    /** Job handle closed by the lifecycle owner. */
    job: NativePtr;
}
/**
 * Spawn a process with anonymous-pipe stdout/stderr and immediate stdin EOF.
 * @param api - active binding table.
 * @param options - command, cwd, args, and restricted primary token.
 * @returns caller-owned process and pipe read handles.
 */
export declare function spawnPipedProcess(api: Win32ProcessBindings, options: RestrictedProcessSpawnOptions): SpawnedPipedProcess;
/**
 * Drain one anonymous pipe until the writer closes it.
 * @param api - active binding table.
 * @param handle - caller-owned pipe read end.
 * @returns complete bytes read before EOF; the handle is always closed.
 * @throws when a Win32 pipe operation fails.
 */
export declare function drainPipe(api: Win32ProcessBindings, handle: NativePtr): Promise<Buffer>;
/**
 * Wait for a process and always close its handle.
 * @param api - active binding table.
 * @param process - caller-owned process handle.
 * @returns direct process exit code.
 */
export declare function waitForProcessExit(api: Win32ProcessBindings, process: NativePtr): number;
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
export declare function spawnInheritedJobProcess(api: Win32ProcessBindings, options: RestrictedProcessSpawnOptions): SpawnedJobProcess;
/**
 * Spawn an ordinary process suspended, assign its Job, then resume it.
 * @param api - active binding table.
 * @param options - command, cwd, argv, and target carrier descriptors.
 * @returns caller-owned process and Job handles after successful resume.
 */
export declare function spawnCurrentTokenJobProcess(api: CurrentTokenProcessBindings, options: CurrentTokenProcessSpawnOptions): SpawnedJobProcess;
/**
 * Verify that an unnamed kill-on-close Job can be created and released now.
 * @param api - active binding table.
 */
export declare function probeCurrentTokenJobSupport(api: CurrentTokenProcessBindings): void;
/**
 * Poll one process handle without blocking the runner event loop.
 * @param api - active binding table.
 * @param process - caller-owned process handle.
 * @returns the direct exit code when signalled, or undefined while running.
 */
export declare function pollProcessExit(api: Win32ProcessBindings, process: NativePtr): number | undefined;
/**
 * Return whether a Job has no active processes.
 * @param api - active binding table.
 * @param job - caller-owned Job handle.
 * @returns true once the Job reports zero active processes.
 */
export declare function isJobEmpty(api: Win32ProcessBindings, job: NativePtr): boolean;
/**
 * Terminate every process in a Job.
 * @param api - active binding table.
 * @param job - caller-owned Job handle.
 * @param exitCode - direct Windows exit code assigned to members.
 */
export declare function terminateJob(api: Win32ProcessBindings, job: NativePtr, exitCode: number): void;
/**
 * Close a caller-owned handle and report a labelled Win32 failure.
 * @param api - active binding table.
 * @param handle - handle to close.
 * @param detail - lifecycle label for diagnostics.
 */
export declare function closeHandleChecked(api: Win32ProcessBindings, handle: NativePtr, detail: string): void;
export {};
//# sourceMappingURL=process.d.ts.map
/** Closed private transports shared by the native subprocess runner. */
/** Target state restored by the Linux bootstrap after systemd establishes the scope. */
export interface LinuxLaunchRequest {
    cwd: string;
    env: Record<string, string>;
}
/** Bounded Node-shaped error fields allowed across a private runner boundary. */
export interface SerializedRunnerError {
    name: string;
    message: string;
    code?: string;
    syscall?: string;
    path?: string;
}
/** A Linux pre-exec failure published beside its consumed request. */
export type LinuxStartupError = {
    type: 'error';
    error: SerializedRunnerError;
};
/** The only parent-to-runner start message on Windows. */
export interface WindowsStartRequest {
    type: 'start';
    cwd: string;
    env: Record<string, string>;
}
/** The only parent-to-runner control message on Windows. */
export interface WindowsTerminateRequest {
    type: 'terminate';
}
/** Exactly one direct-result branch is sent by a connected Windows runner. */
export type WindowsRunnerResult = {
    type: 'target-exit';
    exitCode: number;
} | {
    type: 'error';
    error: SerializedRunnerError;
};
/** Private paths owned by one Linux ordinary or PTY spawn. */
export interface LinuxLaunchFiles {
    directory: string;
    requestPath: string;
    startupErrorPath: string;
}
/**
 * Create a private 0700 directory and one complete 0600 launch request.
 * @param request - target cwd and complete environment for the bootstrap.
 * @returns private paths owned by this launch.
 */
export declare function createLinuxLaunchFiles(request: LinuxLaunchRequest): LinuxLaunchFiles;
/**
 * Derive the only permitted startup-error path from an absolute request locator.
 * @param requestPath - absolute path to the private launch-request file.
 * @returns validated sibling paths for this launch.
 */
export declare function linuxLaunchFilesFromLocator(requestPath: string): LinuxLaunchFiles;
/**
 * Strictly read and remove a one-shot Linux launch request.
 * @param requestPath - private launch-request path to consume.
 * @returns validated target cwd and environment.
 */
export declare function consumeLinuxLaunchRequest(requestPath: string): LinuxLaunchRequest;
/**
 * Publish one strict 0600 Linux pre-exec error.
 * @param files - private paths for this launch.
 * @param error - bounded spawn or runner failure to publish.
 */
export declare function writeLinuxStartupError(files: LinuxLaunchFiles, error: LinuxStartupError): void;
/**
 * Read the Linux pre-exec error, if the bootstrap published one.
 * @param path - expected startup-error path.
 * @returns the validated failure, or undefined when none was published.
 */
export declare function readLinuxStartupError(path: string): LinuxStartupError | undefined;
/**
 * Strictly parse the single Windows start message.
 * @param value - untrusted IPC payload.
 * @returns validated target start request.
 */
export declare function parseWindowsStartRequest(value: unknown): WindowsStartRequest;
/**
 * Return true only for the exact, payload-free Windows terminate control.
 * @param value - untrusted IPC payload.
 * @returns whether the payload is the exact terminate request.
 */
export declare function isWindowsTerminateRequest(value: unknown): value is WindowsTerminateRequest;
/**
 * Strictly parse one of the two Windows direct-result branches.
 * @param value - untrusted IPC payload.
 * @returns validated direct-result message.
 */
export declare function parseWindowsRunnerResult(value: unknown): WindowsRunnerResult;
/**
 * Convert an unknown failure into the bounded cross-process error record.
 * @param error - failure caught at the process boundary.
 * @returns bounded serializable error fields.
 */
export declare function serializeRunnerError(error: unknown): SerializedRunnerError;
/**
 * Rebuild a Node-shaped Error from a strict runner record.
 * @param serialized - validated bounded error fields.
 * @returns reconstructed Error with supported Node fields.
 */
export declare function deserializeRunnerError(serialized: SerializedRunnerError): Error;
/**
 * Best-effort removal of only the private paths created for this Linux spawn.
 * @param files - exact private paths owned by this launch.
 */
export declare function cleanupLinuxLaunchFiles(files: LinuxLaunchFiles): void;
//# sourceMappingURL=runner-protocol.d.ts.map
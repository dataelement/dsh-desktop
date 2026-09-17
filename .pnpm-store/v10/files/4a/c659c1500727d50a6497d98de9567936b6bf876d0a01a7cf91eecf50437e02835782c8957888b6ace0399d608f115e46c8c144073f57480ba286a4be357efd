/** Platform process-table inspection for terminal readiness, signals, and teardown. */
import type { SubprocessTerminalSignal } from '@deepseek-ai/dsh-subprocess';
/** PID plus start identity, preventing teardown escalation after PID reuse. */
export interface ProcessIdentity {
    pid: number;
    started: string;
}
interface FileStatus {
    readonly rdev: number;
    isCharacterDevice(): boolean;
}
/**
 * One observation of the platform process table, shared by every question a
 * single readiness poll or teardown pass asks.
 *
 * The table is read at most once, on the first question that needs it — a
 * `/bin/ps` fork on macOS, a `/proc` walk on Linux, a Toolhelp32 enumeration on
 * Windows. Later questions never re-read it, which is what keeps a poll's cost
 * independent of how many descendants the running command spawned. Windows
 * liveness needs no table at all: wait state is a per-handle question there, so
 * a snapshot asked only for liveness never enumerates.
 *
 * A snapshot answers what the process table showed, which is what batch
 * filtering wants and what signalling must not use: {@link ProcessInspector.isAlive}
 * is the fence a signal takes, because it reads current state instead.
 */
export interface ProcessSnapshot {
    /**
     * Return the root and its transitive descendants as observed, children first.
     * @param rootPid - tree root to descend from.
     * @returns Observed root and descendants, children before parents.
     */
    tree(rootPid: number): ProcessIdentity[];
    /**
     * Return observed members of one POSIX process session.
     * @param sessionId - POSIX session identifier.
     * @returns Observed session members, empty where the platform's table omits session ids.
     */
    session(sessionId: number): ProcessIdentity[];
    /**
     * Return whether the exact identity was a non-quiescent process.
     * @param identity - PID plus start identity to match.
     * @returns Whether that exact identity — not merely that PID — was running.
     */
    alive(identity: ProcessIdentity): boolean;
}
/** Injectable OS process operations used by one local PTY session. */
export interface ProcessInspector {
    foregroundPgid(shellPid: number): number | undefined;
    /**
     * Report whether the foreground group waits on the terminal shell's stdin.
     *
     * @param pgid Foreground process-group identifier.
     * @param shellPid Persistent terminal shell process identifier.
     * @returns Whether a group member is blocked reading the shell's terminal input.
     */
    isStdinWaiting(pgid: number, shellPid: number): boolean;
    /**
     * Read the process table once and answer tree, session, and liveness from it.
     * @returns A process-table observation whose reads are shared.
     */
    snapshot(): ProcessSnapshot;
    /**
     * Return whether the exact identity is a non-quiescent process right now.
     *
     * Reads the narrowest per-identity source the platform offers rather than a
     * whole table, so a signalling round can re-check every target without
     * paying for a scan. Callers filtering many members at once want
     * {@link ProcessSnapshot.alive} instead.
     *
     * @param identity - PID plus start identity to match.
     * @returns Whether that exact identity — not merely that PID — is running.
     */
    isAlive(identity: ProcessIdentity): boolean;
    signalGroup(pgid: number, signal: SubprocessTerminalSignal): void;
    /**
     * Signal one exact process identity, fenced against PID reuse.
     *
     * The fence reads current state immediately before the signal. An observation
     * taken earlier in the same round cannot stand in for it: the observation
     * preserves the original PID-to-start-time pairing, so a recycled PID would
     * still match and take a signal meant for the process that exited.
     *
     * @param identity - PID plus start identity to signal.
     * @param signal - termination signal to deliver.
     */
    signalProcess(identity: ProcessIdentity, signal: 'SIGTERM' | 'SIGKILL'): void;
}
/** Testable boundary around filesystem, process-table, and signal syscalls. */
export interface ProcessInspectorInternals {
    readFile(path: string): string;
    readDir(path: string): string[];
    readLink(path: string): string;
    stat(path: string): FileStatus;
    open(path: string): number;
    read(fd: number, buffer: Buffer, length: number, position: number): number;
    close(fd: number): void;
    exec(file: string, args: string[]): string;
    kill(pid: number, signal: NodeJS.Signals): void;
}
interface ProcStat {
    pid: number;
    parentPid: number;
    pgrp: number;
    session: number;
    state: string;
    ttyDevice: number;
    tpgid: number;
    started: string;
}
/**
 * Parse fields used from Linux `/proc/<pid>/stat`, including parenthesized comm text.
 * @param text - complete stat line.
 * @returns Parsed identity/group fields, or undefined for malformed input.
 */
export declare function parseProcStat(text: string): ProcStat | undefined;
/**
 * Report whether a Linux process group has an executing member. `false`
 * means the group contains only zombie/dead entries; `undefined` means the
 * process table could not prove either outcome.
 * @param processGroupId - POSIX process-group id to inspect.
 * @param internals - injectable process-table operations.
 * @returns Live-member presence, or `undefined` when unavailable/absent.
 */
export declare function linuxProcessGroupHasLiveMembers(processGroupId: number, internals?: ProcessInspectorInternals): boolean | undefined;
/**
 * Create the supported platform inspector or fail at plugin load.
 * @param platform - target Node platform.
 * @param arch - target CPU architecture for Linux syscall numbers.
 * @param internals - filesystem/process boundary, injectable for deterministic tests.
 * @returns Platform process inspector.
 */
export declare function createProcessInspector(platform?: NodeJS.Platform, arch?: NodeJS.Architecture, internals?: ProcessInspectorInternals): ProcessInspector;
export {};
//# sourceMappingURL=process-inspector.d.ts.map
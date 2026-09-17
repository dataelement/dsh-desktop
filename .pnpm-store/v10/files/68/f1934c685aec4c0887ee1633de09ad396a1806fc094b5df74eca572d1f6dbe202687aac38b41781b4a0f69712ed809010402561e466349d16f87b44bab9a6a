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
import type { SubprocessTerminalSignal } from '@deepseek-ai/dsh-subprocess';
import type { ProcessIdentity, ProcessInspector, ProcessSnapshot } from './process-inspector.ts';
/** One Toolhelp32 process-table row. */
export interface ProcessEntry {
    pid: number;
    parentPid: number;
}
/** Creation identity plus the process object's current wait state. */
export interface WindowsProcessState {
    /** GetProcessTimes creation identity used to fence PID reuse. */
    started: string;
    /** Whether a zero-time process-handle wait reports the process still running. */
    active: boolean;
}
/** Injectable Windows process operations used by one local PTY session. */
export interface WindowsProcessInspectorInternals {
    /** Enumerate the current process table (pid/parent pairs). */
    snapshot(): ProcessEntry[];
    /** Return one process's creation identity and wait state, or undefined when unreadable. */
    processState(pid: number): WindowsProcessState | undefined;
    /** Terminate one process tree; `force` maps to taskkill `/F`. */
    taskkill(pid: number, force: boolean): void;
}
/**
 * Walk a process table from one root in children-first order, retaining only
 * members whose start identity is readable (unreadable members are detector
 * misses, exactly like an unreadable `/proc` entry on Linux).
 * @param entries - the process table snapshot.
 * @param rootPid - the tree root to descend from.
 * @param started - creation-time identity resolver for one member.
 * @returns the root and its current transitive descendants, children first.
 */
export declare function windowsProcessTree(entries: ProcessEntry[], rootPid: number, started: (pid: number) => string | undefined): ProcessIdentity[];
/**
 * Windows {@link ProcessInspector}. The shell pid stands in for a foreground
 * process group: it is a stable pseudo-group that lets the prompt-marker
 * readiness path compare foreground identities, while every actual signal
 * targets the console-wide tree through taskkill (SIGINT is delivered by the
 * terminal handle as a `\x03` input write and never reaches this layer).
 */
export declare class WindowsProcessInspector implements ProcessInspector {
    private readonly internals;
    constructor(internals?: WindowsProcessInspectorInternals);
    foregroundPgid(shellPid: number): number;
    isStdinWaiting(_pgid: number, _shellPid: number): boolean;
    isAlive(identity: ProcessIdentity): boolean;
    snapshot(): ProcessSnapshot;
    signalGroup(pgid: number, signal: SubprocessTerminalSignal): void;
    signalProcess(identity: ProcessIdentity, signal: 'SIGTERM' | 'SIGKILL'): void;
}
/**
 * Create the Windows process inspector.
 * @param internals - injectable process operations; defaults to the koffi-backed table.
 * @returns the Windows inspector.
 */
export declare function createWindowsProcessInspector(internals?: WindowsProcessInspectorInternals): WindowsProcessInspector;
declare const nativePtr: unique symbol;
/** Koffi 3 native pointer (a BigInt address), branded so it cannot silently enter numeric contexts. */
export type NativePtr = bigint & {
    readonly [nativePtr]: true;
};
/**
 * True for NULL and INVALID_HANDLE_VALUE returns from Win32 handle APIs.
 * @param value - a handle as koffi may hand it back (pointer, null, or 0n).
 * @returns whether the value signals an invalid handle.
 */
export declare function isInvalidHandle(value: NativePtr | null | undefined): boolean;
export {};
//# sourceMappingURL=windows-inspector.d.ts.map
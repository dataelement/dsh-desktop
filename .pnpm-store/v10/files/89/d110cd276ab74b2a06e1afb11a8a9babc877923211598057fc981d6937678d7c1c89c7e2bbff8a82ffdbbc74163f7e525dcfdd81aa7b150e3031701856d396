/**
 * Process plumbing for the local subprocess service: ordinary process launch
 * with per-stream stdio dispositions, tail-keep collection with spill
 * files, provider-owned range signalling, and common termination scheduling.
 * POSIX owners stage TERM before KILL; Windows owners terminate immediately.
 * This layer reacts to an abort signal; callers own deadlines, teardown
 * ladders, and cause classification.
 * @module dsh-subprocess-local/spawn
 */
import { type ChildProcess, type SpawnOptions } from 'node:child_process';
import type { CollectedOutput, SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import type { ManagedProcessLaunch } from './managed-owner.ts';
type SpawnProcess = (program: string, args: readonly string[], options: SpawnOptions) => ChildProcess;
/**
 * Build a child environment: explicit caller entries override the scrubbed
 * parent base using the target platform's environment-key semantics. A string
 * deliberately restores or overrides an entry; an explicit `undefined`
 * tombstone removes an ordinary ambient entry.
 * @param extra - explicit caller entries and tombstones, merged after the scrub.
 * @returns the environment to hand to `spawn` for the child process.
 */
export declare function childEnv(extra?: Readonly<NodeJS.ProcessEnv>): NodeJS.ProcessEnv;
/** Injectable process, spill, and platform operations. */
export interface SpawnInternals {
    /** Process spawner (defaults to `node:child_process` `spawn`). */
    spawn?: SpawnProcess;
    /** Directory for spill files (defaults to the OS temp dir). */
    spillDir?: string;
    /** Windows tree-termination runner (defaults to `taskkill /PID <pid> /T /F`). */
    taskkill?: (pid: number) => void;
    /** Host platform override for signalling decisions. */
    platform?: NodeJS.Platform;
    /** Linux process-group member probe (defaults to `/proc` inspection). */
    linuxProcessGroupHasLiveMembers?: (processGroupId: number) => boolean | undefined;
}
/**
 * Local-only synchronous final termination used by the owning service during
 * host exit and as the last fallback after failed normal disposal. It is
 * intentionally absent from the public subprocess seam.
 */
export interface LocalSubprocessHandle extends SubprocessHandle {
    /** Force-terminate the current tree synchronously without starting timers or waits. */
    terminateForHostExit(): void;
}
/**
 * Prepare fallible output storage before starting a managed native process.
 * @param internals - optional caller-owned spill directory.
 * @returns binding inputs whose spill directory is ready for use.
 */
export declare function prepareManagedProcessBinding(internals?: Pick<SpawnInternals, 'spillDir'>): {
    spillDir: string;
};
/**
 * Collects one stream with a bounded in-memory tail. With a spill cap, on
 * first overflow a spill file is created and every chunk (including those
 * already collected) is appended there while the full stream remains within
 * the cap; without one, only the in-memory tail is ever retained (the
 * diagnostic-tail shape — a language server's stderr).
 *
 * Tail-keep rationale (pi/OpenCode): errors and final results cluster at the
 * end of command output; the spill file covers the head.
 */
export declare class OutputCollector {
    private readonly maxBytes;
    private readonly maxSpillBytes;
    private readonly label;
    private readonly spillDir;
    private chunks;
    private bytes;
    private dropped;
    private spillFd;
    private spillFile;
    private spillDisabled;
    /** Total bytes ever pushed (not just retained). */
    private total;
    constructor(maxBytes: number, maxSpillBytes: number | undefined, label: string, spillDir: string);
    /**
     * Ingest one stream chunk, counting it toward the whole-stream total. On
     * first overflow of the in-memory cap a spill file is opened (when spilling
     * is enabled) and every chunk (already-collected ones included) is appended
     * there from then on; the in-memory tail then drops whole chunks from its
     * head (or the head of a single over-cap chunk) until it fits the cap again.
     * @param chunk - the raw bytes from one stream 'data' event.
     */
    push(chunk: Buffer): void;
    /** Open the spill file lazily and append `chunk` (and any prior chunks once). */
    private spillAll;
    /** Stop spilling and remove the file once it can no longer hold the complete stream. */
    private discardSpill;
    /**
     * Incremental read in whole-stream byte coordinates: returns everything
     * pushed since `fromByte`. When `fromByte` has already slid out of the
     * in-memory tail window, the read is `lossy` — it returns the whole
     * retained tail and the gap is only recoverable from the spill file.
     * @param fromByte - whole-stream offset to resume from (a prior read's `nextOffset`; 0 for the first read).
     * @returns the delta text, the offset for the next read, the `lossy` flag, and the spill path when one was created.
     */
    readFrom(fromByte: number): {
        text: string;
        nextOffset: number;
        lossy: boolean;
        spillPath?: string;
    };
    /**
     * Close the spill file once the stream has ended. A failed close (delayed
     * writeback fault) stops advertising the spill path — the file may be
     * missing its tail — while every in-memory read keeps working. Idempotent;
     * the spawn path seals both collectors at settlement so reads after exit
     * never point at a still-open file.
     */
    seal(): void;
    /**
     * Seal the spill file and return the final output.
     * @returns the final collected output: tail text, truncation flag, and the spill path when intact.
     */
    finalize(): CollectedOutput;
}
/**
 * Send `sig` to a detached POSIX process group. Never throws: delivery races
 * process exit and may run in a timer callback, so failures are contained and
 * a missing pid is a no-op.
 * @param pid - the group leader's pid, when the spawn published one.
 * @param sig - the signal to deliver to the whole group.
 */
export declare function killGroup(pid: number | undefined, sig: NodeJS.Signals): void;
/**
 * Terminate one Windows process tree with `taskkill /T /F`. Contained like
 * POSIX group signalling — delivery races tree exit, so an absent tree, a
 * nonzero status, or a missing taskkill binary must not break idempotent
 * teardown.
 * @param pid - root process id, when the spawn published one.
 */
export declare function taskkillProcessTree(pid: number | undefined): void;
/**
 * Validate the synchronous portion of one ordinary spawn request.
 * @param spec - exact target request.
 * @throws when grace, cancellation, or argv is invalid before launch.
 */
export declare function validateSubprocessSpec(spec: SubprocessSpawnSpec): void;
/**
 * Bind platform launch facts to the existing stdio, outcome, abort, and termination lifecycle.
 * @param spec - fully resolved argv, cwd, stdio, grace, cancellation, environment.
 * @param launch - platform streams, direct outcome, and managed-range owner.
 * @param internals - test-only spill-directory override.
 * @returns live subprocess handle.
 */
export declare function bindManagedProcess(spec: SubprocessSpawnSpec, launch: ManagedProcessLaunch, internals?: Pick<SpawnInternals, 'spillDir'>): LocalSubprocessHandle;
/**
 * Spawn one detached PGID/taskkill fallback and bind the common lifecycle.
 * @param spec - fully resolved argv, cwd, stdio, grace, cancellation, environment.
 * @param internals - test-only spill-directory, platform, and taskkill overrides.
 * @returns live subprocess handle.
 */
export declare function spawnSubprocess(spec: SubprocessSpawnSpec, internals?: SpawnInternals): LocalSubprocessHandle;
export {};
//# sourceMappingURL=spawn.d.ts.map
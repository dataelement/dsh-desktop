/** A one-argument warning sink — the sweep's only side effect on failure (never throws). */
export type WarnFn = (message: string) => void;
/** One root to sweep, plus whether the root itself may be pruned once empty. */
export interface SweepRoot {
    /** Absolute spill root to sweep. */
    path: string;
    /**
     * When `true`, remove the root after its empty `session-*` children are
     * pruned. Set for DISCOVERED prior-default `dsh-spill-*` roots (one per past
     * process — otherwise they accumulate empty forever), never for the active
     * root the live process is still writing into. Every root prunes empty session
     * directories; writes retry if that races their removal.
     */
    pruneWhenEmpty: boolean;
}
/** Options for {@link sweepSpillRoots} — the roots to scan, the age cutoff, and a failure sink. */
export interface SweepOptions {
    /** Roots to sweep (configured/active root and/or discovered prior-default roots). */
    roots: SweepRoot[];
    /**
     * Epoch-millis cutoff: a regular file is deleted when its `mtime` is strictly
     * older than this. The caller derives it from `now - cleanupPeriodDays`, so a
     * file written exactly at the boundary is kept (only strictly-older expires).
     */
    cutoffMs: number;
    /** Where a contained filesystem failure is reported; the sweep itself never throws. */
    warn: WarnFn;
}
/**
 * Best-effort one-shot cleanup: across each root, delete expired regular files
 * under its `session-*` directories and prune every empty session directory.
 * Only a discovered prior-default root is itself removed. Writes recreate a
 * session directory when pruning races a local write. Every filesystem and
 * warning-sink failure is contained, so a caller can await this during
 * activation/disposal without it ever rejecting.
 *
 * @param options The roots to sweep, the age cutoff, and the failure sink.
 * @returns Resolves when the sweep finishes (never rejects).
 */
export declare function sweepSpillRoots(options: SweepOptions): Promise<void>;
/**
 * Discover trusted prior default roots below the OS temporary directory.
 *
 * @param warn Sink for contained discovery failures.
 * @param base Directory to scan; defaults to the OS temporary directory.
 * @returns Canonical paths of trusted default roots.
 */
export declare function discoverDefaultRoots(warn: WarnFn, base?: string): Promise<string[]>;
/**
 * Gather and de-duplicate the trusted roots for one startup sweep. The active
 * configured path may be a symlink; its resolved identity overrides a matching
 * discovered root so the live target is never marked prunable.
 *
 * @param activeRoot Active configured root.
 * @param warn Sink for contained inspection failures.
 * @param defaultRootsBase Directory holding prior default roots.
 * @returns Trusted roots with the active identity marked non-prunable.
 */
export declare function gatherSweepRoots(activeRoot: string, warn: WarnFn, defaultRootsBase?: string): Promise<SweepRoot[]>;
//# sourceMappingURL=cleanup.d.ts.map
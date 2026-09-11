/**
 * pnpm `--reporter=ndjson` progress parser (P1-6).
 *
 * pnpm's ndjson reporter is a bole stream on stdout: one JSON object per
 * line, e.g.
 *
 *   {"time":...,"level":"debug","name":"pnpm:stage","prefix":"...","stage":"resolution_started"}
 *   {"time":...,"level":"debug","name":"pnpm:progress","packageId":"...","status":"resolved"}
 *   {"time":...,"level":"debug","name":"pnpm:fetching-progress","packageId":"...","status":"started","size":123}
 *   {"time":...,"level":"debug","name":"pnpm:ignored-scripts","packageNames":["esbuild"]}
 *   {"time":...,"level":"error","name":"pnpm","err":{"message":"..."}}
 *
 * Verified against real pnpm 11.16.0 output (2026-08). Older pnpm majors
 * emit a different shape or nothing at all — callers fall back to human
 * line parsing when `seen` stays false.
 *
 * The reducer is pure and unit-testable: `feed` mutates the tracker's
 * internal snapshot, `snapshot` returns a serializable copy.
 */
export type ProgressPhase = 'resolving' | 'downloading' | 'linking' | 'building' | null;
export interface ProgressSnapshot {
    phase: ProgressPhase;
    /** Distinct packages resolved/fetched so far. */
    done: number;
    /** Package-count total; pnpm 11's stream carries no per-run total. */
    total: number | null;
    /** Package being fetched/linked right now (its `packageId`), or null. */
    currentPackage: string | null;
    /** Bytes downloaded for the current package, when known. */
    downloaded: number | null;
    /** Total bytes for the current package, when known. */
    size: number | null;
    /** True once any structured pnpm event was parsed (ndjson works). */
    seen: boolean;
    /** Last fatal error message carried by the stream, if any. */
    error: string | null;
    /**
     * pnpm's own error CODE from that same event (`ERR_PNPM_…`), when it
     * carried one. The code is the part that classifies reliably: the message
     * is prose and gets reworded between pnpm releases (#244).
     */
    errorCode: string | null;
    /** Package names pnpm reported as having ignored build scripts. */
    ignoredBuilds: string[];
}
export declare function emptyProgress(): ProgressSnapshot;
export interface ProgressTracker {
    readonly snapshot: ProgressSnapshot;
    feed(line: string): void;
    reset(): void;
}
export declare function createProgressTracker(): ProgressTracker;

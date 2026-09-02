/**
 * Profile snapshots — issue #98 (phase 3), implementing the snapshot half of
 * #19: before any ordering / preset change is applied, the profile's
 * composition-critical files are captured as a timestamped snapshot; a failed
 * or unwanted change can be rolled back in one step.
 *
 * A snapshot is a single JSON document under `<profile>/.dsh-market/
 * snapshots/<timestamp>-<seq>.json` describing the files that define the
 * profile's composition: package.json (dependency + bundle list),
 * cordis.patch.yml (the user patch layer) and state.json (market disable
 * list + groups). Version 2 records optional-file absence explicitly;
 * restoring validates every path, reconciles writes and deletions, and rolls
 * completed actions back if a later action fails.
 *
 * Retention: after every create, snapshots are pruned to the most recent
 * `maxSnapshots` (default 20); the cap is configurable through the market
 * plugin config (`maxSnapshots`) and each snapshot can also be deleted
 * individually from the UI.
 */
declare const SNAPSHOT_FORMAT = "dsh-market/profile-snapshot";
declare const SNAPSHOT_VERSION = 2;
interface SnapshotFile {
    path: string;
    /** JSON documents keep their parsed form (re-serialized on restore). */
    json?: unknown;
    /** Line-oriented text files (cordis.patch.yml) keep their lines. */
    lines?: string[];
    /** V2 records absence explicitly so restore can remove a later file. */
    absent?: true;
}
export interface ProfileSnapshot {
    /** Present on exact snapshots; omitted by legacy snapshots. */
    format?: typeof SNAPSHOT_FORMAT;
    /** Version 2 records all tracked paths, including explicit absence. */
    version?: typeof SNAPSHOT_VERSION;
    /** Snapshot id: the file basename without the .json suffix. */
    id: string;
    createdAt: number;
    files: SnapshotFile[];
}
export type SnapshotCaptureResult = {
    ok: true;
    snapshot: ProfileSnapshot;
} | {
    ok: false;
    error: string;
};
/** Default number of snapshots retained; configurable via `maxSnapshots`. */
export declare const DEFAULT_MAX_SNAPSHOTS = 20;
/**
 * Prune the snapshot directory to the `max` most recent snapshots (newest
 * first). Extra ones are deleted oldest-first. A non-positive cap is clamped
 * to 1 — a 0/negative max must never drop the snapshot that was just created
 * nor invert to keeping the OLDEST set (issue #98 review hardening).
 * @returns the ids that were deleted.
 */
export declare function pruneSnapshots(profileDir: string, max: number): string[];
/** @internal Deterministic newest-first order for equal-createdAt documents. */
export declare function compareSnapshotIdsNewest(a: string, b: string): number;
/**
 * Capture the profile's composition into a version 2 snapshot. Missing
 * optional files are represented explicitly. An existing optional file that
 * cannot be read makes capture fail. Invalid market state is represented as
 * absent because every state reader already observes it as empty and the next
 * state write replaces it. A missing, unreadable, or invalid package.json is
 * not snapshot-able. After creating, the directory is pruned to the most
 * recent `maxSnapshots`.
 */
export declare function createProfileSnapshot(profileDir: string, maxSnapshots?: number): SnapshotCaptureResult;
/**
 * All snapshots for a profile, newest first. Files that are unparseable,
 * shape-invalid (bad id/createdAt/files), or whose internal id does not match
 * the file name are skipped — a snapshot that could never be restored is not
 * listed (issue #98 analysis: snapshot JSON validation).
 */
export declare function listSnapshots(profileDir: string): ProfileSnapshot[];
/**
 * Restore a snapshot's files into the profile. Version 2 absence markers
 * remove files created after capture; omitted optional files in unversioned
 * legacy snapshots remain untouched. Every path is validated before mutation,
 * each write uses a same-directory temp + rename, and a failure mid-restore
 * rolls completed writes/deletions back to their pre-restore contents.
 * @returns the paths restored; an error result when the snapshot is unsafe,
 * unknown, or a write failed (with any partial writes rolled back).
 */
export declare function restoreSnapshot(profileDir: string, id: string): {
    ok: boolean;
    restored: string[];
    error?: string;
};
/** Delete one snapshot; true only when it existed and was removed. */
export declare function deleteSnapshot(profileDir: string, id: string): boolean;
export {};

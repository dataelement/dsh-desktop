/**
 * Trial validation for composition changes — issue #98 (phase 3), the
 * "trial boot" half of #19 reduced to what is safe and offline: before any
 * bundle-order or preset change is written to the profile, replay the
 * composition with the CANDIDATE order using the same entry-list machinery
 * the real boot uses (src/check.ts's buildBundleLayers + composeLayers), and
 * refuse the change when the composed tree would fail to boot (duplicate
 * loader entry ids, unresolvable bundle layers, unparseable patches).
 *
 * No process, no network, no writes to the profile: the real profile is only
 * read; if the candidate is bad, the failure is reported and nothing is
 * applied (the caller then skips the write-back entirely).
 *
 * Issue #125 review: the CURRENT composition is replayed alongside the
 * candidate, so the response also carries a current-vs-candidate diff
 * (overrides / orphans / duplicates the reorder introduces) — not just
 * whether it boots.
 *
 * Bundle resolution is deliberately SHARED with the check report
 * (check.ts's buildBundleLayers): the dsh installation anchor first, then
 * Node's module search from the profile (workspace-root hoisting) — so the
 * trial can never disagree with the diagnostics about what a bundle is or
 * where it lives, and official bundles resolve even when they are only
 * hoisted to the workspace root.
 */
import { type DuplicateId, type OrphanRow, type OverrideRow } from './check.ts';
export interface TrialIssue {
    layer: string;
    message: string;
}
/** Current-vs-candidate composition diff (issue #125 review). */
export interface TrialDiff {
    /** Override relationships introduced by the candidate (not present in the current composition). */
    overrides: OverrideRow[];
    /** Orphan rows introduced by the candidate. */
    orphans: OrphanRow[];
    /** Duplicate loader entry ids introduced by the candidate. */
    duplicates: DuplicateId[];
}
export interface TrialResult {
    ok: boolean;
    errors: TrialIssue[];
    warnings: TrialIssue[];
    duplicates: DuplicateId[];
    /** The composed loader rows under the candidate order. */
    rows: {
        id: string;
        layer: string;
    }[];
    /** What the reorder would change vs the current composition (issue #125 review). */
    diff: TrialDiff;
}
/**
 * Replay the profile composition with `newCommunityOrder` (the candidate
 * community-bundle order; official bundles keep their exact positions) and
 * report anything that would break the boot. Pure read.
 */
export declare function trialValidate(profileDir: string, newCommunityOrder: string[], options?: {
    dshInstallDir?: string | null;
    homeDir?: string;
}): TrialResult;

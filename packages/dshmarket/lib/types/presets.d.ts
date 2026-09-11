/**
 * Named plugin presets — issue #98 (phase 3), the "save different plugin
 * combinations" product shape. A preset captures the community-bundle order
 * and the disabled-plugin list of the profile at save time; applying one
 * replays the composition under the candidate order (trialValidate), refuses
 * on failure, auto-snapshots the profile (createProfileSnapshot), and only
 * then writes the bundle order and disable list.
 *
 * Presets persist in `<profile>/.dsh-market/presets.json` (market-owned
 * state, like snapshots) — deliberately separate from state.json, whose
 * shape routes.ts owns.
 */
import { type TrialDiff, type TrialIssue } from './trial.ts';
/** Maximum presets stored per profile (quota — issue #98 analysis). */
export declare const MAX_PRESETS = 50;
export interface Preset {
    name: string;
    /** Community-bundle order this preset restores. */
    bundleOrder: string[];
    /** Disabled plugin names this preset restores. */
    disabled: string[];
    createdAt: number;
}
export interface PresetResult {
    ok: boolean;
    error?: string;
    /** Set when applyPreset auto-created a pre-change snapshot. */
    snapshot?: string;
}
/** All saved presets, newest first. */
export declare function listPresets(profileDir: string): Preset[];
/**
 * Save the current composition state as a named preset. The bundle order is
 * validated against the current community bundles so a stale snapshot can
 * never be stored.
 */
export declare function savePreset(profileDir: string, name: unknown, bundleOrder: unknown, disabled: unknown): PresetResult;
/** Delete a named preset. */
export declare function deletePreset(profileDir: string, name: unknown): PresetResult;
/** The concrete change a preset apply would make — computed BEFORE writing. */
export interface PresetChange {
    /** Bundles whose position changes under the preset order. */
    reordered: string[];
    /** Plugins the preset would ENABLE (currently disabled, enabled by the preset). */
    enabled: string[];
    /** Plugins the preset would DISABLE (currently enabled, disabled by the preset). */
    disabled: string[];
    /** True when nothing would change. */
    noop: boolean;
}
export interface PresetApplyResult extends PresetResult {
    changes?: PresetChange;
    /** Set when the preset order fails trial validation — errors + current-vs-candidate diff (issue #125 review). */
    trial?: {
        errors: TrialIssue[];
        warnings: TrialIssue[];
        diff: TrialDiff;
    };
}
/**
 * The preset's bundle set vs the profile's current community bundles —
 * a stale preset (saved before a plugin was installed/uninstalled) can no
 * longer be applied as-is, but its intent (enabled/disabled plugins,
 * relative order) is still previewable.
 */
export interface PresetMismatch {
    /** Bundles in the current profile that the preset does not mention. */
    missing: string[];
    /** Bundles the preset mentions that are not installed anymore. */
    extra: string[];
    /** True when the preset's bundle set differs from the current one. */
    stale: boolean;
}
/**
 * Preview what applying a preset would change, WITHOUT writing anything.
 * A stale preset (bundle set mismatch) is NOT a hard failure: the preview
 * reports the mismatch alongside the still-computable changes (relative
 * order + enabled/disabled diffs over the intersection).
 */
export declare function previewPreset(profileDir: string, name: unknown): PresetResult & {
    changes?: PresetChange;
    mismatch?: PresetMismatch;
};
/**
 * Apply a saved preset: trial-validate the candidate order first (refuse
 * without writing on any boot-breaking issue), auto-snapshot the profile,
 * then write the bundle order and the disable list. The response carries the
 * change preview so the UI can report exactly what moved.
 */
export declare function applyPreset(profileDir: string, name: unknown, maxSnapshots?: number): PresetApplyResult;

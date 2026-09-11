/**
 * Host-contract compatibility preflight for #195.
 *
 * Pure evaluation of what `analyzeProfile()` already reports: a confirmed
 * peer mismatch (`satisfied === false`) is translated into a directional
 * verdict:
 *
 * - `belowMin`: the resolved version is older than every alternative's lower
 *   bound — the environment is too old for the plugin's declared contract.
 * - `aboveMax`: the resolved version is newer than every alternative's upper
 *   bound (or the exact pin). This is only a risk when the author expressed
 *   an explicit upper bound or exact pin; otherwise it is a warning, because
 *   the ecosystem currently has many sloppy `^0.0.1`-style declarations that
 *   work in practice.
 *
 * Everything else stays informational: `*`, prerelease-vs-`*` artifacts,
 * unparseable ranges, and optional peers never produce a risk here.
 */
import { type CheckOptions, type DuplicateName, type PeerRisk, type PeerWarning, type PeerVerdict } from './check.ts';
export type CompatibilityRisk = PeerRisk;
export type CompatibilityWarning = PeerWarning;
/** Re-exported so consumers can keep importing PeerVerdict from this module. */
export type { PeerVerdict };
export interface CompatibilityAssessment {
    risks: CompatibilityRisk[];
    warnings: CompatibilityWarning[];
    /**
     * Cross-layer duplicate loader NAMES, carried through from the same
     * `analyzeProfile` run the peer checks already pay for (#230).
     *
     * The report has always computed these and deliberately kept them out of
     * `summary.warnings`, because flagging an already-messy but working
     * profile is a false positive nobody can act on. Diffing before against
     * after is what makes them actionable: a collision this operation
     * INTRODUCED is one the operation can also undo.
     */
    duplicateNames: DuplicateName[];
}
/** Translate one confirmed peer mismatch into a directional verdict. */
export declare function classifyPeer(plugin: string, peer: string, range: string, resolved: string | null, optional: boolean): PeerVerdict;
/** Whether a peer is declared optional in the installed plugin manifest. */
export declare function isOptionalPeer(profileDirectory: string, plugin: string, peer: string): boolean;
/** Evaluate the current profile with the same machinery `/dsh-market/check` uses. */
export declare function assessCompatibility(profileDirectory: string, options?: CheckOptions): CompatibilityAssessment;
/** Risks present after a mutation but absent before it. */
export declare function introducedRisks(before: CompatibilityAssessment, after: CompatibilityAssessment): CompatibilityRisk[];
/**
 * Cross-layer name collisions present after a mutation but absent before it
 * (#230 by @dxc-dxc).
 *
 * Keyed by NAME alone, not by the layer set: a collision the operation made
 * worse — same name, now shadowing across one more layer — is still the same
 * collision the profile already had, and re-reporting it would put the
 * operator back in front of a problem they did not just cause.
 *
 * This is what makes surfacing these safe at all. The underlying
 * `duplicateNames` is informational precisely because a healthy-but-messy
 * profile can carry collisions indefinitely; only the newly introduced ones
 * are attributable to the install that just ran, and therefore undoable by
 * rolling it back.
 */
export declare function introducedDuplicateNames(before: CompatibilityAssessment, after: CompatibilityAssessment): DuplicateName[];
/** Convenience wrapper matching the profile helper signature. */
export declare function assessProfile(profile: string, explicitDir?: string): CompatibilityAssessment;

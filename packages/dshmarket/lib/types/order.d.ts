/**
 * Community bundle ordering — issue #98 (phase 2): let the user reorder the
 * community bundles of the profile's layer stack, with author-declared
 * before/after rules enforced before anything is written.
 *
 * Official in-box bundles (@deepseek-ai/dsh-base, @deepseek-ai/dsh-web-app,
 * @deepseek-ai/dsh-headless) are fixed: they keep their exact positions in
 * the stack, are never part of a user-supplied order, and are never added,
 * removed or duplicated by a reorder (#98 boundary). The profile's own
 * cordis.patch.yml and --patch overlays are not part of the bundle stack and
 * are never touched here.
 *
 * Pure functions plus one manifest write-back; no processes, no network.
 */
/** Profile bundles that ship with the dsh host and must stay put (#98). */
export declare const INBOX_BUNDLES: Set<string>;
/** The bundle stack as it appears in the profile manifest. */
export interface BundleStack {
    /** Full ordered list from dsh.profile.bundles. */
    bundles: string[];
    /** The subset that may be reordered (community bundles). */
    community: string[];
}
/** Author-declared ordering constraints of one bundle. */
export interface BundleRule {
    name: string;
    /** This bundle must load after every name in this list. */
    after: string[];
    /** This bundle must load before every name in this list. */
    before: string[];
}
/** A violated before/after rule in the current or proposed order. */
export interface OrderConflict {
    name: string;
    reason: string;
}
/** Read the profile's bundle stack (empty when the manifest is unreadable). */
export declare function readBundleStack(profileDir: string): BundleStack;
/**
 * Read each bundle's declared ordering rules from its package manifest
 * (`dsh.bundle.order.{before,after}` — a list of bundle package names).
 * Unresolvable packages and missing declarations contribute nothing.
 */
export declare function readBundleRules(profileDir: string): BundleRule[];
/**
 * Check a bundle order against the declared before/after rules. Rules naming
 * bundles outside `order` are ignored (a rule for a not-yet-installed bundle
 * must not block the current stack).
 * @returns every violated rule with a readable reason; [] when all hold.
 */
export declare function validateOrder(bundleNames: string[], rules: BundleRule[]): OrderConflict[];
/**
 * Merge a community-bundle permutation into the full stack. Official in-box
 * bundles keep their EXACT positions (never moved); community bundles are
 * replaced by `newOrder` in order of appearance. Pure — nothing is written.
 * @returns the merged full stack, or the rejection reason when `newOrder` is
 * not a permutation of the community bundles (duplicates, additions,
 * omissions, official names).
 */
export declare function mergeOrder(bundles: string[], newOrder: string[]): {
    ok: true;
    bundles: string[];
} | {
    ok: false;
    error: string;
};
/**
 * Topologically sort the community bundles by their before/after rules — the
 * "auto-fix" counterpart to validateOrder. Returns null when no declared rule
 * applies to the current stack (nothing to suggest). With rules, Kahn's
 * algorithm breaks ties by the CURRENT order: unconstrained bundles keep
 * their current relative order and constrained bundles move only as far as
 * the rules require — the suggestion is the minimal change that satisfies
 * every rule, never an arbitrary canonical rewrite of a hand-picked order
 * (issue #125 review).
 * @returns the suggested community order, null when there are no rules, or a
 * cycle report when the constraints cannot be satisfied (references to
 * unlisted bundles ignored).
 */
export declare function suggestOrder(bundleNames: string[], rules: BundleRule[]): {
    ok: true;
    order: string[];
} | {
    ok: false;
    cycle: string[];
} | null;
/**
 * Apply a new community-bundle order to the profile manifest. The official
 * in-box bundles keep their exact positions; `newOrder` must be a permutation
 * of the current community bundles (no duplicates, no additions, no
 * omissions). On any failure the manifest is left untouched.
 * @returns the new full stack on success, or an error description.
 */
export declare function applyBundleOrder(profileDir: string, newOrder: string[]): {
    ok: true;
    bundles: string[];
} | {
    ok: false;
    error: string;
};

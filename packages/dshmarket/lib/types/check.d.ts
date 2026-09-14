/**
 * Profile composition diagnostics — issue #98 (phase 1): the check-only
 * "plugin loading layer and conflict view".
 *
 * Pure filesystem analysis of one dsh profile directory; no processes, no
 * network, no writes. It answers, for the profile the market is serving:
 *
 *  1. What is the actual bundle stack (dsh.profile.bundles order) and where
 *     does each layer come from (official in-box bundle vs community, the
 *     dependency spec, the resolved directory)?
 *  2. Which loader entry ids does the composed tree contain, and are any
 *     duplicated across layers (the "duplicate loader entry id" boot failure
 *     from #98)? Which rows does a later layer override?
 *  3. Does any installed plugin pull a DSH host core package
 *     (@deepseek-ai/dsh, @deepseek-ai/dsh-tools, @deepseek-ai/cordis, …) in
 *     as an ordinary dependency — the dsh-excel-chat failure mode where the
 *     plugin's copy gets hoisted to the profile root and shadows the host's
 *     version (tool calls die, minimal preset fails to mount)?
 *  4. Are there multiple versions of one core package in the lockfile, and
 *     do plugin peerDependencies ranges match the resolved core version?
 *  5. Do effective user/home patch entries reference npm package roots that
 *     are installed in the profile-visible node_modules ancestry?
 *
 * The composition step mirrors @deepseek-ai/dsh-app-boot's applyEntryPatches
 * (same js-yaml dialect incl. `!!js` scalars), so the rows reported here are
 * what actually mounts at boot.
 */
export { findDshInstallDir } from './dsh-install.ts';
/** Boot-breaking or confirmed problems vs informational warnings. */
export interface CheckSummary {
    ok: boolean;
    errors: string[];
    warnings: string[];
}
/** One layer of the bundle stack, in `dsh.profile.bundles` order. */
export interface BundleLayer {
    name: string;
    /** Dependency spec from the profile package.json (npm range, git, link:…). */
    source: string;
    /** 'official' = in-box dsh bundle; 'community' = everything else. */
    kind: 'official' | 'community';
    /** Resolved package directory; null when the package is not installed. */
    directory: string | null;
    /** Absolute path of the layer's patch file; null when undeclared/missing. */
    patchPath: string | null;
    /**
     * An in-box bundle whose directory could not be located — a gap in what
     * this process can see, not a defect in the profile (#369). Distinct from
     * `error`, which asserts the profile will not boot.
     */
    unresolvedInbox?: boolean;
    /** Why this layer cannot load at boot (missing dir / no dsh.bundle / …). */
    error: string | null;
    /** Loader entry ids this bundle's patch inserts. */
    entries: string[];
    /** The patch file exists but could not be parsed as the entry-list dialect. */
    parseError: string | null;
    /** Author-declared ordering constraints (issue #98 phase 2), when present. */
    order?: {
        before?: string[];
        after?: string[];
        /** Violated rules for THIS bundle in the current stack order. */
        conflicts?: Array<{
            name: string;
            reason: string;
        }>;
    };
}
/** One loader row of the composed tree, with the layer that introduced it. */
export interface LoaderRow {
    id: string;
    /** Bundle package name, 'user-patch' (profile cordis.patch.yml) or 'home-patch'. */
    layer: string;
    kind: 'insert' | 'patch';
    name?: string;
}
/** An id present in more than one composed row — the #98 duplicate-id boot failure. */
export interface DuplicateId {
    id: string;
    /** Every layer that inserts/defines this id. */
    layers: string[];
    count: number;
}
/** A non-insert patch row that merged into an existing entry (later layer wins). */
export interface OverrideRow {
    id: string;
    layer: string;
    /** Layers that introduced the targeted entry earlier in the stack. */
    overriddenLayers: string[];
}
/** A patch row that matched nothing at boot (dsh warns and skips it). */
export interface OrphanRow {
    id: string;
    layer: string;
    reason: string;
}
/** Directional verdict for one confirmed peer mismatch (issue #201 diagnostics). */
export interface PeerRisk {
    plugin: string;
    peer: string;
    range: string;
    resolved: string;
    direction: 'belowMin' | 'aboveMax';
}
export interface PeerWarning {
    plugin: string;
    peer: string;
    range: string;
    resolved: string;
    reason: 'aboveMax' | 'optional';
}
/** classifyPeer result: risk / warning / none — none means informational. */
export type PeerVerdict = {
    kind: 'risk';
    risk: PeerRisk;
} | {
    kind: 'warning';
    warning: PeerWarning;
} | {
    kind: 'none';
};
/** A plugin peerDependencies range vs the resolved version. */
export interface PeerMismatch {
    plugin: string;
    name: string;
    range: string;
    resolved: string | null;
    /** False = confirmed incompatible; null = could not be evaluated. */
    satisfied: boolean | null;
    /**
     * The declaring plugin marked this peer `optional` in
     * `peerDependenciesMeta`. Carried so the summary can hold the same line
     * `classifyPeer` already does: an optional peer that does not match is
     * the plugin saying "I work without this", not a broken install (#275).
     */
    optional?: boolean;
    /**
     * The directional verdict, attached by `/dsh-market/check` for rows that
     * did not match. It is computed on the server because the client cannot
     * read `peerDependenciesMeta` off disk, and the tiering would otherwise
     * have to be guessed from the range string (#201).
     */
    verdict?: PeerVerdict;
}
/**
 * Loader entries sharing one NAME across DIFFERENT layers — the Loader
 * registers plugins by name, so a later layer's row with the same name
 * shadows the earlier one at runtime. Same-layer rows sharing a name are
 * routine (a bundle defining several entries under one name) and are never
 * reported here. Unlike duplicate ids (report.duplicates), which fail the
 * boot outright, shadowing names only decide which entry wins at runtime.
 */
export interface DuplicateName {
    name: string;
    /** Every layer that inserts/defines a row with this name. */
    layers: string[];
    count: number;
}
/** Distinct resolved versions of one core package found in the lockfile. */
export interface MultiVersion {
    name: string;
    versions: string[];
    /** Version hoisted at the profile root, when present. */
    hoisted: string | null;
}
/** The full check report for one profile. */
export interface CheckReport {
    profile: string;
    scannedAt: number;
    bundles: BundleLayer[];
    rows: LoaderRow[];
    duplicates: DuplicateId[];
    duplicateNames: DuplicateName[];
    overrides: OverrideRow[];
    orphans: OrphanRow[];
    peerMismatches: PeerMismatch[];
    multiVersion: MultiVersion[];
    /** Before/after rule conflicts in the CURRENT bundle order (issue #98 phase 2). */
    orderConflicts: Array<{
        name: string;
        reason: string;
    }>;
    /** LOOT-style auto-fix: a community order satisfying every declared rule. */
    suggestedOrder: {
        ok: true;
        order: string[];
    } | {
        ok: false;
        cycle: string[];
    } | null;
    summary: CheckSummary;
}
export interface CheckOptions {
    /** DSH host install dir; auto-detected from the CLI entry or Desktop resources when omitted. */
    dshInstallDir?: string;
    /** Harness home for the home-level patch layer; defaults to $DSH_HOME or ~/.dsh. */
    homeDir?: string;
}
/** Parse entry-list source with the DSH dialect; null when it is not a list. */
export declare function parsePatchText(text: string): unknown[] | null;
/** Parse one entry-list patch file with the DSH dialect; null when unreadable. */
export declare function parsePatchFile(path: string): unknown[] | null;
/** DSH host core packages: what the dsh installation ships under @deepseek-ai. */
export declare function corePackageNames(dshInstallDir: string | null): Set<string>;
/** Compare two semver strings: negative | zero | positive (prerelease < release of same base). */
export declare function compareSemver(a: string, b: string): number;
/**
 * Minimal range matcher for the peer-range check: `*`, exact, ^, ~, >=, >,
 * <=, <, whitespace-separated pairs, and `||` alternatives. Anything else
 * returns null (unknown — reported, not asserted).
 *
 * Prerelease handling follows npm's semver rule, evaluated at the comparator
 * SET level (one `||` alternative is one set): a version carrying a
 * prerelease tag only satisfies a set when at least one comparator in that
 * set shares the version's [major, minor, patch] tuple AND carries a
 * prerelease of its own; then every comparator is checked normally. So
 * `^0.1.0` never matches `0.2.0-rc.1` (nor `0.1.0-rc.5`), while
 * `>=1.2.3-rc.1 <2.0.0` does match `1.2.3-rc.2` (issue #98 analysis).
 */
export declare function satisfiesRange(version: string, range: string): boolean | null;
interface ResolvableLoaderRow extends LoaderRow {
    activation: 'required' | 'conditional';
}
export interface LayerInput {
    label: string;
    kind: 'bundle' | 'user' | 'home';
    patches: unknown[];
    parseError: string | null;
}
interface Composed {
    rows: LoaderRow[];
    resolvableRows: ResolvableLoaderRow[];
    duplicates: DuplicateId[];
    overrides: OverrideRow[];
    orphans: OrphanRow[];
}
/**
 * Apply the layer stack over an empty root exactly like the dsh boot include.
 * Exported so the trial-start validation (src/trial.ts) can replay the
 * composition with a candidate bundle order BEFORE anything is written.
 */
export declare function composeLayers(layers: LayerInput[]): Composed;
/**
 * Build the bundle layer stack for a profile under a GIVEN bundle order —
 * the manifest order for analyzeProfile, or a candidate order for trial
 * validation (src/trial.ts). Bundle resolution mirrors the boot exactly:
 * the dsh installation anchor first (in-box bundles always come from the
 * running dsh, never a profile-local copy), then Node's module search from
 * the profile directory (covers community bundles and pnpm workspace-root
 * hoisting). A single code path keeps the check report and the trial
 * validation from ever disagreeing about what a bundle is or where it lives.
 */
export declare function buildBundleLayers(profileDirectory: string, bundleNames: string[], specs: Record<string, string>, dshInstallDir: string | null): {
    bundles: BundleLayer[];
    layers: LayerInput[];
};
/**
 * Analyze one profile directory (issue #98, phase 1). Pure function of the
 * directory contents — safe to call on every market open.
 */
export declare function analyzeProfile(profileDirectory: string, options?: CheckOptions): CheckReport;

/**
 * Install orchestration: collection-repo retargeting, post-install
 * validation that keeps broken pieces from bricking the next boot, and
 * update staleness detection. Every function takes the plugin runner as a
 * parameter so tests can substitute a recording fake.
 */
import type { InstallResult, PluginRunner } from './dsh-cli.ts';
/** One-shot bypass for pnpm's fresh-release hold; scoped to a single command. */
export declare const RELEASE_AGE_OVERRIDE = "--config.minimumReleaseAge=0";
/**
 * Longer per-request fetch timeout for one retried command. pnpm's default
 * 60-second limit aborts large tarball downloads (github: sources fetch the
 * WHOLE repo even for a `#path:` subdirectory plugin) on slow networks; a
 * plain retry fails again at the same limit, so the recovery re-runs with
 * this override once. Scoped to a single command like RELEASE_AGE_OVERRIDE.
 */
export declare const FETCH_TIMEOUT_OVERRIDE = "--config.fetchTimeout=600000";
/**
 * Stop pnpm downloading a plugin's peer dependencies (#289 by @00080000).
 *
 * The last resort for a peer that cannot be downloaded because it does not
 * exist on any registry: the dsh runtime injects several `@deepseek-ai/*`
 * packages and never publishes them, and since pnpm 8 `auto-install-peers`
 * defaults on, so pnpm walks the peer list and 404s on one.
 *
 * Only on the retry, never by default. Turning it off wholesale would also
 * stop pnpm installing the peers a plugin legitimately needs from npm, and
 * that failure would surface much later — as a missing module at runtime
 * rather than a clear error at install time. Narrow beats early here.
 *
 * Verified against pnpm 10.29.3: `peerDependencyRules.ignoreMissing` does
 * NOT prevent the fetch (it only silences the warning), so this flag is the
 * only lever that actually works.
 */
export declare const AUTO_INSTALL_PEERS_OFF = "--config.auto-install-peers=false";
/**
 * Whether an unresolvable package is a host peer pnpm went looking for on
 * its own, rather than something the profile actually asks for.
 *
 * The same 404 means two different things and wants two different answers.
 * A `@deepseek-ai/*` package that IS in the profile manifest is a ghost
 * entry — left by an earlier failed operation, or hand-added — and the user
 * has to remove that line; retrying would only fail again. One that is NOT
 * in the manifest was never asked for by anybody: pnpm reached it by walking
 * an installed plugin's peerDependencies, which in this ecosystem name what
 * the runtime provides rather than what npm carries.
 *
 * Reading the manifest is what separates them, so this cannot live in the
 * pure classifier.
 */
export declare function isUnpublishedHostPeer(pkg: string | undefined, profile: string, explicitDir?: string): boolean;
/**
 * Run one plugin command with automatic recovery from three known pnpm traps:
 *
 * - pnpm-major drift (#20 bug 2): a modules directory built by a different
 *   pnpm major fails mutation; pnpm's documented remedy is one `install` to
 *   recreate it — do that silently and retry the original command once.
 * - release-age lockfile lock (#39): once a too-young release is in the
 *   lockfile, pnpm 11 rejects EVERY later add/remove during verification —
 *   retry once with the one-shot minimumReleaseAge bypass (safe: the young
 *   package is already installed; the bypass only lets pnpm touch the
 *   lockfile again).
 * - per-request fetch timeout: large tarballs (github: sources fetch the
 *   whole repo even for a `#path:` subdirectory) on slow networks blow
 *   pnpm's default 60-second limit; a plain retry fails again at the same
 *   limit, so retry once with a longer fetchTimeout.
 *
 * Any recognized failure that survives gets its bilingual explanation
 * appended to stderr so the UI shows an actionable message instead of a
 * wall of text (#20 bug 3). Cancelled runs are never recovered.
 */
export declare function withHoistRecovery(run: PluginRunner, profile: string, pluginArgs: string[], profileDirectory?: string): Promise<InstallResult>;
/**
 * The most specific description of a failed run available, for logs.
 *
 * pnpm's structured error beats the stderr tail whenever there is one — see
 * withHoistRecovery above for why the tail is nearly worthless here.
 */
export declare function failureDetail(result: InstallResult, limit?: number): string;
/**
 * Some registry entries point at collection repos whose actual plugin lives
 * in a subdirectory — the root has no package.json (or a workspace root with
 * no dsh surface), and pnpm installs the bare fileset with exit 0. Detect
 * that junk install, drop it, and re-add each plugin subdirectory through
 * pnpm's `#path:` selector (#18).
 * @returns overall success (true when nothing needed retargeting).
 */
export declare function retargetCollections(run: PluginRunner, profile: string, before: Set<string>, target: string, explicitDir?: string): Promise<boolean>;
/**
 * Fake-success guard (#18): validate every package the install added. A
 * piece without a dsh manifest or without its declared entry artifact
 * (source-only checkout, build blocked by pnpm allowBuilds) would brick the
 * next boot, so it is removed on the spot.
 *
 * Since #122 this also covers duplicate loader entry ids: cordis refuses to
 * load a tree containing two entries with one id, so a TUI bundle landing in
 * a web profile (both declare `id: storage`) leaves DSH unable to START —
 * an error naming neither plugin, from which the market's own page is
 * unreachable. Such a package is removed like any other bricking piece.
 * @returns names added by this run, names kept, names removed as broken,
 * and the id conflicts found. `added` is reported separately from `keep`
 * because an EMPTY `added` is a different failure from "everything added was
 * unloadable": it means the install reported success without touching the
 * profile at all, which is a broken plugin-command channel rather than
 * anything wrong with the plugin (#258).
 */
export declare function validateAddedPlugins(run: PluginRunner, profile: string, before: Set<string>, explicitDir?: string): Promise<{
    added: string[];
    keep: string[];
    removedBroken: string[];
    conflicts: {
        name: string;
        id: string;
        owner: string;
    }[];
}>;
/**
 * Group flat `{id, owner}` conflict hits by the installed plugin that owns
 * them. What the user has to decide is which PLUGINS to uninstall, not which
 * ids to resolve, so one row per owner is the unit the market renders and
 * acts on. Flattening the other way (one row per id) also misattributes when
 * a candidate clashes with several installed plugins at once.
 * @param conflicts flat hits as returned by {@link validateAddedPlugins}.
 * @returns one entry per owner, owners and ids both in first-seen order.
 */
export declare function groupConflictsByOwner(conflicts: readonly {
    id: string;
    owner: string;
}[]): {
    owner: string;
    ids: string[];
}[];
/**
 * Whether a clean-exit update actually changed nothing — pnpm's
 * minimumReleaseAge silently keeps the old version and exits 0 when the new
 * release is "too young" (#13, #22), so a clean exit alone does not mean the
 * update happened.
 */
export declare function isStaleUpdate(check: {
    isGit: boolean;
    beforeVersion: string | null;
    afterVersion: string | null;
    beforeCommit: string | null;
    afterCommit: string | null;
}): boolean;
/**
 * The package pnpm's fetcher refused to prepare because its build script is
 * not allowlisted — `The git-hosted package "name@2.8.0" needs to execute
 * build scripts but is not in the "allowBuilds" allowlist.` Null when the
 * output is not this failure. Unlike ignored-builds, the package is NOT in
 * node_modules yet (the fetcher rejects before materialization, #68).
 */
export declare function parsePrepareNotAllowed(stdout: string, stderr: string): string | null;
/**
 * Package names pnpm reported as having their build scripts ignored
 * ("Ignored build scripts: esbuild, koffi."). Empty when none.
 * (#6 by @qichuang321.)
 */
export declare function parseIgnoredBuilds(stdout: string, stderr: string): string[];

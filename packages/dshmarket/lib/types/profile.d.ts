/**
 * Profile filesystem reads — everything the market learns from a dsh
 * profile directory (manifest, lockfile, installed package trees). Pure
 * functions of the directory contents; no processes, no network.
 */
/**
 * Whether a profile name follows DSH's own directory-name contract.
 *
 * Keep this aligned with `@deepseek-ai/dsh-app-boot`'s
 * `resolveProfileDir`: dots, spaces, and Unicode are ordinary name
 * characters; only empty, traversal-shaped, launcher-owned, or
 * separator-bearing names are refused.
 */
export declare function isDshProfileName(profile: string): boolean;
/**
 * Resolve a profile name to its directory under DSH_HOME (default ~/.dsh).
 * An explicit directory is used by hosts, such as DSH Desktop, that own the
 * active profile location rather than deriving it from process environment.
 */
export declare function profileDir(profile: string, explicitDir?: string): string;
/**
 * The in-box bundles dsh's profile templates install themselves — the ONLY
 * names the market hides from the installed list. Community plugins may
 * legitimately publish under the official scope (#28), so a whole-scope
 * filter would make them invisible and fail install validation.
 * (Diagnosis and fix proposed in #28 by @Lograthmic.)
 */
export declare const INBOX_BUNDLES: Set<string>;
/** Community dependencies of the profile (in-box bundles filtered out). */
export declare function readInstalled(profile: string, explicitDir?: string): Record<string, string>;
/**
 * RAW dependency map of the profile manifest — including the in-box bundles
 * readInstalled() filters out. This is the rollback snapshot (#65): restoring
 * a filtered view would delete @deepseek-ai/dsh-base and friends.
 */
export declare function readManifestDeps(profile: string, explicitDir?: string): Record<string, string>;
/** Exact rollback state owned by one profile package operation. */
export interface ProfileManifestSnapshot {
    dependencies: Record<string, string>;
    profileBundles: {
        present: false;
    } | {
        present: true;
        value: unknown;
    };
}
/** Read dependencies and the exact `dsh.profile.bundles` field before a package operation. */
export declare function readProfileManifestSnapshot(profile: string, explicitDir?: string): ProfileManifestSnapshot;
/**
 * Restore the profile manifest fields a package operation may mutate:
 * `dependencies` and `dsh.profile.bundles`. pnpm and `dsh plugin add` can
 * write both before a later fetch or build-script failure (#65, #69, #339),
 * leaving either an unresolvable dependency or a bundle the next boot cannot
 * activate. Every unrelated manifest field remains untouched. The lockfile is
 * left as-is; pnpm reconciles it from the manifest on the next run.
 *
 * The write is atomic because rollback runs after another operation already
 * failed; a partial repair must not turn a valid profile into invalid JSON.
 * @returns names whose entries were dropped or reverted, empty when nothing changed.
 */
export declare function restoreProfileManifest(profile: string, snapshot: ProfileManifestSnapshot, explicitDir?: string): string[];
/**
 * Remove a package from BOTH manifest lists — dependencies and
 * dsh.profile.bundles. The uninstall counterpart of restoreProfileManifest:
 * pnpm can fail a remove after deleting node_modules but before saving
 * package.json (the #65 write-order's mirror image — a file locked mid-
 * unlink aborts the run), leaving the manifest pointing at a package that
 * no longer exists on disk. The next boot then fails to activate the ghost
 * dependency. When disk truth says the package is gone, this finishes the
 * removal the CLI could not. Every other manifest field is untouched.
 *
 * Written atomically because it runs only after something already went wrong
 * mid-uninstall, so it is the worst place to leave a half-written manifest.
 * @returns true when either list still mentioned the package.
 */
export declare function dropFromManifest(profile: string, name: string, explicitDir?: string): boolean;
/** The version actually present in the profile's node_modules, or null. */
export declare function readInstalledVersion(profile: string, name: string, explicitDir?: string): string | null;
/** The installed package manifest, or null when absent or malformed. */
export declare function readInstalledManifest(profile: string, name: string, explicitDir?: string): unknown | null;
/**
 * Strong repository identities for a locally linked dependency (#141).
 * Explicit github: specs already carry this evidence; only link:/file: need
 * filesystem discovery. This compatibility wrapper returns only declared
 * package.json identities; Git origins are exposed separately as hints.
 */
export declare function readInstalledRepoIdentities(profile: string, name: string, spec: string, explicitDir?: string): string[];
export interface InstalledRepoEvidence {
    identities: string[];
    hints: string[];
}
/**
 * Discover declared repository identities and weaker local-origin hints. A
 * package.json repository declaration is authoritative; Git origin is only a
 * disambiguation hint because a checkout may legitimately point at a fork.
 */
export declare function readInstalledRepoEvidence(profile: string, name: string, spec: string, explicitDir?: string): InstalledRepoEvidence;
/** Pinned commit per `owner/repo` from the profile lockfile's codeload tarball URLs. */
export declare function readLockCommits(profile: string, explicitDir?: string): Map<string, string>;
/** True when the installed package's manifest declares a dsh plugin surface. */
export declare function hasDshManifest(dir: string): boolean;
/**
 * True when the package's declared entry artifact actually exists — github
 * source checkouts of build-required plugins ship no lib/, and promoting one
 * into the bundle layer bricks the next boot (ERR_MODULE_NOT_FOUND kills the
 * whole profile, #18).
 */
export declare function entryArtifactExists(dir: string): boolean;
/**
 * Package names a bundle patch mounts — the `name:` rows of the package's
 * declared `dsh.bundle.patch` file. Line-wise on purpose: the strict
 * hot-mount parser rejects config/expression rows, but for "what does this
 * bundle bring in" any name row counts.
 */
export declare function bundlePatchTargets(dir: string): string[];
/**
 * Loader entry ids a bundle patch inserts. Cordis refuses to boot a tree
 * with a duplicate entry id ("duplicate loader entry id: storage", #122), so
 * these are what two bundles can collide on.
 */
export declare function bundlePatchEntryIds(dir: string): string[];
/**
 * Loader entry ids the patch INSERTS — the rows the package owns, as opposed
 * to rows of OTHER plugins it merely configures (#147).
 *
 * A bundle patch has two kinds of entry:
 *
 *     - insert:                     ← rows this package brings into the tree
 *         - id: vision-router
 *           name: dsh-vision-router
 *     - id: attachment-local        ← someone else's row, only reconfigured
 *       config: { maxImageBytes: … }
 *
 * Treating both as "this package's rows" made disabling one plugin write
 * `disabled: true` onto the official rows it tuned — killing attachments and
 * the DeepSeek model with it.
 */
export declare function bundlePatchInsertedIds(dir: string): string[];
/**
 * `name:` and `id:` rows of the package's declared bundle patch. Line-wise
 * on purpose: the strict hot-mount parser rejects config/expression rows,
 * but for "what does this bundle bring in" any row counts. `insertedIds` is
 * the subset nested under an `insert:` key (#147).
 */
/**
 * Rows of one patch file. Exported because a package may ship its patch at
 * the conventional path INSTEAD of declaring `dsh.bundle.patch`, and the
 * patch layer has to read that one by the same rules — a second hand-rolled
 * scan drifted from this one and re-introduced #147 on that path (it closed
 * the insert block only on `id:` lines, so `- disable:` followed by nested
 * ids claimed the neighbour's rows).
 */
export declare function parsePatchRows(text: string): {
    names: string[];
    ids: string[];
    insertedIds: string[];
};
/** The profile manifest's `dsh.profile.bundles` — what the CLI reconciled. */
export declare function readProfileBundles(profileDirectory: string): string[];
/**
 * Drop one bundle from the profile manifest's `dsh.profile.bundles`, leaving
 * the package installed as a dependency. This is the carrier-bundle half of a
 * toggle-off (#224): a bundle whose patch reconfigures plugins it does NOT own
 * (dsh-postgres-backends disables session-persistence-jsonl and reroutes
 * storage-domain) keeps applying those side-effect rows on every boot while it
 * stays in the stack, and the #147 ownership rule deliberately never writes
 * them — so removing the bundle from the stack is the only thing that stops
 * them all at once. The package itself stays installed; enabling re-adds it.
 * @returns true when the bundle was present and removed.
 */
export declare function removeProfileBundle(profileDirectory: string, name: string): boolean;
/**
 * Re-add a bundle to `dsh.profile.bundles` after a carrier toggle-off (#224).
 * Idempotent: a bundle already present is left untouched. The name is appended
 * (the install flow appends too); the loader re-validates ordering on the next
 * composition, so a declared before/after rule surfaces there rather than here.
 * @returns true when the bundle was added, false when it was already present.
 */
export declare function addProfileBundle(profileDirectory: string, name: string): boolean;
/**
 * Loader entry ids a newly added package would collide on with bundles the
 * profile ALREADY loads (#122).
 *
 * Cordis hard-fails the whole tree on a duplicate id, so this is not a
 * cosmetic conflict: installing a TUI bundle into a web profile (both
 * declare `id: storage`) leaves DSH unable to start at all, with an error
 * naming neither plugin. Checked against the profile's own bundle list so a
 * package is never compared with itself.
 * @returns colliding ids mapped to the already-installed bundle that owns them.
 */
export declare function conflictingEntryIds(profileDirectory: string, candidate: string, installedBundles: readonly string[]): {
    id: string;
    owner: string;
}[];
/**
 * Whether the loader has anything to load for this package: its own entry
 * artifact, or — for CARRIER bundles — patch rows naming other packages that
 * do have one.
 *
 * Carriers are why `entryArtifactExists` alone is the wrong test (#103):
 * `@linxin666/dsh-skins` ships skin assets plus a patch mounting
 * `@linxin666/dsh-client-ui-skin-center`, and declares no main/exports/
 * index.js of its own. Judged by its own entry it looks like the
 * source-only checkout the #18 guard removes — so the market both flagged it
 * broken AND uninstalled it right after installing.
 * @param profileDirectory - resolved profile directory (host-authoritative under Desktop).
 * @param name - installed package name.
 */
export declare function hasLoadableEntry(profileDirectory: string, name: string): boolean;
/** Plugin subdirectories (depth 2) of a collection checkout, as relative paths. */
export declare function pluginSubdirs(root: string): string[];
/**
 * Allow the given packages' build scripts in the profile's
 * pnpm-workspace.yaml `allowBuilds` block (the key dsh profiles use),
 * merging with existing entries and leaving the rest of the yaml intact.
 * (#6 by @qichuang321.)
 * @returns every package now allowed.
 */
export declare function setAllowBuilds(profile: string, packages: string[], explicitDir?: string): string[];

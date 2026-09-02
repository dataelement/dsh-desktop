/**
 * Patch-layer plugin toggles — hot disable/enable through the profile's
 * user patch layer (cordis.patch.yml), the mechanism ported from
 * Noob-stupid/dsh-plugin-hub's plugin console.
 *
 * DSH composes a web profile from the bundle layers + the user patch layer
 * (`$DSH_HOME/profiles/<name>/cordis.patch.yml`), with per-key override
 * semantics: a patch row `- id: X` + `disabled: true` stops that loader
 * entry, and `disabled: false` force-enables one a lower layer disabled.
 * The profile's config-file watcher (HMR) re-composes within ~1s of the
 * save — no restart — and the loader re-applies the same file on every
 * boot, so the choice survives restarts through the official mechanism.
 *
 * The market ALSO keeps its own in-memory/state.json bookkeeping (hot-mount
 * shims have no bundle row to patch, and the client's disable list drives
 * the switches); this module is the durable, HMR-driven layer on top.
 *
 * Safety (borrowed from the plugin-hub implementation):
 * - writes are serialized so concurrent toggles cannot interleave a
 *   read-modify-write;
 * - an append is REFUSED when the patch file is not a valid entry list —
 *   a malformed file (e.g. a stray `[]` followed by items) is never made
 *   worse, the market reports it instead;
 * - host infrastructure rows (transport / hot-reload / storage / settings
 *   chains) are protected and refuse to toggle.
 */
/** The slice of the loader tree this module needs. */
export interface PatchHost {
    loader: {
        entries(): Iterable<{
            options?: {
                id?: string;
                name?: string;
                config?: {
                    path?: string;
                };
            };
        }>;
    };
}
/** True when the module name sits on the host infrastructure chain. */
export declare function isProtectedModule(moduleName: string | undefined): boolean;
/**
 * Resolve the profile's user patch layer. Prefers the path the loader's
 * cordis:include entry actually read (authoritative under hosts that own
 * the profile directory, like DSH Desktop); falls back to the conventional
 * `<profile>/cordis.patch.yml`.
 */
export declare function findUserPatchPath(host: PatchHost, profileDir: string): string;
/** What the user patch layer currently says about rows. */
export interface PatchState {
    /** Row ids the user patch disables (`disabled: true`). */
    disables: string[];
    /** Row ids the user patch force-enables (`disabled: false`). */
    forced: string[];
    /** Row ids the user patch inserts. */
    inserts: string[];
}
/**
 * Line-wise scan of one patch file — the plugin-hub shapes. Deliberately
 * not a YAML parse: the file may hold structures the market's dialect
 * rejects, but a plain `- id: X` + `disabled: true|false` pair is enough
 * to know what the user patch layer says.
 */
export declare function readUserPatchState(patchPath: string): PatchState;
/**
 * User-authored insert rows that still load `packageName` (or one of its
 * exported subpaths). This evidence deliberately stays separate from the
 * package's own bundle declaration: uninstall may clean market-owned rows,
 * but it must never rewrite an insert the user owns.
 *
 * A missing patch is the ordinary empty-profile shape. `null` means the
 * existing file could not be read as DSH's patch dialect; callers must treat
 * that as indeterminate and refuse the destructive step.
 */
export declare function userPatchPackageReferences(patchPath: string, packageName: string): string[] | null;
/**
 * The user-patch row ids one installed package owns: its bundle patch's
 * insert rows, plus the loader entries currently carrying its name.
 * Empty for client-only packages (no bundle rows) — the market's own
 * state.json mechanism covers those, and there is nothing to patch.
 * Market-owned namespaces (hot-mount `mkt-*`, shim `client-*`) are
 * excluded: their rows live in the market's own include subtree, and a
 * permanent patch row targeting them would be a boot-time orphan.
 */
export declare function rowIdsForPackage(host: PatchHost, profileDirectory: string, packageName: string): string[];
/**
 * The ids of OTHER plugins a package's bundle patch DISABLES — top-level
 * `- id: X` + `disabled: true` rows targeting plugins it does not own. This is
 * the precise marker of a bundle whose toggle-off can brick the boot (#224):
 * dsh-postgres-backends disables session-persistence-jsonl, so once the market
 * also disables the postgres backends nothing provides sessionPersistence.
 *
 * A bundle that merely RECONFIGURES a neighbour is deliberately NOT counted:
 * the e2e fixture-cross tweaks dshm-fixture-b's config, and #147 requires
 * disabling it to leave that neighbour live — dropping such a bundle from the
 * stack broke its re-enable. Config-only side effects stay on the normal #147
 * path; only a foreign `disabled: true` triggers the bundle removal. Removing
 * the bundle still neutralizes any config side effects it carries, since its
 * whole patch stops applying.
 *
 * Reads both patch sources like rowIdsForPackage — the declared dsh.bundle.patch
 * and the conventional root cordis.patch.yml — so either form is detected.
 */
export declare function carrierDisableIds(profileDirectory: string, packageName: string): string[];
/**
 * Per-package patch-layer flags for the installed list: names whose rows the
 * user patch layer disables / force-enables. These cover toggles made
 * OUTSIDE the market (hand-edited cordis.patch.yml, dsh-web-plugin-manager,
 * the dsh CLI), which the market's own state.json never sees.
 */
export declare function packagePatchFlags(host: PatchHost, profileDirectory: string, names: readonly string[], state: PatchState): {
    disabled: string[];
    forced: string[];
};
/** Disable one row: append `- id: X` + `disabled: true` (idempotent). */
export declare function disableRow(patchPath: string, rowId: string): Promise<{
    ok: boolean;
    reason: string | null;
}>;
/** Enable one row: remove the `disabled: true` block; force-enable with
 * `disabled: false` when a lower layer (bundle/home patch) holds it down. */
export declare function enableRow(patchPath: string, rowId: string): Promise<{
    ok: boolean;
    reason: string | null;
}>;
/** Remove every disable/force block the market (or the user) wrote for a
 * row — the uninstall cleanup, so a removed plugin leaves no orphan rows. */
export declare function removeRowBlocks(patchPath: string, rowIds: readonly string[]): void;

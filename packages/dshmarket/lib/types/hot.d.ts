/**
 * Restart-free installs: mount a freshly installed plugin into the running
 * composition through a market-owned Include subtree.
 *
 * Durable state stays with the profile's `dsh.profile.bundles` (reconciled by
 * the dsh CLI at install time), so the next boot loads the plugin through the
 * normal bundle layer. The subtree here exists only for the current process:
 * its input files live under `<profile>/.dsh-market/` and are wiped on every
 * boot, so a crash can never leave a file that collides with the bundle layer
 * (inserting an id the bundle layer also inserts is a hard boot failure).
 * `state.json` in the same directory is the market's own durable state
 * (disable list + custom groups) and deliberately survives the wipe.
 *
 * The Include subclass suppresses `write()` — the loader otherwise persists
 * tree changes back to the file it read (see dsh's agent-presets PresetTree
 * for the in-tree precedent).
 */
import { type Channel } from './channels.ts';
import { type Region } from './regions.ts';
interface HotRow {
    id: string;
    name: string;
}
interface PluginHandle {
    await(): Promise<unknown>;
    dispose(): Promise<unknown> | void;
}
interface HotContext {
    plugin(plugin: unknown, config: unknown): PluginHandle;
    logger?: {
        info?(message: string): void;
        warn(message: string): void;
    };
}
/**
 * Insert rows of a plugin's bundle patch, or null when the patch contains
 * anything beyond plain `id`/`name` insert rows (config blocks, disables,
 * expressions) — those compositions fall back to restart activation.
 */
export declare function parseSimplePatch(patchText: string): HotRow[] | null;
/**
 * Wipe leftover hot-mount inputs; call once when the market host starts.
 * `state.json` (disable choices + groups) deliberately survives.
 */
export declare function cleanHotDir(profileDir: string): void;
/** Persisted market state: the generic disable list plus custom groups. */
export interface MarketState {
    /** Plugins the user switched off; replayed at every boot. */
    disabled: Set<string>;
    /** User-defined plugin groups: group name → member package names. */
    groups: Record<string, string[]>;
    /** Display order of group names; "ungrouped" is implicit and never listed. */
    groupOrder: string[];
    /**
     * The user's own one-line note per installed plugin (#347).
     *
     * A catalog description answers "what is this", written by its author for
     * strangers and often in a language the reader did not pick. It cannot
     * answer "why did I install this" — which is the question someone with
     * forty plugins is actually asking. So a note REPLACES the description on
     * that row, and the original stays one click away.
     *
     * Local state like the disable list and the groups beside it: never sent
     * anywhere, and carried by a backup because it is part of how this profile
     * is set up.
     *
     * Optional on the way IN: several callers build a state object from the
     * few fields they own and hand it to writeMarketState. Requiring this one
     * would make every such call a silent way to erase every note — the exact
     * shape of #339, where a partial snapshot dropped a field nobody was
     * thinking about. Omitting it means "leave them alone" instead.
     */
    notes?: Record<string, string>;
    /**
     * The release channel the user PICKED, absent until they pick one.
     *
     * Absent is not the same as 'stable': with no choice on record the channel
     * is derived from the running build, so installing a prerelease by hand
     * puts you on the beta channel without a second step. Once chosen, the
     * choice is the answer — including "stable" while a beta is running, which
     * is how someone gets back off the channel.
     */
    channel?: Channel;
    /**
     * The download region in force, absent until something has decided one.
     *
     * Absent means "nobody has decided yet", which is what triggers the
     * one-time network probe. Once a value is here — whether the probe wrote
     * it or the user picked it — no further probing happens, so the market
     * does not silently change routes between runs.
     */
    region?: Region;
    /**
     * Whether `region` was chosen by the probe rather than by the user.
     *
     * Only drives a one-time notice explaining why the market picked what it
     * picked. A user who never learns a route was chosen for them has no way
     * to know the setting exists, and no reason to look for it when something
     * downloads oddly.
     */
    regionAuto?: boolean;
}
/**
 * Read the whole market state. Legacy `disabledSkins` (the pre-#60
 * theme-only key) still loads; every new write uses the generic `disabled`
 * key (#60).
 */
/** A note is a label, not a document: one line, bounded so state.json cannot
 * grow without limit from a paste. */
export declare const MAX_NOTE = 200;
export declare function readMarketState(profileDir: string): MarketState;
/**
 * Persist the whole market state.
 *
 * Every field a caller does not carry forward is taken from disk rather than
 * dropped. Several callers legitimately know about only one part of the
 * state — `writeMarketState(dir, { disabled, groups, groupOrder })` appears
 * at five call sites in routes.ts — and before #435 that shape silently
 * erased whatever else the user had chosen:
 *
 * - `channel` and `region` had no fallback at all, so toggling any plugin
 *   threw away the user's update channel and download region. Both are
 *   deliberate choices made through the settings card, and neither has a
 *   "clear it" path: once picked they only ever move to another value. So
 *   an absent one always means "the caller has nothing to say", never
 *   "the user unchose it".
 * `notes` keeps its original rule — an explicit object wins, including an
 * empty one, because deleting the last note has to be expressible. What made
 * #435 lose notes was not this function but a caller: the note route wrote
 * through a fresh read while the long-lived `marketState` in routes.ts still
 * carried `notes: {}` from boot, and the next write from that object put the
 * empty one back. The fix for that belongs at the call site, where the two
 * copies are, not here — see the note route.
 *
 * Reading before writing costs one small JSON parse on an operation that is
 * already doing filesystem work, and it is what makes "this function writes
 * the whole document" safe for callers that only hold part of it.
 */
export declare function writeMarketState(profileDir: string, state: MarketState): void;
/** Plugins the user switched off; skipped by the boot re-mount. */
export declare function readDisabled(profileDir: string): Set<string>;
/** Persist just the disable list, preserving groups and order. */
export declare function writeDisabled(profileDir: string, disabled: Set<string>): void;
/** @deprecated theme-specific alias — kept for pre-#60 callers. */
export declare function readDisabledThemes(profileDir: string): Set<string>;
/** @deprecated theme-specific alias — kept for pre-#60 callers. */
export declare function writeDisabledThemes(profileDir: string, disabled: Set<string>): void;
/** Package names currently live through a market hot mount (patch or shim). */
export declare function listHotMounts(): string[];
/** Outcome of one hot-mount attempt; `reason` explains non-`ok` results. */
export interface HotMountResult {
    ok: boolean;
    /** Bilingual reason shown to the user instead of a bare restart banner. */
    reason: string | null;
}
/**
 * Dispose a plugin hot-mounted earlier in this session, removing it from the
 * running composition immediately.
 * @param packageName - package to unmount.
 * @returns true when a live hot mount was found and disposed.
 */
export declare function hotUnmount(packageName: string): Promise<boolean>;
/**
 * Mount `packageName` (just installed into the profile) into the running
 * composition.
 * @param ctx - market host context; the subtree unwinds with the market's fiber.
 * @param profileDir - profile the package was installed into.
 * @param packageName - installed package to activate.
 * @returns whether the plugin is live without a restart, plus the reason
 * when it is not (P0-2: the UI must distinguish "restart will fix it" from
 * "this package can never hot-mount").
 */
export declare function hotMount(ctx: HotContext, profileDir: string, packageName: string): Promise<HotMountResult>;
/**
 * Mount every installed client-only package (`dsh.client` without
 * `dsh.bundle`) at market startup. The bundle reconcile skips these packages
 * entirely, so without the market's shim their client bundles are unreachable
 * in every boot — this is what makes them behave like normal plugins.
 * @returns names that were mounted.
 */
export declare function mountClientOnlyDeps(ctx: HotContext, profileDir: string): Promise<string[]>;
/**
 * Row ids and package names the user's own patch layer (cordis.patch.yml)
 * already contains. Line-wise scan on purpose: the file may hold structures
 * the market's strict patch parser rejects, but any mention of a row id or
 * package name is enough to know the user manages it (#58).
 */
export declare function readUserPatchControls(profileDir: string): {
    ids: Set<string>;
    names: Set<string>;
};
/**
 * Whether the user patch layer manages `name` — matched by exact package
 * name or by the plugin-manager row-id convention (strip the leading @,
 * non-alphanumerics to '-', lowercase).
 */
export declare function patchLayerManages(controls: {
    ids: Set<string>;
    names: Set<string>;
}, name: string): boolean;
/**
 * Delete the market's own state directory.
 *
 * `cleanHotDir` wipes the ephemeral hot-mount inputs on every boot but
 * deliberately preserves `state.json` — the disable list and custom groups
 * are the user's durable choices. Uninstalling the market is the one moment
 * where removing them is the right thing, and only when the user asked.
 * @returns true when a directory was there to remove.
 */
export declare function purgeMarketState(profileDir: string): boolean;
export {};

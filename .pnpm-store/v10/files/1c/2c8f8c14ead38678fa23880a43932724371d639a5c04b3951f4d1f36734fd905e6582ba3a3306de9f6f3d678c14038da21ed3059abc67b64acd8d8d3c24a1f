/**
 * Shared boot glue for `dsh` profiles, including the CLI packaged by the Python runtime wheel: load the gitignored
 * `.env`, install the fail-loud Loader guards, resolve the config path (snapshot-aware), load the
 * optional user patch layers from the Harness home (`~/.dsh`), expose its path resolver to
 * config expressions, and drive the Cordis Loader against a leaf `cordis.yml` until the tree settles.
 * @module @deepseek-ai/dsh-app-boot
 */
import { Context } from '@deepseek-ai/cordis';
import { type Entry } from '@deepseek-ai/cordis-plugin-loader';
import { type PatchOptions } from '@deepseek-ai/cordis-plugin-include';
import { dshHomePath } from '@deepseek-ai/dsh-home-paths';
import { type LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Harness-home path resolver available to Loader `!!js` config expressions. */
        dshHomePath?: typeof dshHomePath;
    }
}
export { composeEntries, DEFAULT_PROFILE_BUNDLES, DEFAULT_PROFILE_PATCH_RELOAD, healProfilesModuleFallback, initProfile, loadProfile, loadProfileDirectory, PROFILE_PATCH_FILENAME, PROFILE_TEMPLATES, PROFILES_DIR, readProfileManifest, resolveBundleDir, resolveProfileDir, writeProfileManifest, type Profile, type ProfileLayer, type ProfileManifest, type ProfileModuleFallbackOptions, type ProfileTemplate, } from './profile.ts';
/**
 * Resolve the config to boot. Replay swaps a `cordis.yml` basename for
 * `cordis.snapshot.yml` in the same directory; every other mode keeps the path.
 * @param configPath - the requested config path (absolute, or relative to `cwd`).
 * @param snapshotMode - the bin's `$DSH_SNAPSHOT` value; only `'replay'` swaps the
 *   basename.
 * @param cwd - the base a relative `configPath` resolves against.
 * @returns the absolute path of the config to boot.
 */
export declare function resolveConfigPath(configPath: string, snapshotMode: string | undefined, cwd?: string): string;
/**
 * Load the optional gitignored `.env` from `dir`. Missing files fall back to the
 * ambient environment; other read failures are reported through `warn`.
 * @param binName - the diagnostic prefix on the warn line.
 * @param dir - the directory whose `.env` to load.
 * @param warn - sink for the one-line misconfiguration diagnostic.
 */
export declare function loadEnv(binName: string, dir?: string, warn?: (line: string) => void): void;
/**
 * Load the product CLI's inherited > invoking-directory `.env` > Harness-home
 * `.env` snapshot. The Harness home resolves before either file; both files
 * are checked before either is applied, and accepted values are materialized
 * without replacing inherited ones. The snapshot preserves which layer supplied each value.
 * @param binName - the diagnostic prefix on the diagnostics.
 * @param cwd - the invoking directory whose `.env` is the project layer.
 * @param warn - sink for the one-line misconfiguration diagnostics.
 * @returns this run's frozen environment snapshot.
 * @throws when either file declares a bootstrap-only variable, except {@link HOME_LAYER_PROXY_NAMES} in the Harness-home file.
 */
export declare function loadLayeredEnv(binName: string, cwd?: string, warn?: (line: string) => void): LaunchEnvironmentSnapshot;
/** Options for live user patch-layer reconciliation. */
export interface UserPatchWatchOptions {
    /** Diagnostic prefix used by {@link loadOptionalPatches}. */
    binName: string;
    /** Absolute path of the watched patch file (a profile's `cordis.patch.yml`). */
    filename: string;
    /**
     * Compose the full patch list for a fresh user-layer generation —
     * the same composition the app booted with, so a reload can interleave the
     * new user patches between app-owned layers (bundle layers below,
     * overlays above). Identity when omitted: the user layer
     * is the whole patch list.
     */
    compose?: (userPatches: PatchOptions[]) => PatchOptions[];
}
/**
 * Watch the user patch layer through Cordis HMR and transactionally reapply it to the boot include.
 * @param ctx - settled app context containing the root Include and an active HMR service.
 * @param options - diagnostic, file, and patch-composition inputs.
 * @returns an asynchronous disposer after the exact-path watcher is ready.
 * @throws when HMR or the root Include is absent, watcher setup fails, or initial path resolution fails.
 */
export declare function watchUserPatches(ctx: Context, options: UserPatchWatchOptions): Promise<() => Promise<void>>;
/**
 * Load an optional patch-list file: a top-level YAML array of loader patch
 * entries (`@deepseek-ai/cordis-plugin-include`'s `PatchOptions`): id-targeted config
 * overrides and `insert` lists, with `!!js` expressions allowed. A missing
 * file means "no layer"; an unreadable, unparsable, or non-array file throws —
 * a present patch file that cannot apply is a misconfiguration and must fail
 * loud at boot, never be silently skipped.
 * @param binName - the diagnostic prefix on the thrown error.
 * @param file - absolute path of the patch file.
 * @returns the parsed patches, or `undefined` when the file does not exist.
 */
export declare function loadOptionalPatches(binName: string, file: string): PatchOptions[] | undefined;
/**
 * Load a required overlay patch list: a bundle's `cordis.patch.yml` or a
 * `--patch <path>` overlay. Same file format as {@link loadOptionalPatches},
 * but a missing file throws, because the caller named this file — its absence
 * is a misconfiguration, not "no overlay".
 * @param binName - the diagnostic prefix on the thrown error.
 * @param file - absolute path of the overlay file.
 * @returns the parsed patch list.
 */
export declare function loadOverlayPatches(binName: string, file: string): PatchOptions[];
/** One overlay patch list with the source label printed in dump comments. */
export interface ConfigDumpLayer {
    /** Source name shown in dump comments (a file basename or path). */
    label: string;
    /** The layer's patches, from {@link loadOverlayPatches} / {@link loadOptionalPatches}. */
    patches: PatchOptions[];
}
/**
 * Compose the effective entry list exactly as `boot()` would mount it: parse
 * the base config file with the include's entry-list dialect, apply every
 * layer's patches as ONE flattened list through the include's own patch
 * algorithm (`applyEntryPatches`) — the same single call `boot()` makes, so
 * even patch-visibility corner cases (a later layer targeting a group child a
 * plain config replacement introduced, which the single-pass id index never
 * sees) compose identically — then render the result as YAML in the same
 * dialect (`!!js` expressions print verbatim, unevaluated).
 *
 * Every run of rows from the same file and patch layers is preceded by a `# ==` comment
 * naming the file that contributed the rows and any layers that patched them,
 * so the output stays a loadable YAML document while showing which section
 * comes from which file. The file and patch labels are derived from single-call prefix
 * snapshots (base + layers 1..k), diffed positionally: the patch algorithm
 * only rewrites rows in place or appends, so a top-level index identifies one
 * row across snapshots, and a layer whose addition changes the row (config
 * replacement, disable, group insert) is listed as having patched it.
 *
 * A patch that matches no row is reported through `warn` with its layer
 * label, mirroring the Loader's boot-time warning. Earlier layers' patches
 * see an identical preceding state in every snapshot that includes them, so
 * each snapshot's warning list extends the previous one and the new tail
 * belongs to the added layer.
 * @param binName - the diagnostic prefix on read/parse errors.
 * @param absoluteConfigPath - the base config file `boot()` would include.
 * @param layers - overlay layers in application order (later wins).
 * @param warn - sink for skipped-patch diagnostics; defaults to stderr.
 * @returns the composed entry list rendered as a YAML document with
 * source comment separators.
 */
export declare function renderConfigDump(binName: string, absoluteConfigPath: string, layers: ConfigDumpLayer[], warn?: (line: string) => void): string;
/**
 * Mount and remember the exact root Include entry used by app boot and user patch-layer HMR.
 * @param ctx - context carrying an initialized Loader service.
 * @param absoluteConfigPath - absolute YAML or JSON configuration path.
 * @param patches - initial app and user patches, applied in order.
 * @param bareModuleBaseUrl - optional installed-host base for bare package
 * names; relative names continue to resolve beside the configuration file.
 * @returns the created root Include entry, or `undefined` when a surface
 * disposed the whole tree (taking the Loader service with it) while the
 * transactional create was still settling entry lifecycle.
 */
export declare function mountRootInclude(ctx: Context, absoluteConfigPath: string, patches?: readonly PatchOptions[], bareModuleBaseUrl?: string): Promise<Entry | undefined>;
/**
 * The slice of `process` {@link installFailLoud} needs — injectable so tests
 * exercise the handler without registering on (or exiting) the real process.
 */
export interface FailLoudProcess {
    on(event: 'unhandledRejection', handler: (err: unknown) => void): unknown;
    off(event: 'unhandledRejection', handler: (err: unknown) => void): unknown;
    stderr: {
        write(chunk: string): unknown;
    };
    /**
     * Terminate the process. Callers treat this as the end of the run, as
     * `process.exit` is; a fake that returns lets the caller continue, which only
     * a test observes.
     */
    exit(code: number): void;
}
/**
 * How long {@link installFailLoud} waits for its `release` hook before exiting
 * anyway. A wedged disposer must delay the fatal exit, never cancel it.
 */
export declare const FAIL_LOUD_RELEASE_TIMEOUT_MS = 2000;
/**
 * Install before boot to turn a late unhandled plugin-init rejection into one
 * labelled stderr diagnostic and `exit(1)`. A rejection already included by
 * {@link assertEntriesActivated} is ignored during its process checkpoint;
 * every other rejection remains fatal. Stdout remains untouched for ACP; the
 * returned function removes the handler.
 *
 * The Loader mounts entries concurrently, so a surface that owns the terminal
 * can already hold it when a sibling entry rejects. Exiting straight from the
 * handler would strand raw mode, bracketed paste, and the keyboard protocol on
 * the user's shell, and leave an in-flight terminal query's reply to land as
 * literal text at the next prompt. `release` is the terminal owner's chance to
 * hand it back; it is awaited under {@link FAIL_LOUD_RELEASE_TIMEOUT_MS}, whose
 * timer stays referenced so a never-settling disposer cannot let Node reach an
 * empty event loop and exit 0 instead of failing.
 *
 * The diagnostic is written before the release so a hanging or failing disposer
 * cannot swallow the reason. The handler stays installed while the release runs
 * — removing it would let a second concurrent rejection become uncaught and kill
 * the process mid-teardown, stranding exactly the terminal state this restores —
 * so a latch keeps the first rejection the reported one and lets later
 * rejections (including the release's own) fall through to the pending exit.
 * @param binName - the diagnostic prefix on the fatal-failure line.
 * @param proc - the process slice to register on; tests inject a fake.
 * @param release - optional teardown awaited before exit, used by a
 *   terminal-owning surface to restore the terminal. Its own failure is
 *   swallowed because the pending fatal exit already owns the outcome.
 * @returns the uninstaller that removes the rejection handler.
 */
export declare function installFailLoud(binName: string, proc?: FailLoudProcess, release?: () => Promise<void> | void): () => void;
/**
 * After the tree settles, reject entries with no fiber and name every plugin
 * whose module failed to resolve. Disabled entries are the only valid
 * fiber-less state.
 * @param ctx - the settled context whose loader entries to audit.
 * @param binName - the diagnostic prefix on the thrown error.
 */
export declare function assertEntriesLoaded(ctx: Context, binName: string): void;
/**
 * Reject a settled Loader tree when an enabled entry failed or remains inactive.
 * Plugin failures include the original thrown stack; pending entries name their
 * unresolved services because no plugin error exists for that state. Active
 * entries require no further wait; only failed fibers are awaited to recover
 * their private rejection reason.
 * @param ctx - the settled context whose Loader entries to audit.
 * @param binName - the diagnostic prefix on the thrown error.
 * @returns nothing when every enabled entry is active.
 * @throws after one process rejection checkpoint when an entry failed to
 * import, rejected during activation, or did not become active.
 */
export declare function assertEntriesActivated(ctx: Context, binName: string): Promise<void>;
/**
 * Boot the Loader against `absoluteConfigPath` and return only after the whole
 * tree settles. Relative entry names resolve against the config directory;
 * bare package names resolve there by default or against an explicit
 * `bareModuleBaseUrl` for closed packaged runtimes. The bootstrap include
 * is statically imported and mounted as the `cordis:include` builtin, loading
 * through the ambient module pipeline (vite/tsx/plain ESM). The package build
 * embeds Include while leaving Loader external, so the built include tree and
 * host share one Loader peer. Loader
 * settlement rejects startup failures, which `boot` wraps after disposing the
 * partial context; a missing fiber or never-activating entry is rejected by
 * the final audit, {@link assertEntriesActivated}, which rethrows a plugin's
 * init rejection with its original stack; later unhandled rejections remain
 * covered by {@link installFailLoud}. Built bins need the Loader's native
 * helper for bare plugin specifiers; relative specifiers do not.
 * @param binName - the diagnostic prefix for load-failure errors.
 * @param absoluteConfigPath - the config to include; must already be absolute
 * (see {@link resolveConfigPath}).
 * @param patches - optional overlay patches applied over the included tree
 * (see {@link loadOptionalPatches}); an empty list mounts none.
 * @param prepare - optional host setup run after Loader installation and before any config-tree entry mounts.
 * @param bareModuleBaseUrl - optional installed-host base for bare package
 * names; use it when the host, rather than the configuration project, owns the
 * complete plugin set.
 * @returns the root context once every entry has started, or as soon as a
 * surface disposed the tree while startup was still in flight.
 * @throws a labelled error after disposing the partial context — `host
 * preparation failed` when `prepare` threw before any config-tree entry
 * mounted, `plugin tree failed to load` afterwards.
 */
export declare function boot(binName: string, absoluteConfigPath: string, patches?: PatchOptions[], prepare?: (ctx: Context) => Promise<void> | void, bareModuleBaseUrl?: string): Promise<Context>;
/** Prompt-section name for the harness-source location line an app bin adds after boot. */
export declare const HARNESS_SOURCE_SECTION = "harness:source";
/**
 * Add a global prompt section naming the on-disk harness source checkout while
 * explicitly distinguishing it from the task workspace and current working
 * directory. The self-referential `dsh-tool-cordis` toolset reads and edits this
 * checkout. Call once on the settled boot context ({@link boot}); the section
 * uses the shared first-party placement after reusable instructions
 * and before the Web surface and persona suffix. A booted tree with no
 * `systemPrompt` service has no prompt to augment, so this is then a no-op
 * that returns `undefined`. The section is
 * registered against the `systemPrompt` service's fiber, so a dev HMR reload of
 * that plugin drops it until the next boot.
 * @param ctx - the settled boot context whose global system prompt to augment.
 * @param sourceRoot - the absolute path to the harness checkout root.
 * @returns the section disposer, or `undefined` when no `systemPrompt` service is mounted.
 */
export declare function addHarnessSourceSection(ctx: Context, sourceRoot: string): (() => void) | undefined;
//# sourceMappingURL=index.d.ts.map
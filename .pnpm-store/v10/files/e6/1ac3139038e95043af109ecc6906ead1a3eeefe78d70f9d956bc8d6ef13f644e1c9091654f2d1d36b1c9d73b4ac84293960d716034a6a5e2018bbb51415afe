/**
 * Platform resolution for the open-in-app catalog: each entry's locator
 * chain resolves to a verified {@link OpenInAppResolvedLaunch} — a
 * launcher this host actually holds — and one resolution pass yields the
 * map the routes serve and launch from, so a click never re-runs detection.
 * PATH names resolve in-process through the injected subprocess capability;
 * the remaining host commands (`xcode-select`, `reg.exe`) run through
 * `@deepseek-ai/dsh-native-command` (argv, never a shell). Application
 * adapters spawn detached with a credential-scrubbed environment and their
 * declared Windows visibility policy ({@link launchDetachedApp}); `shell-open`
 * launches (the file managers) go through the same package's path opener —
 * the OS shell's open verb — instead of a direct spawn.
 */
import { type NativeCommandRunner } from '@deepseek-ai/dsh-native-command';
import { type OpenInAppApp, type OpenInAppLaunch, type OpenInAppPlatformSpec } from './catalog.ts';
/** Where this host holds one resolved application's icon pixels. */
export type OpenInAppIconSource = {
    readonly kind: 'app-bundle';
    readonly path: string;
} | {
    readonly kind: 'executable';
    readonly path: string;
};
/** One entry's verified launchers and icon source on this host. */
export interface OpenInAppResolvedLaunch {
    readonly launch: OpenInAppLaunch;
    readonly fallbackLaunch?: OpenInAppLaunch | undefined;
    /**
     * Icon pixels source; absent on Linux (the icon route follows the spec's
     * desktop entry instead) and for launchers with no artwork of their own.
     */
    readonly icon?: OpenInAppIconSource | undefined;
}
/** One detached GUI launch: spawn, then watch the window for early failure. */
export type OpenInAppLauncher = (command: string, args: readonly string[], options: {
    readonly watchMs: number;
    readonly env?: Readonly<Record<string, string>> | undefined;
    readonly windowsHide?: boolean | undefined;
}) => Promise<void>;
/** How one launch attempt ended; `missing` marks a stale resolution (ENOENT). */
export type OpenInAppLaunchOutcome = 'launched' | 'missing' | 'failed';
/**
 * Launch one application adapter detached from this process: the child gets a
 * credential-scrubbed environment (never the harness's `*KEY*`/`*SECRET*`
 * variables) plus the adapter's explicit environment entries, holds no stdio
 * pipe, and outlives dsh. Windows GUI processes remain visible unless the
 * adapter explicitly hides its own CLI process. Launch success is decoupled
 * from process exit — launchers such as kitty or the JetBrains IDEs stay in
 * the foreground for their whole window lifetime, so the watch window only
 * catches launchers that fail immediately: rejects on a spawn failure and on
 * a nonzero exit inside the window; a child still running when the window
 * closes is unrefed and counted launched, never killed.
 * @param command - executable path or PATH name.
 * @param args - argv (never a shell string).
 * @param options - watch-window length and adapter-specific process options.
 * @returns after the launch is counted successful; rejects on early failure.
 */
export declare const launchDetachedApp: OpenInAppLauncher;
/** Injectable platform facts for deterministic tests. */
export interface OpenInAppInternals {
    platform?: NodeJS.Platform;
    /** SSH launch fact from the inherited process layer, independent of `.env` values. */
    ssh?: boolean;
    /** Bundle-directory roots replacing `/Applications` and `~/Applications`. */
    applicationRoots?: readonly string[];
    /** Environment for `${VAR}`/`%VAR%` expansion in candidates and registry values. */
    env?: Readonly<Record<string, string | undefined>>;
    /** Home directory replacing a leading `~/` in candidates. */
    home?: string;
    run?: NativeCommandRunner;
    launch?: OpenInAppLauncher;
    /** In-process PATH-name resolution; null when the name is not on PATH. */
    resolveExecutable?: (name: string) => Promise<string | null>;
}
/** Platform facts after the one explicit defaulting step at each public entry. */
export interface ResolvedInternals {
    platform: NodeJS.Platform;
    ssh: boolean;
    applicationRoots: readonly string[];
    env: Readonly<Record<string, string | undefined>>;
    home: string;
    run: NativeCommandRunner;
    launch: OpenInAppLauncher;
    resolveExecutable: (name: string) => Promise<string | null>;
}
/**
 * Resolve the injectable facts against the running host. `resolveExecutable`
 * has no host default — the plugin supplies the composition's subprocess
 * capability — so a caller that omits it fails loud here rather than
 * silently resolving every `cli` locator as missing.
 * @param internals - injectable facts.
 * @returns the completed facts.
 */
export declare function resolveInternals(internals: OpenInAppInternals): ResolvedInternals;
/**
 * Run one bounded host command.
 * @param command - executable path or PATH name.
 * @param args - argv (never a shell string).
 * @param timeoutMs - command deadline.
 * @param internals - completed platform facts.
 * @returns stdout on exit 0; null on any failure (spawn, nonzero exit, timeout).
 */
export declare function output(command: string, args: readonly string[], timeoutMs: number, internals: ResolvedInternals): Promise<string | null>;
/**
 * Probe one path as an existing directory.
 * @param path - candidate path.
 * @returns true when the path exists and is a directory.
 */
export declare function isDirectory(path: string): Promise<boolean>;
/**
 * Probe one path as an existing regular file.
 * @param path - candidate path.
 * @returns true when the path exists and is a regular file.
 */
export declare function isFile(path: string): Promise<boolean>;
/**
 * Expand `${VAR}` references and a leading `~/`. Expansion is string
 * substitution: a candidate keeps its template's `/` separators after the
 * expanded prefix, which Win32 path APIs accept.
 * @param template - candidate template.
 * @param internals - completed platform facts.
 * @returns the expanded candidate, or null when a variable is unset.
 */
export declare function expandCandidate(template: string, internals: ResolvedInternals): string | null;
/** One Windows Uninstall record's fields relevant to launcher derivation. */
interface WindowsInstallRecord {
    readonly displayName: string;
    readonly installLocation?: string | undefined;
    readonly displayIcon?: string | undefined;
}
/** Lazily built Windows registry facts shared by one resolution pass. */
export interface WindowsRegistryView {
    /** Lower-cased registered executable name to its `App Paths` default value. */
    readonly appPaths: ReadonlyMap<string, string>;
    readonly installRecords: readonly WindowsInstallRecord[];
}
/**
 * Parse `reg.exe query <root> /s` output into per-subkey string values.
 * `reg.exe` prints one key path line per subkey followed by indented value
 * lines; the value-name/type/data columns are matched by the `REG_*` type
 * token because the default-value marker localizes (`(Default)`, `(默认)`).
 * @param dump - raw `reg.exe` stdout.
 * @returns subkey path to its `REG_SZ`/`REG_EXPAND_SZ` values by value name
 *   (the default value under the name `(Default)` regardless of locale).
 */
export declare function parseRegistryDump(dump: string): ReadonlyMap<string, ReadonlyMap<string, string>>;
/**
 * Build the Windows registry facts for one resolution pass: the `App Paths`
 * table and the Uninstall records, one `reg.exe query /s` per root. A root
 * that fails or is absent contributes nothing.
 * @param timeoutMs - per-`reg.exe` deadline.
 * @param internals - completed platform facts.
 * @returns the parsed view.
 */
export declare function readWindowsRegistryView(timeoutMs: number, internals: ResolvedInternals): Promise<WindowsRegistryView>;
/** Fields of one parsed XDG desktop entry the resolver and icon route read. */
export interface DesktopEntry {
    readonly exec?: string;
    readonly tryExec?: string;
    readonly icon?: string;
}
/**
 * Parse the `[Desktop Entry]` section's `Exec`/`TryExec`/`Icon` keys.
 * @param text - desktop-entry file text.
 * @returns the recognized fields; keys outside the entry section are ignored.
 */
export declare function parseDesktopEntry(text: string): DesktopEntry;
/**
 * XDG data directories in precedence order (`XDG_DATA_HOME`, then `XDG_DATA_DIRS`).
 * @param internals - completed platform facts.
 * @returns the data directories, freedesktop defaults applied.
 */
export declare function xdgDataDirectories(internals: ResolvedInternals): readonly string[];
/**
 * Read one desktop entry by id from the XDG application directories.
 * @param desktopId - entry id without the `.desktop` suffix.
 * @param internals - completed platform facts.
 * @returns the parsed entry, or null when no directory holds it.
 */
export declare function findDesktopEntry(desktopId: string, internals: ResolvedInternals): Promise<DesktopEntry | null>;
/**
 * First token of an `Exec=` value.
 * @param exec - the raw `Exec=` value, when the entry carries one.
 * @returns the quoted path or the run up to whitespace; null when absent or blank.
 */
export declare function execCommand(exec: string | undefined): string | null;
/**
 * The catalog entry's spec for one platform.
 * @param app - catalog entry.
 * @param platform - host platform.
 * @returns the declared spec; undefined off the declared three platforms.
 */
export declare function specFor(app: OpenInAppApp, platform: NodeJS.Platform): OpenInAppPlatformSpec | undefined;
/**
 * Resolve one catalog entry on this host: this platform's locators are tried
 * in order and the first verified launcher wins.
 * @param app - catalog entry.
 * @param probeTimeoutMs - per-command deadline for resolution host commands.
 * @param internals - platform and runner hooks for deterministic tests.
 * @returns the verified launch, or null during SSH launches or when the entry is not installed here.
 */
export declare function resolveLaunch(app: OpenInAppApp, probeTimeoutMs: number, internals?: OpenInAppInternals): Promise<OpenInAppResolvedLaunch | null>;
/**
 * Resolve the whole catalog once: every entry's verified launcher on this
 * host, in menu order. The Windows registry is read at most once per pass.
 * The returned map is the mutable authority the caller owns — the routes
 * serve its keys and launch from its values, and a stale entry is replaced
 * or removed in place after an `ENOENT` launch.
 * An SSH launch returns an empty map without probing.
 * @param probeTimeoutMs - per-command deadline for resolution host commands.
 * @param internals - platform and runner hooks for deterministic tests.
 * @returns catalog id to verified launch, in catalog order.
 */
export declare function resolveOpenInAppApps(probeTimeoutMs: number, internals?: OpenInAppInternals): Promise<Map<string, OpenInAppResolvedLaunch>>;
/**
 * Launch one resolved application on a directory: the primary launcher, then
 * the fallback when the primary fails inside the watch window.
 * @param resolved - the entry's verified launchers.
 * @param path - absolute workspace directory (already validated by the route).
 * @param watchMs - early-failure watch window per launcher (a child still
 * running when it closes counts as launched and keeps running).
 * @param internals - launcher hook for deterministic tests.
 * @returns how the attempt ended; `missing` when a tried launcher's
 *   executable is gone, which tells the caller to re-resolve once.
 */
export declare function launchResolved(resolved: OpenInAppResolvedLaunch, path: string, watchMs: number, internals?: OpenInAppInternals): Promise<OpenInAppLaunchOutcome>;
export {};
//# sourceMappingURL=resolver.d.ts.map
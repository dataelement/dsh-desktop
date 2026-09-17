/**
 * The open-in-app application catalog: a compile-time table of launchable
 * applications, each declaring per-platform launcher sources tried in order.
 * The table is data only — platform resolution lives in `resolver.ts`, icon
 * extraction in `icons.ts`. A platform with no declared entries resolves as
 * an empty catalog.
 */
/** Platforms the catalog declares entries for; any other host resolves as empty. */
export type OpenInAppPlatform = 'darwin' | 'win32' | 'linux';
/** Launch-args token carrying the workspace directory (`--cd={path}`). */
export declare const PATH_TOKEN = "{path}";
/**
 * How a resolved application takes the workspace directory. `argv` spawns the
 * launcher detached with the directory substituted into (or appended to) its
 * argv. Its optional environment entries overlay the credential-scrubbed
 * parent environment; `windowsHide` is reserved for CLI adapters whose child
 * process opens the visible GUI. `shell-open` hands the directory to the
 * operating system shell's open verb through `dsh-native-command`'s path
 * opener — the channel the file managers use, because they are the OS default
 * for a directory and a direct `explorer.exe <dir>` spawn does not reliably
 * raise a window.
 */
export type OpenInAppLaunch = {
    readonly kind: 'argv';
    readonly command: string;
    readonly args: readonly string[];
    readonly env?: Readonly<Record<string, string>> | undefined;
    readonly windowsHide?: boolean | undefined;
} | {
    readonly kind: 'shell-open';
};
/**
 * How one platform derives a verified launcher. Every kind resolves to an
 * artifact this host actually holds — an existing `.app` bundle, an
 * executable on disk, or a PATH resolution — never a bare install record:
 * `fixed` ships with the OS; `app` checks the known `.app` directories
 * (`/Applications`, `~/Applications`) for the named bundles; `xcode` follows
 * `xcode-select -p` so Beta or renamed installs are found; `cli` resolves a
 * PATH name in-process through the subprocess capability (PATH/PATHEXT stat,
 * no shell, no `which`); `file` takes the first existing expanded candidate;
 * `scan` picks the newest matching versioned install directory (JetBrains on
 * Windows); `app-paths` reads the Windows `App Paths` registry keys;
 * `install-record` reads the Windows Uninstall records and verifies the
 * executable they point at; `github-desktop` resolves GitHub Desktop's
 * versioned executable and packaged CLI together; `desktop` reads a Linux XDG
 * desktop entry and verifies its `TryExec`/`Exec` executable.
 */
export type OpenInAppLocator = {
    readonly kind: 'fixed';
    readonly launch: OpenInAppLaunch;
    /** Icon source template (`.app` directory on macOS, executable on Windows). */
    readonly iconPath: string;
} | {
    readonly kind: 'app';
    readonly fsNames: readonly string[];
} | {
    readonly kind: 'xcode';
} | {
    readonly kind: 'cli';
    readonly name: string;
    readonly args: readonly string[];
    /** Require a desktop session before offering this native GUI launcher. */
    readonly requiresDesktop?: boolean | undefined;
} | {
    readonly kind: 'file';
    readonly candidates: readonly string[];
    readonly args: readonly string[];
} | {
    readonly kind: 'scan';
    readonly root: string;
    readonly namePrefix: string;
    readonly relativeLauncher: string;
    readonly args: readonly string[];
} | {
    readonly kind: 'app-paths';
    readonly exe: string;
    readonly args: readonly string[];
} | {
    readonly kind: 'install-record';
    readonly displayNamePrefix: string;
    /** Launcher under the record's `InstallLocation`; absent means the record's `DisplayIcon` executable. */
    readonly relativeLauncher?: string | undefined;
    readonly args: readonly string[];
} | {
    readonly kind: 'github-desktop';
    readonly root: string;
} | {
    readonly kind: 'desktop';
    readonly desktopId: string;
    readonly args: readonly string[];
};
/** One platform's launcher sources and, on Linux, its icon-owning desktop entry. */
export interface OpenInAppPlatformSpec {
    /** Tried in order; the first locator that yields a verified launcher wins. */
    readonly locators: readonly OpenInAppLocator[];
    /**
     * XDG desktop-entry id whose `Icon=` key names this application's icon
     * (Linux specs only; macOS icons come from the resolved bundle, Windows
     * icons from the resolved executable).
     */
    readonly desktopId?: string;
}
/** One launchable application and the platforms that can offer it. */
export interface OpenInAppApp {
    readonly id: string;
    readonly platforms: Readonly<Partial<Record<OpenInAppPlatform, OpenInAppPlatformSpec>>>;
}
/**
 * The launch catalog in menu order: file managers, editors and IDEs, Git
 * GUIs, terminals. Finder, Terminal, and Explorer ship with their operating
 * systems, so their locators always resolve there. macOS bundle names list
 * the common install spellings; a bundle renamed or moved outside
 * `/Applications` and `~/Applications` is not detected (README Known
 * Limitations).
 */
export declare const OPEN_IN_APP_CATALOG: readonly OpenInAppApp[];
//# sourceMappingURL=catalog.d.ts.map
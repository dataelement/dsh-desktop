/**
 * Theme lifecycle: classifying installed packages as themes (by the
 * registry's theme category), live-toggling bundle-layer entries through
 * the loader, and keeping exactly one theme active with the choice
 * persisted across restarts.
 */
/** The slice of a cordis loader entry the market needs for live enable/disable. */
export interface LoaderEntry {
    options: {
        id?: string;
        name?: string;
        disabled?: boolean | null;
    };
    fiber?: unknown;
    update(options: {
        disabled: boolean | null;
    }, create?: boolean, force?: boolean): Promise<void>;
}
/** The host surface the theme manager needs (loader entries + hot-mount context). */
export interface ThemeHost {
    loader: {
        entries(): Iterable<LoaderEntry>;
    };
    plugin(plugin: unknown, config: unknown): {
        await(): Promise<unknown>;
        dispose(): Promise<unknown> | void;
    };
}
/** Manages theme exclusivity for one profile. */
export interface ThemeManager {
    installedThemeNames(): Promise<Set<string>>;
    setEntryDisabled(name: string, disabledFlag: boolean): Promise<boolean>;
    activateTheme(name: string): Promise<boolean>;
}
/**
 * Create the theme manager. `disabledThemes` is the live, shared set of
 * themes the user switched off — the caller owns reading it at boot and
 * replaying it; the manager mutates and persists it on switches.
 */
export declare function createThemeManager(host: ThemeHost, profile: string, disabledThemes: Set<string>, explicitDir?: string): ThemeManager;

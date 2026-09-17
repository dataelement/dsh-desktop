/** Theme preferences stored in the Host user-settings document. */
import z from '@deepseek-ai/schemastery';
/** Built-in preferences accepted at the registry and settings boundaries. */
export declare const THEME_PREFERENCES: readonly ["light", "dark", "system"];
/** Settings namespace owned by the theme plugin. */
export declare const THEME_SETTINGS_NAMESPACE = "ui-theme";
/** Field carrying the selected built-in theme preference. */
export declare const THEME_PREFERENCE_FIELD = "preference";
/** Field carrying the conversation content font size. */
export declare const FONT_SIZE_FIELD = "fontSize";
/** Theme preference persisted by the product Appearance row. */
export type ThemePreference = typeof THEME_PREFERENCES[number];
/** Default preference when the user-settings document has no override. */
export declare const DEFAULT_PREFERENCE: ThemePreference;
/** Smallest accepted content font size (px). */
export declare const FONT_SIZE_MIN = 12;
/** Largest accepted content font size (px). */
export declare const FONT_SIZE_MAX = 17;
/** Content font size when the user-settings document has no override (px). */
export declare const DEFAULT_FONT_SIZE = 14;
/** Durable theme section shared by the Host schema and the browser scope. */
export interface ThemeSettings {
    /** Selected built-in preference. */
    preference: ThemePreference;
    /** Conversation content font size in px (integer within {@link FONT_SIZE_MIN}..{@link FONT_SIZE_MAX}). */
    fontSize: number;
}
/** Durable theme schema; also the wire envelope the browser scope validates against. */
export declare const ThemeSettingsSchema: z<ThemeSettings>;
/**
 * Narrow one wire or registry value to a persistable preference.
 * @param value - value crossing the settings or registry boundary.
 * @returns whether the value is a built-in preference.
 */
export declare function isThemePreference(value: unknown): value is ThemePreference;
//# sourceMappingURL=theme-settings.d.ts.map
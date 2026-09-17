/**
 * Display resolution for roster presets, shared by every surface that renders
 * preset names: shipped presets resolve through locale dictionary keys, and
 * user-authored metadata is never translated. A pure fold with no imports, so
 * browser bundles inline it and the Host uses the same single home for which
 * shipped id carries which copy key.
 * @module @deepseek-ai/dsh-agent-presets/display
 */
/** Dictionary keys carrying one shipped preset's display copy. */
export type BuiltInPresetCopyKey = 'presetStandardName' | 'presetStandardDescription' | 'presetPtcName' | 'presetPtcDescription' | 'presetMinimalName' | 'presetMinimalDescription' | 'presetCordisName' | 'presetCordisDescription';
/** Preset roster fields needed to resolve display copy. */
export interface PresetDisplaySource {
    /** Stable preset id. */
    readonly id: string;
    /** Whether the deployment ships the preset or the user owns it. */
    readonly trust: 'system' | 'user';
    /** Unlocalized name published by the preset. */
    readonly name?: string;
    /** Unlocalized description published by the preset. */
    readonly description?: string;
}
/** Display copy resolved for the active locale. */
export interface PresetDisplayText {
    /** Localized built-in name or the preset's own fallback name. */
    readonly name: string;
    /** Localized built-in description or the preset's own description. */
    readonly description?: string;
}
/**
 * Resolve preset display copy without making user-authored metadata translatable.
 * @param preset - roster row whose copy is being rendered.
 * @param t - active locale lookup covering {@link BuiltInPresetCopyKey}.
 * @returns localized copy for a known shipped preset, otherwise file metadata.
 */
export declare function presetDisplayText(preset: PresetDisplaySource, t: (key: BuiltInPresetCopyKey) => string): PresetDisplayText;
//# sourceMappingURL=display.d.ts.map
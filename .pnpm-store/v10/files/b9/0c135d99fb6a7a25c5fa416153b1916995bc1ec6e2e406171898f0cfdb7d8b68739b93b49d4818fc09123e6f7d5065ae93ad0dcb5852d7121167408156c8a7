/**
 * Display resolution for roster presets, shared by every surface that renders
 * preset names: shipped presets resolve through locale dictionary keys, and
 * user-authored metadata is never translated. A pure fold with no imports, so
 * browser bundles inline it and the Host uses the same single home for which
 * shipped id carries which copy key.
 * @module @deepseek-ai/dsh-agent-presets/display
 */
const BUILT_IN_PRESET_KEYS = {
    standard: { name: 'presetStandardName', description: 'presetStandardDescription' },
    ptc: { name: 'presetPtcName', description: 'presetPtcDescription' },
    minimal: { name: 'presetMinimalName', description: 'presetMinimalDescription' },
    cordis: { name: 'presetCordisName', description: 'presetCordisDescription' },
};
/**
 * Resolve preset display copy without making user-authored metadata translatable.
 * @param preset - roster row whose copy is being rendered.
 * @param t - active locale lookup covering {@link BuiltInPresetCopyKey}.
 * @returns localized copy for a known shipped preset, otherwise file metadata.
 */
export function presetDisplayText(preset, t) {
    const keys = preset.trust === 'system' ? BUILT_IN_PRESET_KEYS[preset.id] : undefined;
    if (keys !== undefined)
        return { name: t(keys.name), description: t(keys.description) };
    return {
        name: preset.name ?? preset.id,
        ...preset.description === undefined ? {} : { description: preset.description },
    };
}
//# sourceMappingURL=display.js.map
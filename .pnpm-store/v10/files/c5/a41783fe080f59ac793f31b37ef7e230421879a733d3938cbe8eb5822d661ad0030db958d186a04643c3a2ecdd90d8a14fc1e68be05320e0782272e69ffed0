/**
 * Parse a hex color string (with or without '#') into RGB components.
 */
export declare function hexToRgb(hex: string): {
    r: number;
    g: number;
    b: number;
};
/**
 * Convert RGB components (0-255 each) to a 6-digit hex string with '#' prefix.
 */
export declare function rgbToHex(r: number, g: number, b: number): string;
/**
 * Convert RGB (0-255) to HSL (h: 0-360, s: 0-1, l: 0-1).
 */
export declare function rgbToHsl(r: number, g: number, b: number): {
    h: number;
    s: number;
    l: number;
};
/**
 * Convert HSL (h: 0-360, s: 0-1, l: 0-1) to RGB (0-255).
 */
export declare function hslToRgb(h: number, s: number, l: number): {
    r: number;
    g: number;
    b: number;
};
/**
 * Apply tint modifier (mix toward white in linear RGB space).
 * OOXML spec: tint val is 0-100000 where 100000 = original color, 0 = fully white.
 * PowerPoint performs the blend in linear RGB space for perceptual correctness.
 */
export declare function applyTint(hex: string, tint: number): string;
/**
 * Apply shade modifier (mix toward black in linear RGB space).
 * shade: 0-100000 where 100000 = original color, 0 = fully black.
 */
export declare function applyShade(hex: string, shade: number): string;
/**
 * Apply luminance modulation.
 * lumMod: percentage in OOXML units (e.g., 75000 = 75%).
 * Multiplies the L channel of HSL.
 */
export declare function applyLumMod(hex: string, lumMod: number): string;
/**
 * Apply luminance offset.
 * lumOff: percentage offset in OOXML units (e.g., 25000 = +25%).
 * Adds to the L channel of HSL.
 */
export declare function applyLumOff(hex: string, lumOff: number): string;
/**
 * Apply saturation modulation.
 * satMod: percentage in OOXML units (e.g., 120000 = 120%).
 * Multiplies the S channel of HSL.
 */
export declare function applySatMod(hex: string, satMod: number): string;
/**
 * Apply hue modulation.
 * hueMod: percentage in OOXML units (e.g., 60000 = shift hue by ratio).
 * In OOXML, hueMod multiplies the hue value. Hue wraps around at 360.
 */
export declare function applyHueMod(hex: string, hueMod: number): string;
/**
 * Apply hue offset (additive).
 * hueOff: in 60000ths of a degree (OOXML ST_FixedAngle).
 * Adds to the hue channel of HSL, wrapping at 360.
 */
export declare function applyHueOff(hex: string, hueOff: number): string;
/**
 * Apply saturation offset (additive).
 * satOff: in OOXML percentage units (100000 = 100%).
 * Adds to the S channel of HSL.
 */
export declare function applySatOff(hex: string, satOff: number): string;
/**
 * Convert OOXML alpha value (0-100000) to CSS opacity (0-1).
 * 100000 = fully opaque, 0 = fully transparent.
 */
export declare function applyAlpha(alpha: number): number;
export interface ColorModifier {
    name: string;
    val: number;
}
/**
 * Apply all OOXML color modifiers from an array of {name, val} objects.
 * Modifiers are applied in the order they appear (matching XML document order).
 * Returns the final hex color and alpha value.
 */
export declare function applyColorModifiers(hex: string, modifiers: ColorModifier[]): {
    color: string;
    alpha: number;
};
/**
 * Look up a preset OOXML color name and return its hex value.
 * Returns undefined if the name is not recognized.
 */
export declare function presetColorToHex(name: string): string | undefined;

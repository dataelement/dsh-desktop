/**
 * Preset shape SVG path generators for OOXML preset geometry types.
 *
 * Each generator takes width, height, and optional adjustment values,
 * returning an SVG path d-attribute string.
 *
 * Adjustment values follow OOXML convention: values are in 100000ths
 * (so 50000 = 50%).
 */
type PresetShapeGenerator = (w: number, h: number, adjustments?: Map<string, number>) => string;
export declare const presetShapes: Map<string, PresetShapeGenerator>;
/**
 * Get the SVG path for the icon overlay of an action button.
 * Returns undefined if the shape is not an action button or is actionButtonBlank.
 */
export declare function getActionButtonIconPath(shapeType: string, w: number, h: number): string | undefined;
/**
 * Get the SVG path for a preset shape, falling back to a simple rectangle
 * if the shape type is not implemented.
 */
export interface PresetOverlay {
    /** SVG path d-attribute for the overlay */
    path: string;
    /** Fill modifier: 'lighten' brightens the base fill */
    fillModifier: 'lighten';
}
export type PresetOverlayGenerator = (w: number, h: number, adjustments?: Map<string, number>) => PresetOverlay[];
/**
 * Get overlay paths for a preset shape (3D top faces, etc.).
 * Returns empty array if the shape has no overlays.
 */
export declare function getPresetOverlays(shapeType: string, w: number, h: number, adjustments?: Map<string, number>): PresetOverlay[];
/** A single sub-path within a multi-path preset shape. */
export interface PresetSubPath {
    /** SVG path d-attribute string */
    d: string;
    /**
     * Fill behavior:
     * - 'norm': use the shape's normal fill
     * - 'darken': darken the base fill (multiply with ~60% gray)
     * - 'darkenLess': slightly darken (multiply with ~80% gray)
     * - 'lighten': lighten the base fill
     * - 'lightenLess': slightly lighten
     * - 'none': no fill (stroke-only detail lines)
     */
    fill: 'norm' | 'darken' | 'darkenLess' | 'lighten' | 'lightenLess' | 'none';
    /** Whether this path should have a stroke (default true) */
    stroke: boolean;
    /** Optional stroke width multiplier for detail lines that should render lighter than the outline. */
    strokeWidthScale?: number;
    /** Restrict visibility of this detail path to a stroke band around the main outline path. */
    maskToMainOutline?: boolean;
    /** Optional scale for the outline-band mask stroke width. */
    maskStrokeScale?: number;
    /** Restrict visibility of this detail path to the band between the main outline and an inset-scaled outline. */
    maskToMainOutlineBandScale?: number;
}
/**
 * Get multi-path preset sub-paths for a shape type.
 * Returns null if the shape is not a multi-path preset (use getPresetShapePath instead).
 */
export declare function getMultiPathPreset(shapeType: string, w: number, h: number, adjustments?: Map<string, number>): PresetSubPath[] | null;
export declare function getPresetShapePath(shapeType: string, w: number, h: number, adjustments?: Map<string, number>): string;
export {};

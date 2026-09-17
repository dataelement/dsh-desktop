/**
 * Style resolver — converts OOXML color and fill nodes to CSS values.
 */
import { SafeXmlNode } from '../parser/XmlParser';
import { RenderContext } from './RenderContext';
/**
 * Resolve an OOXML color node (srgbClr, schemeClr, sysClr, prstClr, hslClr, scrgbClr)
 * into a CSS-ready hex color and alpha value.
 */
export declare function resolveColor(colorNode: SafeXmlNode, ctx: RenderContext): {
    color: string;
    alpha: number;
};
/**
 * Resolve a color node and return a CSS color string.
 * Convenience wrapper combining resolveColor + colorToCss.
 */
export declare function resolveColorToCss(node: SafeXmlNode, ctx: RenderContext): string;
/**
 * Resolve a fill from shape properties (spPr) into a CSS background value.
 *
 * Returns:
 *   - CSS color/gradient string for solidFill/gradFill
 *   - 'transparent' for noFill
 *   - '' for blipFill (handled by ImageRenderer) or no fill found (inherit)
 */
export declare function resolveFill(spPr: SafeXmlNode, ctx: RenderContext): string;
/**
 * Resolve a line (outline) node into CSS-compatible properties.
 *
 * @param ln       The `<a:ln>` node from spPr
 * @param ctx      Render context
 * @param lnRef    Optional `<a:lnRef>` from `<p:style>` — provides fallback color
 *                 when `<a:ln>` has no explicit solidFill (common for connectors)
 */
export declare function resolveLineStyle(ln: SafeXmlNode, ctx: RenderContext, lnRef?: SafeXmlNode): {
    width: number;
    color: string;
    dash: string;
    dashKind: string;
};
export interface GradientFillData {
    type: 'linear' | 'radial';
    stops: Array<{
        position: number;
        color: string;
    }>;
    /** SVG gradient interpolation space; OOXML gradients visually match linearRGB more closely. */
    colorInterpolation?: 'linearRGB' | 'sRGB';
    /** OOXML angle in degrees (0 = top-to-bottom). Only relevant for linear gradients. */
    angle: number;
    /** Radial gradient center X as fraction 0–1. Default 0.5. */
    cx?: number;
    /** Radial gradient center Y as fraction 0–1. Default 0.5. */
    cy?: number;
    /** OOXML path type for radial gradients: 'rect', 'circle', or 'shape'. */
    pathType?: string;
    /** OOXML fillToRect focus rectangle, expressed as relative offsets from the tile edge. */
    fillToRect?: GradientFocusRect;
}
export interface GradientFocusRect {
    l: number;
    t: number;
    r: number;
    b: number;
}
export declare function getGradientFocusOffset(gradientFillData: Pick<GradientFillData, 'fillToRect' | 'cx' | 'cy'>, options?: {
    axis?: 'x' | 'y' | 'radial';
    width?: number;
    height?: number;
}): number;
export declare function getFocusedGradientStops(gradientFillData: Pick<GradientFillData, 'stops' | 'fillToRect' | 'cx' | 'cy'>, options?: {
    axis?: 'x' | 'y' | 'radial';
    width?: number;
    height?: number;
}): Array<{
    position: number;
    color: string;
}>;
/**
 * Resolve a gradient fill from `spPr` into structured data suitable for
 * creating SVG gradient elements. Returns null if no gradient fill is present.
 */
export declare function resolveGradientFill(spPr: SafeXmlNode, ctx: RenderContext): GradientFillData | null;
export declare function resolveThemeFillReference(fillRef: SafeXmlNode, ctx: RenderContext): {
    fillCss: string;
    gradientFillData: GradientFillData | null;
};
export declare function resolveThemeBackgroundFillReference(bgRef: SafeXmlNode, ctx: RenderContext): {
    fillCss: string;
    gradientFillData: GradientFillData | null;
};
export interface GradientStrokeData {
    stops: Array<{
        position: number;
        color: string;
    }>;
    angle: number;
    width: number;
    colorInterpolation?: 'linearRGB' | 'sRGB';
}
/**
 * Resolve a gradient stroke from an `<a:ln>` node that contains `<a:gradFill>`.
 * Returns gradient stop data, angle, and line width — or null if no gradient fill is present.
 */
export declare function resolveGradientStroke(ln: SafeXmlNode, ctx: RenderContext): GradientStrokeData | null;

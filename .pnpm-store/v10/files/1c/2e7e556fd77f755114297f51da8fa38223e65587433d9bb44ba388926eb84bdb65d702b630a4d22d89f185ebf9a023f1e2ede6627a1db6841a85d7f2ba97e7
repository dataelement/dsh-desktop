/**
 * Text renderer — converts OOXML text body into HTML DOM elements
 * with full 7-level style inheritance.
 */
import { RenderContext } from './RenderContext';
import type { TextBody } from '../model/nodes/ShapeNode';
import { PlaceholderInfo } from '../model/nodes/BaseNode';
/**
 * Render a text body into the provided container element.
 *
 * Implements style inheritance:
 * 1. presentation.defaultTextStyle
 * 2. master.defaultTextStyle
 * 3. master.textStyles[category] (titleStyle / bodyStyle / otherStyle)
 * 4. master placeholder lstStyle
 * 5. layout placeholder lstStyle
 * 6. shape lstStyle
 * 7. paragraph pPr
 * 8. run rPr
 */
/** Optional overrides when rendering text (e.g. table cell style text properties from tcTxStyle). */
interface RenderTextBodyOptions {
    /** When set, used as text color when the run has no explicit color (e.g. table style tcTxStyle). */
    cellTextColor?: string;
    /** When set, applies bold from table style tcTxStyle (overrides inherited, yields to explicit run rPr). */
    cellTextBold?: boolean;
    /** When set, applies italic from table style tcTxStyle (overrides inherited, yields to explicit run rPr). */
    cellTextItalic?: boolean;
    /** When set, applies font family from table style tcTxStyle (overrides inherited, yields to explicit run rPr). */
    cellTextFontFamily?: string | string[];
    /** fontRef color from shape style (e.g. SmartArt). Overrides inherited styles but yields to explicit run rPr color. */
    fontRefColor?: string;
    /** True when the text container uses vertical writing mode. */
    isVerticalText?: boolean;
    /** Fallback CSS line-height when OOXML inheritance does not specify one. */
    defaultLineHeight?: string;
    /** Collapse paragraph spacing outside the first/last visible paragraph. */
    trimOuterParagraphSpacing?: boolean;
    /** Treat absolute line spacing as inter-line spacing for a single-line paragraph. */
    compactSingleLineSpacing?: boolean;
}
export declare function renderTextBody(textBody: TextBody, placeholder: PlaceholderInfo | undefined, ctx: RenderContext, container: HTMLElement, options?: RenderTextBodyOptions): void;
export {};

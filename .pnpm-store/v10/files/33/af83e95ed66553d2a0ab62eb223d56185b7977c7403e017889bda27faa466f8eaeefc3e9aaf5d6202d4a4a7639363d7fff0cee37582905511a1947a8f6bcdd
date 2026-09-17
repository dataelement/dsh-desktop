/**
 * Slide layout parser — extracts color map override, background,
 * and placeholder shapes from a p:sldLayout XML.
 */
import { SafeXmlNode } from '../parser/XmlParser';
export interface PlaceholderXfrm {
    position: {
        x: number;
        y: number;
    };
    size: {
        w: number;
        h: number;
    };
}
export interface PlaceholderEntry {
    node: SafeXmlNode;
    /** When placeholder is inside a group, position/size in slide space (px). */
    absoluteXfrm?: PlaceholderXfrm;
}
export interface LayoutData {
    colorMapOverride?: Map<string, string>;
    background?: SafeXmlNode;
    placeholders: PlaceholderEntry[];
    spTree: SafeXmlNode;
    rels: Map<string, import('../parser/RelParser').RelEntry>;
    /** When false, shapes from the slide master should NOT be rendered on this layout. */
    showMasterSp: boolean;
}
/**
 * Parse a slide layout XML root (`p:sldLayout`) into LayoutData.
 */
export declare function parseLayout(root: SafeXmlNode): LayoutData;

/**
 * Base node types and property parser shared by all slide node kinds.
 */
import { SafeXmlNode } from '../../parser/XmlParser';
export type NodeType = 'shape' | 'picture' | 'table' | 'group' | 'chart' | 'unknown';
export interface Position {
    x: number;
    y: number;
}
export interface Size {
    w: number;
    h: number;
}
export interface PlaceholderInfo {
    type?: string;
    idx?: number;
}
/** Shape-level hyperlink click action (from cNvPr > a:hlinkClick). */
export interface HlinkAction {
    /** Action URI, e.g. "ppaction://hlinksldjump", "ppaction://hlinkpres", or empty for URL links. */
    action?: string;
    /** Relationship ID for the target (slide, URL, etc.). */
    rId?: string;
    /** Optional tooltip text. */
    tooltip?: string;
}
export interface BaseNodeData {
    id: string;
    name: string;
    nodeType: NodeType;
    position: Position;
    size: Size;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    placeholder?: PlaceholderInfo;
    /** Shape-level hyperlink/click action (action buttons, clickable shapes). */
    hlinkClick?: HlinkAction;
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    source: SafeXmlNode;
}
/**
 * Parse the base properties common to all node types from a shape-like XML node.
 * Returns everything except `nodeType`, which the caller must set.
 */
export declare function parseBaseProps(spNode: SafeXmlNode): Omit<BaseNodeData, 'nodeType'>;

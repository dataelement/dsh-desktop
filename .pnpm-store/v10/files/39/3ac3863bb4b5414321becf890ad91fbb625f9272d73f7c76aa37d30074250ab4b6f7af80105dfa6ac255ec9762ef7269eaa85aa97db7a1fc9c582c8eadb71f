/**
 * Group node parser — handles grouped shapes (p:grpSp).
 */
import { SafeXmlNode } from '../../parser/XmlParser';
import { BaseNodeData, Position, Size } from './BaseNode';
export interface GroupNodeData extends BaseNodeData {
    nodeType: 'group';
    childOffset: Position;
    childExtent: Size;
    /** @internal Raw XML nodes — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    children: SafeXmlNode[];
}
/**
 * Parse a group shape XML node (`p:grpSp`) into GroupNodeData.
 */
export declare function parseGroupNode(grpNode: SafeXmlNode): GroupNodeData;

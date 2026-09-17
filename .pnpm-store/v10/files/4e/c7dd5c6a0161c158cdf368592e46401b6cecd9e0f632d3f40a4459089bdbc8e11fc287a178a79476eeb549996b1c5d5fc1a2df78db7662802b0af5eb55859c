/**
 * Table node parser — handles graphicFrame elements containing a:tbl.
 */
import { SafeXmlNode } from '../../parser/XmlParser';
import { BaseNodeData } from './BaseNode';
import { TextBody } from './ShapeNode';
export interface TableCell {
    gridSpan: number;
    rowSpan: number;
    hMerge: boolean;
    vMerge: boolean;
    textBody?: TextBody;
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    properties?: SafeXmlNode;
}
export interface TableRow {
    height: number;
    cells: TableCell[];
}
export interface TableNodeData extends BaseNodeData {
    nodeType: 'table';
    columns: number[];
    rows: TableRow[];
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    properties?: SafeXmlNode;
    tableStyleId?: string;
}
/**
 * Parse a graphicFrame XML node containing a table into TableNodeData.
 */
export declare function parseTableNode(frameNode: SafeXmlNode): TableNodeData;

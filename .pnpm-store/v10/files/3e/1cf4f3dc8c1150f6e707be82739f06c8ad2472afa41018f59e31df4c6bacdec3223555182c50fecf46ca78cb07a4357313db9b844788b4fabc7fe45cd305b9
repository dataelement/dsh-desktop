/**
 * Table renderer — converts TableNodeData into positioned HTML table elements.
 *
 * Table style behavior follows:
 * - OOXML ECMA-376 §21.1.3.15 tblPr: firstRow, firstCol, bandRow, bandCol, lastRow, lastCol
 *   are attributes; when not specified they default to off (no styling).
 * - references/pptxjs (gen-table.ts, get-table-row-style.ts, get-table-cell-params.ts):
 *   reads tblPr attrs only (e.g. firstCol === "1"), applies style parts when attr is "1",
 *   and uses tcTxStyle from each part for cell text color/font (a:tcTxStyle under firstRow, firstCol, etc.).
 */
import { TableNodeData } from '../model/nodes/TableNode';
import { RenderContext } from './RenderContext';
/**
 * Render a table node into an absolutely-positioned HTML element.
 */
export declare function renderTable(node: TableNodeData, ctx: RenderContext): HTMLElement;

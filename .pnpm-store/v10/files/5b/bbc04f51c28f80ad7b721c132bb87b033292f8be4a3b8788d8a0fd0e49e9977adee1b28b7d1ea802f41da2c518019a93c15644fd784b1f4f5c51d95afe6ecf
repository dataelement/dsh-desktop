/**
 * Chart node — represents a chart embedded in a graphicFrame element.
 */
import { SafeXmlNode } from '../../parser/XmlParser';
import { RelEntry } from '../../parser/RelParser';
import { BaseNodeData } from './BaseNode';
export interface ChartNodeData extends BaseNodeData {
    nodeType: 'chart';
    chartPath: string;
}
/**
 * Parse a graphicFrame containing a chart reference into a ChartNodeData.
 *
 * @param graphicFrame  The graphicFrame XML node
 * @param slideRels     Relationship entries for the containing slide
 * @param slidePath     Full path of the slide (e.g. "ppt/slides/slide1.xml")
 */
export declare function parseChartNode(graphicFrame: SafeXmlNode, slideRels: Map<string, RelEntry>, slidePath: string): ChartNodeData | undefined;

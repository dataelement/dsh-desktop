import { SafeXmlNode } from '../parser/XmlParser';
import { RelEntry } from '../parser/RelParser';
import { ShapeNodeData } from './nodes/ShapeNode';
import { PicNodeData } from './nodes/PicNode';
import { TableNodeData } from './nodes/TableNode';
import { GroupNodeData } from './nodes/GroupNode';
import { ChartNodeData } from './nodes/ChartNode';
export type RenderableNode = ShapeNodeData | PicNodeData | TableNodeData | GroupNodeData | ChartNodeData;
interface RenderableChildParseContext {
    rels: Map<string, RelEntry>;
    partPath?: string;
    diagramDrawings?: Map<string, string>;
    skipPlaceholders?: boolean;
}
export declare function isPlaceholderNode(node: SafeXmlNode): boolean;
export declare function parseOleFrameAsPicture(graphicFrame: SafeXmlNode): PicNodeData | undefined;
export declare function parseRenderableChild(childXml: SafeXmlNode, ctx: RenderableChildParseContext): RenderableNode | undefined;
export {};

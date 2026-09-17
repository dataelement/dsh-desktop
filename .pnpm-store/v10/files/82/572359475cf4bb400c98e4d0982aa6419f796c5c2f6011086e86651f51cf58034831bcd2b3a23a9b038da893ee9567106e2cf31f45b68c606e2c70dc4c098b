/**
 * Serialize PresentationData into a plain JSON-serializable structure.
 * Strips all SafeXmlNode references and re-parses group children.
 */
import { PresentationData } from '../model/Presentation';
interface SerializedParagraph {
    level: number;
    text: string;
}
interface SerializedTextBody {
    paragraphs: SerializedParagraph[];
    totalText: string;
}
interface SerializedCell {
    text: string;
    gridSpan: number;
    rowSpan: number;
}
interface SerializedRow {
    height: number;
    cells: SerializedCell[];
}
export interface SerializedNode {
    id: string;
    name: string;
    nodeType: string;
    position: {
        x: number;
        y: number;
    };
    size: {
        w: number;
        h: number;
    };
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    presetGeometry?: string;
    textBody?: SerializedTextBody;
    columns?: number[];
    rows?: SerializedRow[];
    tableStyleId?: string;
    blipEmbed?: string;
    chartPath?: string;
    children?: SerializedNode[];
}
export interface SerializedSlide {
    index: number;
    hidden?: boolean;
    nodes: SerializedNode[];
}
export interface SerializedPresentation {
    width: number;
    height: number;
    slideCount: number;
    slides: SerializedSlide[];
}
export declare function serializePresentation(pres: PresentationData): SerializedPresentation;
export {};

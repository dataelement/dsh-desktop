/**
 * Shape node parser — handles auto-shapes, text boxes, and connectors.
 */
import { SafeXmlNode } from '../../parser/XmlParser';
import { BaseNodeData } from './BaseNode';
export interface TextRun {
    text: string;
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    properties?: SafeXmlNode;
}
export interface TextParagraph {
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    properties?: SafeXmlNode;
    runs: TextRun[];
    level: number;
    /** @internal End-of-paragraph run properties (a:endParaRPr). Defines font size for trailing paragraph mark. */
    endParaRPr?: SafeXmlNode;
}
export interface TextBody {
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    bodyProperties?: SafeXmlNode;
    /** @internal Fallback bodyPr from layout/master placeholder (used when shape's own bodyPr is missing attrs). */
    layoutBodyProperties?: SafeXmlNode;
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    listStyle?: SafeXmlNode;
    paragraphs: TextParagraph[];
}
export interface LineEndInfo {
    type: string;
    w?: string;
    len?: string;
}
/** Text box bounds in shape-local coordinates (used by diagram shapes with txXfrm). */
export interface TextBoxBounds {
    x: number;
    y: number;
    w: number;
    h: number;
    rotation?: number;
}
export interface ShapeNodeData extends BaseNodeData {
    nodeType: 'shape';
    presetGeometry?: string;
    adjustments: Map<string, number>;
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    customGeometry?: SafeXmlNode;
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    fill?: SafeXmlNode;
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    line?: SafeXmlNode;
    headEnd?: LineEndInfo;
    tailEnd?: LineEndInfo;
    textBody?: TextBody;
    /** When set (e.g. diagram txXfrm), text is laid out in this rect instead of full shape. */
    textBoxBounds?: TextBoxBounds;
}
/**
 * Parse a text body (`p:txBody` or `a:txBody`).
 */
export declare function parseTextBody(txBody: SafeXmlNode): TextBody | undefined;
/**
 * Parse a shape XML node (`p:sp` or `p:cxnSp`) into ShapeNodeData.
 */
export declare function parseShapeNode(spNode: SafeXmlNode): ShapeNodeData;

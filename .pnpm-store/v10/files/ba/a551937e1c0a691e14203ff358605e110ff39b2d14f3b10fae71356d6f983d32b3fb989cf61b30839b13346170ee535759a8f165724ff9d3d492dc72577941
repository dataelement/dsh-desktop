/**
 * Picture node parser — handles images, video placeholders, and audio placeholders.
 */
import { SafeXmlNode } from '../../parser/XmlParser';
import { BaseNodeData } from './BaseNode';
export interface CropRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
}
export interface PicNodeData extends BaseNodeData {
    nodeType: 'picture';
    blipEmbed?: string;
    blipLink?: string;
    crop?: CropRect;
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    fill?: SafeXmlNode;
    /** @internal Raw XML node — opaque to consumers. Use serializePresentation() for JSON-safe data. */
    line?: SafeXmlNode;
    /** Picture preset geometry, when the picture is clipped to a non-rectangular preset. */
    presetGeometry?: string;
    /** @internal Raw custom geometry used to clip the picture fill. */
    customGeometry?: SafeXmlNode;
    isVideo?: boolean;
    isAudio?: boolean;
    mediaRId?: string;
}
/**
 * Parse a picture XML node (`p:pic`) into PicNodeData.
 */
export declare function parsePicNode(picNode: SafeXmlNode): PicNodeData;

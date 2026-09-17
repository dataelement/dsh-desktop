import { SafeXmlNode } from '../parser/XmlParser';
import type { TextBody } from '../model/nodes/ShapeNode';
/**
 * Resolve a child under the effective bodyPr for a text body.
 *
 * Slide-level bodyPr wins. Layout/master bodyPr is a fallback and is used when
 * the slide shape omits the child entirely, matching placeholder inheritance.
 */
export declare function getEffectiveBodyPrChild(textBody: TextBody | undefined, childName: string): SafeXmlNode | undefined;

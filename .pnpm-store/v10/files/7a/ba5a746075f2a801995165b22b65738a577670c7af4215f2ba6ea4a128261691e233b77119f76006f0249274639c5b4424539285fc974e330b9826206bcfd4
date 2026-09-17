/**
 * Image renderer — converts PicNodeData into positioned HTML image/video/audio elements.
 */
import { PicNodeData } from '../model/nodes/PicNode';
import { RenderContext } from './RenderContext';
/**
 * Render a picture node into an absolutely-positioned HTML element.
 *
 * Handles:
 * - Standard images (png, jpg, gif, svg, bmp)
 * - Unsupported formats (emf, wmf) with placeholder
 * - Video elements with controls
 * - Audio elements with controls
 * - Crop via CSS clip-path
 * - Rotation and flip transforms
 */
export declare function renderImage(node: PicNodeData, ctx: RenderContext): HTMLElement;

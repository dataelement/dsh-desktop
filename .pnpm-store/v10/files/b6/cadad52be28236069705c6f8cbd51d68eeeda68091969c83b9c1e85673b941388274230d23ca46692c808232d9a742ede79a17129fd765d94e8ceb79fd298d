/**
 * Group renderer — renders grouped shapes with coordinate space remapping.
 */
import { GroupNodeData } from '../model/nodes/GroupNode';
import { RenderContext } from './RenderContext';
import { BaseNodeData } from '../model/nodes/BaseNode';
/**
 * Render a group node into an absolutely-positioned HTML element.
 *
 * Groups define a child coordinate space (childOffset + childExtent) that must
 * be remapped to the group's actual position and size. Each child's position
 * and size are transformed accordingly before rendering.
 *
 * @param node       The parsed group node data
 * @param ctx        The render context
 * @param renderNode A callback to render individual child nodes (avoids circular deps)
 */
export declare function renderGroup(node: GroupNodeData, ctx: RenderContext, renderNode: (childNode: BaseNodeData, ctx: RenderContext) => HTMLElement): HTMLElement;

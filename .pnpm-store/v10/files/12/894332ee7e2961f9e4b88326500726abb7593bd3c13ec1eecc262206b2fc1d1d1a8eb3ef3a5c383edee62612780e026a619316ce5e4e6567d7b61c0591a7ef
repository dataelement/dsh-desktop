import { type RelEntry } from '../parser/RelParser';
import type { RenderContext } from './RenderContext';
/**
 * Resolve a slide relationship to the zero-based presentation order.
 *
 * Slide relationship targets point to slide part paths, but the displayed slide
 * order comes from presentation.xml and can differ from slideN.xml numbering.
 */
export declare function resolveSlideJumpIndex(ctx: RenderContext, rel: RelEntry): number | undefined;
export declare function resolveSlideNavigationIndex(ctx: RenderContext, action: string | undefined, rel?: RelEntry): number | undefined;
export declare function slideJumpTitle(slideIndex: number): string;

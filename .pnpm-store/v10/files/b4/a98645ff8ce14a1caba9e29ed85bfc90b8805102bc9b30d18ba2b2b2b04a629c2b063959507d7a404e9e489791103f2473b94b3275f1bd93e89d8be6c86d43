/**
 * Request-projected surface pricing: replaces attachment-block heuristics with
 * the image and file representations sent to the routed model.
 *
 * @module @deepseek-ai/dsh-token-meter/route-pricing
 */
import type { ContentBlock, LlmImageRequestPricing } from '@deepseek-ai/dsh-llm';
import type { MeterSurfaceNode } from './surface-fold.ts';
import type { TokenSurfaceNode } from './types.ts';
type FileAttachmentRef = Extract<ContentBlock, {
    type: 'file';
}>['attachment'];
/** One surface priced for a request route: public nodes plus their total. */
export interface PricedSurface {
    /** Positional nodes carrying both the route price and the fixed-heuristic price. */
    readonly nodes: TokenSurfaceNode[];
    /** Sum of the route prices across the surface. */
    readonly surfaceTokens: number;
}
/**
 * Price one ordered surface under its model-request attachment projection.
 * @param nodes - the fold's current or snapshotted surface, in model-visible order.
 * @param pricing - the routed model's image pricing, or undefined to keep the fixed heuristic.
 * @param fileText - exact file handle projection used by the mounted LLM service.
 * @returns detached public nodes and their route-priced total.
 * @throws when the pricing answers a different occurrence count than it was
 *   asked — misalignment would silently misprice nodes, so it must fail loud.
 */
export declare function priceSurface(nodes: readonly MeterSurfaceNode[], pricing: LlmImageRequestPricing | undefined, fileText?: (ref: FileAttachmentRef) => string): PricedSurface;
export {};
//# sourceMappingURL=route-pricing.d.ts.map
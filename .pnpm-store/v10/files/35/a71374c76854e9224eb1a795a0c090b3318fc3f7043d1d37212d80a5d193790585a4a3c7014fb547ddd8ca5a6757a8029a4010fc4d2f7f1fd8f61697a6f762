/**
 * Positional pricing shared by measurement and the context-breakdown fold:
 * measurement retains attachment details for route pricing; breakdown keeps
 * only retained node identities, heuristic prices, and system classification.
 * The occupancy projection uses the scalar shadow-price protocol instead.
 *
 * The fold is a plan/commit pair: {@link planSurfaceTokens} runs every
 * fallible step read-only and {@link commitSurfaceTokens} mutates in place,
 * so a throw leaves the caller's state untouched and the same malformed
 * event fails identically on every retry.
 * Nodes also carry durable attachment occurrences and their structural prices,
 * so `measure()` can price the request representation sent to the model.
 *
 * @module @deepseek-ai/dsh-token-meter/surface-fold
 */
import type { SessionSeq, SurfaceEvent } from '@deepseek-ai/dsh-session';
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
type FileAttachmentRef = Extract<ContentBlock, {
    type: 'file';
}>['attachment'];
/** One priced surface node with the image occurrences route pricing replaces. */
export interface MeterSurfaceNode {
    /** Durable sequence number of the surface event. */
    readonly seq: SessionSeq;
    /** Fixed-heuristic price of the node's exact message. */
    readonly heuristicTokens: number;
    /** Structural JSON price replaced when the routed request projects images. */
    readonly imageStructuralTokens: number;
    /** Structural JSON price replaced when request assembly projects files to text. */
    readonly fileStructuralTokens: number;
    /** Durable image occurrences in message order; empty for image-free nodes. */
    readonly images: readonly ImageAttachmentRef[];
    /** Durable file occurrences in message order; empty for file-free nodes. */
    readonly files: readonly FileAttachmentRef[];
}
/** One validated surface transition that has not mutated the priced surface yet. */
export interface SurfaceTokenPlan<Node = MeterSurfaceNode> {
    /** Heuristic price of the event's own message; 0 when it derives none. */
    readonly tokens: number;
    /** Signed change in the surface total: `tokens` minus anything shadowed. */
    readonly deltaTokens: number;
    /** The priced node the commit inserts for this event. */
    readonly node: Node;
    /** Commit position: `append`, or the inclusive replaced index range. */
    readonly target: 'append' | {
        readonly startIdx: number;
        readonly endIdx: number;
    };
}
/**
 * Validate and price one surface event without mutating the surface.
 * @param nodes - the priced surface preceding this event, in model-visible order.
 * @param event - the surface event to place.
 * @returns the plan for {@link commitSurfaceTokens}.
 * @throws when a replacement names a range absent from `nodes` — committed
 *   logs are surface-validated at append time, so an unresolvable range is log
 *   corruption and must fail loud rather than skip the event.
 */
export declare function planSurfaceTokens(nodes: readonly Pick<MeterSurfaceNode, 'seq' | 'heuristicTokens'>[], event: SurfaceEvent): SurfaceTokenPlan;
/**
 * Apply one validated plan to the priced surface in place; infallible, so it
 * cannot leave a half-applied surface behind.
 * @param nodes - the exact priced surface the plan was built against.
 * @param plan - the transition returned by {@link planSurfaceTokens}.
 */
export declare function commitSurfaceTokens<Node>(nodes: Node[], plan: SurfaceTokenPlan<Node>): void;
export {};
//# sourceMappingURL=surface-fold.d.ts.map
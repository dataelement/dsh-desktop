/**
 * Read-only enumeration of durable subagent children and descendant trees
 * through the Session query service. Candidates come from one live-preferred
 * corpus; each child's mode/label is the registered `subagent` projection
 * unit's value, resolved
 * down a three-rung ladder: the registry's watermark cache for a live child,
 * an unseeded durable projection-cache row, and one shared Session observation
 * otherwise. A seeded header deliberately lacks its exact inherited cut, so
 * it takes the body-bearing observation path before classifying an identity.
 * The projection fold is the single classification
 * authority — this module parses no descriptor
 * itself. Absent persistence, enumeration is live-only: a cold child is
 * unreachable for resume anyway, so its absence is capability absence, not an
 * error. The module owns no catalog state and does not consult Activation,
 * Agent-registry, continuation-manager, or provider state.
 *
 * @module @deepseek-ai/dsh-subagent
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { SubagentListEntry } from './control-types.ts';
export type { SubagentListEntry } from './control-types.ts';
/**
 * One entry of a descendant listing: the interpreted subagent facts plus its
 * position in the complete session tree. `parentId` is the durable direct
 * parent from the enumerated header, and `depth` counts edges from the root.
 */
export type SubagentDescendantListEntry = SubagentListEntry & {
    /** Durable direct parent of this candidate in the enumerated tree. */
    readonly parentId: SessionId;
    /** Edge distance from the requested root; direct children are `1`. */
    readonly depth: number;
};
/**
 * Enumerate one parent's origin-classified direct children from the
 * live-preferred merge of `ctx.sessions` and optional session persistence,
 * serving each identity from the `subagent` projection unit: the registry's
 * watermark snapshot for a live child; for a cold one, a durable
 * projection-cache read for an unseeded lifecycle, else one bounded-concurrency
 * shared Session observation carrying the exact inherited cut.
 * @see SubagentRuntime.listChildren for the public cancellation and failure contract.
 * @param ctx - context carrying the session store, the projection registry,
 *   optional persistence, and the optional projection cache.
 * @param parentSessionId - parent session whose direct children are listed.
 * @param signal - caller-owned cancellation observed around every persistence read.
 * @returns children and per-child diagnostics ordered by `createdAt`, then id.
 * @throws {@link SubagentError} when the projection registry or the session
 *   store is not mounted, or the caller cancels the listing.
 */
export declare function listChildren(ctx: Context, parentSessionId: SessionId, signal?: AbortSignal): Promise<SubagentListEntry[]>;
/**
 * Enumerate every session-backed subagent below one root in stable pre-order.
 * Ordinary sessions and one-shot children remain traversal nodes, so a
 * continuable child below either is still discovered. Classification uses the
 * same projection-backed runtime as {@link listChildren}; no Agent is loaded or
 * resumed.
 * @see SubagentRuntime.listDescendants for the public cancellation and failure contract.
 * @param ctx - context carrying the session store, projection registry, and optional persistence/cache.
 * @param rootSessionId - session whose complete descendant tree is listed.
 * @param signal - caller-owned cancellation observed around every persistence read.
 * @returns interpreted subagents with durable direct-parent and root-relative depth.
 * @throws {@link SubagentError} under the same conditions as {@link listChildren}.
 */
export declare function listDescendants(ctx: Context, rootSessionId: SessionId, signal?: AbortSignal): Promise<SubagentDescendantListEntry[]>;
//# sourceMappingURL=list-children.d.ts.map
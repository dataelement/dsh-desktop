/**
 * Durable projection state for the two loop-owned surface messages the system
 * prompt plugin forms: the system prompt (surface node 0 and any in-history
 * replacement) and the dynamic runtime-context snapshot.
 * @module @deepseek-ai/dsh-agent-loop/runtime-context
 */
import type { ContextSnapshotSection } from '@deepseek-ai/dsh-llm';
import type { Session, SurfaceIntent, SystemMessage, UserMessage } from '@deepseek-ai/dsh-session';
import type { Context } from '@deepseek-ai/cordis';
/** One uncommitted system-prompt surface operation for request admission or reconciliation. */
export interface SystemPromptCommit {
    /** Rendered prompt or empty content: an empty head records no prompt; empty tails are dormant. */
    message: SystemMessage;
    /** `append` for a new system node, otherwise a replacement of one surviving system node. */
    intent: SurfaceIntent<'system/message'>;
}
/** The request-series facts one prompt decision is made under. */
export interface SystemPromptDecisionInput {
    /** Whether the prepared route for this attempt reads a later `system` message as the effective prompt. */
    inHistory: boolean;
    /**
     * Whether this step's request starts a new model-message series: a pre-step
     * listener declared one, the surface was replaced since the last request, or
     * the assembled tool schemas differ from the logged header.
     */
    startsSeries: boolean;
}
/**
 * Decides how a rendered system prompt reaches the surface without owning the
 * commit. The first prompt, even empty, reserves surface node 0.
 * A capable continuing series appends changed nonempty text after the
 * cached history. An incapable route, broken series, or cleared prompt instead
 * normalizes the first system node and empties later active nodes. Dormant empty
 * tails do not supply effective text or require repeated replacements.
 */
export declare class SystemPromptProjection {
    private readonly session;
    constructor(session: Session);
    /** The surviving `system/message` nodes in surface order. */
    private systemNodes;
    /**
     * Reconcile effective text and retained nodes with the prepared route and series.
     * @param rendered - the fully rendered system prompt; `''` when none is active.
     * @param input - the route capability and series facts for this step.
     * @returns ordered per-node updates; an empty list means no update is needed.
     */
    project(rendered: string, input: SystemPromptDecisionInput): SystemPromptCommit[];
    private replace;
}
/** Tracks the last retained runtime-context snapshot without owning its commit. */
export declare class RuntimeContextProjection {
    /** `undefined` means no snapshot ever existed; `null` means none is retained. */
    private retained;
    /**
     * Restore projection state once, then follow authoritative session events.
     * @param ctx - agent-scoped event context.
     * @param session - session receiving projected messages.
     */
    constructor(ctx: Context, session: Session);
    /**
     * Create an uncommitted snapshot only when the retained value differs.
     * @param current - fully rendered dynamic context.
     * @param sections - named contributions that formed the current snapshot.
     * @returns a candidate user message, or `undefined` when no update is needed.
     */
    project(current: string, sections: readonly ContextSnapshotSection[]): UserMessage | undefined;
}
//# sourceMappingURL=runtime-context.d.ts.map
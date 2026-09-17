/**
 * The `sessionStats` projection unit: a pure fold of step boundaries, stream
 * embedded streams, tool pairs, and assembled assistant messages into whole-log counts
 * and wall times.
 *
 * `step/end` — not `assistant/message` — is the counted step event because it
 * is the step lifecycle authority: the loop appends exactly one per entered
 * step, in a `finally`, so completed, failed, cancelled, and max-tokens steps
 * all land one. Counting assembled assistant messages instead would overcount
 * max-tokens usage-host messages (empty content, excluded from the surface)
 * and undercount cancelled steps (aborted before the message assembles).
 *
 * The wall-time folds mirror the client window fold field by field
 * (`deriveStats` in dsh-client-ui-conversation, that fold's whole-window
 * fallback role): model time is `step/start` → `assistant/message`, first
 * token is the first non-empty delta chunk and survives an in-step
 * `llm/retry`, decode spans first token → assembled message on steps that
 * also report output tokens, and tool time pairs `tool/call` → `tool/result`
 * by callId. A cancelled step assembles no message, so its partial stream
 * time stays uncounted in every time figure — matching the window, which
 * renders it as an untimed interrupted node.
 *
 * @module @deepseek-ai/dsh-session-stats/projection
 */
import { z } from 'zod';
/** Accumulated whole-log figures (the view is exactly these totals). */
interface SessionStatsTotals {
    /** Distinct turns with at least one closed step so far. */
    turns: number;
    /** Closed steps so far. */
    steps: number;
    /** Summed model wall time over message-assembling steps, ms. */
    llmMs: number;
    /** Summed matched tool call→result wall time, ms. */
    toolMs: number;
    /** Summed first-token latency over `ttftSteps`, ms. */
    ttftMs: number;
    /** Steps carrying a recorded first token. */
    ttftSteps: number;
    /** Summed decode wall time over usage-reporting steps, ms. */
    decodeMs: number;
    /** Summed provider output tokens over the same steps. */
    decodeTokens: number;
}
/**
 * Fold state: the totals plus the in-flight boundaries they accrue from.
 * Turn numbers are host-assigned and monotonic per session, so a single
 * `lastTurn` slot decides "first closed step of a new turn"; the state is
 * plain JSON per the unit contract (persisted-cache precondition).
 */
interface SessionStatsState extends SessionStatsTotals {
    /** Turn of the last counted `step/end`; null before the first. */
    lastTurn: number | null;
    /** The open step's boundary facts; null outside a step or after its message assembled. */
    openStep: {
        turn: number;
        step: number;
        startTime: number;
        firstTokenTime: number | null;
    } | null;
    /** Dispatch times of tool calls whose result has not landed, by callId. */
    pendingCalls: Record<string, number>;
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        sessionStats: SessionStatsState;
    }
}
/** The `sessionStats` unit registered on `ctx.sessionProjections` (exported for the unit spec). */
export declare const sessionStatsProjectionDefinition: {
    key: "sessionStats";
    stateVersion: number;
    stateSchema: z.ZodObject<{
        turns: z.ZodNumber;
        steps: z.ZodNumber;
        llmMs: z.ZodNumber;
        toolMs: z.ZodNumber;
        ttftMs: z.ZodNumber;
        ttftSteps: z.ZodNumber;
        decodeMs: z.ZodNumber;
        decodeTokens: z.ZodNumber;
        lastTurn: z.ZodNullable<z.ZodNumber>;
        openStep: z.ZodNullable<z.ZodObject<{
            turn: z.ZodNumber;
            step: z.ZodNumber;
            startTime: z.ZodNumber;
            firstTokenTime: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>>;
        pendingCalls: z.ZodRecord<z.ZodString, z.ZodNumber>;
    }, z.core.$strict>;
    init: () => {
        turns: number;
        steps: number;
        llmMs: number;
        toolMs: number;
        ttftMs: number;
        ttftSteps: number;
        decodeMs: number;
        decodeTokens: number;
        lastTurn: null;
        openStep: null;
        pendingCalls: {};
    };
    apply: (state: NoInfer<SessionStatsState>, event: import("@deepseek-ai/dsh-session").SessionEvent) => SessionStatsState;
    wire: {
        viewSchema: z.ZodObject<{
            turns: z.ZodNumber;
            steps: z.ZodNumber;
            llmMs: z.ZodNumber;
            toolMs: z.ZodNumber;
            ttftMs: z.ZodNumber;
            ttftSteps: z.ZodNumber;
            decodeMs: z.ZodNumber;
            decodeTokens: z.ZodNumber;
        }, z.core.$strict>;
        view: (state: NoInfer<SessionStatsState>) => {
            turns: number;
            steps: number;
            llmMs: number;
            toolMs: number;
            ttftMs: number;
            ttftSteps: number;
            decodeMs: number;
            decodeTokens: number;
        };
    };
};
export {};
//# sourceMappingURL=projection.d.ts.map
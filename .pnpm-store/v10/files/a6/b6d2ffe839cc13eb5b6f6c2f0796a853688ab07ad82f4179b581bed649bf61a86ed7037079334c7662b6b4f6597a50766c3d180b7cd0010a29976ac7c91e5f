/**
 * Pure folds for durable provider-reported token usage and context occupancy.
 */
import { z } from 'zod';
import { SessionSeq } from '@deepseek-ai/dsh-session';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { ContextPressureProjection, TokenUsageProjection } from './projection.ts';
/**
 * The token-usage unit's state schema — the one definition of the state
 * shape; the state type is inferred from it.
 */
declare const tokenUsageStateSchema: z.ZodObject<{
    totals: z.ZodObject<{
        uncachedInputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        cacheReadTokens: z.ZodNumber;
        cacheWriteTokens: z.ZodNumber;
    }, z.core.$strict>;
    last: z.ZodNullable<z.ZodObject<{
        turn: z.ZodNumber;
        step: z.ZodNumber;
        buckets: z.ZodObject<{
            uncachedInputTokens: z.ZodNumber;
            outputTokens: z.ZodNumber;
            cacheReadTokens: z.ZodNumber;
            cacheWriteTokens: z.ZodNumber;
        }, z.core.$strict>;
    }, z.core.$strip>>;
}, z.core.$strict>;
type TokenUsageState = z.infer<typeof tokenUsageStateSchema>;
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        tokenUsage: TokenUsageState;
        contextPressure: ContextPressureState;
    }
}
/** The context-pressure state schema and source of its inferred type. */
declare const contextPressureStateSchema: z.ZodObject<{
    contextWindow: z.ZodOptional<z.ZodNumber>;
    pressureTokens: z.ZodOptional<z.ZodNumber>;
    surfaceTokens: z.ZodNumber;
    sampledSurfaceTokens: z.ZodOptional<z.ZodNumber>;
    claim: z.ZodOptional<z.ZodObject<{
        start: z.ZodPipe<z.ZodNumber, z.ZodTransform<SessionSeq, number>>;
        end: z.ZodPipe<z.ZodNumber, z.ZodTransform<SessionSeq, number>>;
        tokens: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strict>;
type ContextPressureState = z.infer<typeof contextPressureStateSchema>;
/**
 * Token-meter's session projection unit.
 *
 * Each v2 Assistant settlement contributes the last usage sample embedded in
 * its stream. `llm/retry-started` closes the replacement slot so the retried
 * attempt adds to the total.
 */
export declare const tokenUsageProjectionDefinition: {
    key: "tokenUsage";
    stateVersion: number;
    stateSchema: z.ZodObject<{
        totals: z.ZodObject<{
            uncachedInputTokens: z.ZodNumber;
            outputTokens: z.ZodNumber;
            cacheReadTokens: z.ZodNumber;
            cacheWriteTokens: z.ZodNumber;
        }, z.core.$strict>;
        last: z.ZodNullable<z.ZodObject<{
            turn: z.ZodNumber;
            step: z.ZodNumber;
            buckets: z.ZodObject<{
                uncachedInputTokens: z.ZodNumber;
                outputTokens: z.ZodNumber;
                cacheReadTokens: z.ZodNumber;
                cacheWriteTokens: z.ZodNumber;
            }, z.core.$strict>;
        }, z.core.$strip>>;
    }, z.core.$strict>;
    init: () => {
        totals: TokenUsageProjection;
        last: null;
    };
    apply: (state: NoInfer<{
        totals: {
            uncachedInputTokens: number;
            outputTokens: number;
            cacheReadTokens: number;
            cacheWriteTokens: number;
        };
        last: {
            turn: number;
            step: number;
            buckets: {
                uncachedInputTokens: number;
                outputTokens: number;
                cacheReadTokens: number;
                cacheWriteTokens: number;
            };
        } | null;
    }>, event: SessionEvent) => {
        totals: {
            uncachedInputTokens: number;
            outputTokens: number;
            cacheReadTokens: number;
            cacheWriteTokens: number;
        };
        last: {
            turn: number;
            step: number;
            buckets: {
                uncachedInputTokens: number;
                outputTokens: number;
                cacheReadTokens: number;
                cacheWriteTokens: number;
            };
        } | null;
    };
    wire: {
        viewSchema: z.ZodObject<{
            uncachedInputTokens: z.ZodNumber;
            outputTokens: z.ZodNumber;
            cacheReadTokens: z.ZodNumber;
            cacheWriteTokens: z.ZodNumber;
        }, z.core.$strict>;
        view: (state: NoInfer<{
            totals: {
                uncachedInputTokens: number;
                outputTokens: number;
                cacheReadTokens: number;
                cacheWriteTokens: number;
            };
            last: {
                turn: number;
                step: number;
                buckets: {
                    uncachedInputTokens: number;
                    outputTokens: number;
                    cacheReadTokens: number;
                    cacheWriteTokens: number;
                };
            } | null;
        }>) => {
            uncachedInputTokens: number;
            outputTokens: number;
            cacheReadTokens: number;
            cacheWriteTokens: number;
        };
    };
};
/**
 * Token-meter's context-occupancy projection unit.
 *
 * Independent last-wins slots: the newest usage sample supplies the provider
 * numerator, the newest `request/context` record the denominator. Both are
 * whole values, so replay order alone decides the result and no cross-field
 * consistency is claimed — the pair is explicitly not one atomic request
 * observation (see {@link ContextPressureProjection}).
 *
 * `pressureTokens` is prompt-side only, so it holds still while a turn streams
 * and steps forward once the next request reports its usage. Because nothing
 * but a request reports usage, it also cannot see a compaction: the fold
 * therefore carries a running surface total alongside it and publishes
 * `projectedTokens` — the sample plus the surface's signed movement since it
 * was taken — so occupancy answers for the next request rather than the last
 * one. The total rides {@link foldSurfaceProjection}, so the state stays O(1)
 * and a replacement shrinks it by its logged shadow price. A replacement
 * without a claim preserves the previous total. A usage sample is stamped
 * BEFORE the same event joins the surface, so an `assistant/message` anchors
 * against the surface its own request saw.
 */
export declare const contextPressureProjectionDefinition: {
    key: "contextPressure";
    stateVersion: number;
    stateSchema: z.ZodObject<{
        contextWindow: z.ZodOptional<z.ZodNumber>;
        pressureTokens: z.ZodOptional<z.ZodNumber>;
        surfaceTokens: z.ZodNumber;
        sampledSurfaceTokens: z.ZodOptional<z.ZodNumber>;
        claim: z.ZodOptional<z.ZodObject<{
            start: z.ZodPipe<z.ZodNumber, z.ZodTransform<SessionSeq, number>>;
            end: z.ZodPipe<z.ZodNumber, z.ZodTransform<SessionSeq, number>>;
            tokens: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strict>;
    init: () => {
        surfaceTokens: number;
    };
    apply: (state: NoInfer<{
        surfaceTokens: number;
        contextWindow?: number | undefined;
        pressureTokens?: number | undefined;
        sampledSurfaceTokens?: number | undefined;
        claim?: {
            start: SessionSeq;
            end: SessionSeq;
            tokens: number;
        } | undefined;
    }>, event: SessionEvent) => {
        surfaceTokens: number;
        contextWindow?: number | undefined;
        pressureTokens?: number | undefined;
        sampledSurfaceTokens?: number | undefined;
    };
    wire: {
        viewSchema: z.ZodType<ContextPressureProjection, unknown, z.core.$ZodTypeInternals<ContextPressureProjection, unknown>>;
        view: ({ contextWindow, pressureTokens, surfaceTokens, sampledSurfaceTokens }: NoInfer<{
            surfaceTokens: number;
            contextWindow?: number | undefined;
            pressureTokens?: number | undefined;
            sampledSurfaceTokens?: number | undefined;
            claim?: {
                start: SessionSeq;
                end: SessionSeq;
                tokens: number;
            } | undefined;
        }>) => {
            projectedTokens?: number;
            pressureTokens?: number;
            contextWindow?: number;
        };
    };
};
export {};
//# sourceMappingURL=usage-projection.d.ts.map
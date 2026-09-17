/**
 * Heuristic composition of the current retained surface, independent of route
 * image pricing and provider usage. Positional entries preserve system-prompt
 * classification across replacements without retaining historical messages.
 */
import { z } from 'zod';
import { SessionSeq } from '@deepseek-ai/dsh-session';
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        contextBreakdown: ContextBreakdownState;
    }
}
/** Plain-JSON checkpoint: one compact entry per retained surface position. */
declare const contextBreakdownStateSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        seq: z.ZodPipe<z.ZodNumber, z.ZodTransform<SessionSeq, number>>;
        heuristicTokens: z.ZodNumber;
        system: z.ZodBoolean;
    }, z.core.$strict>>;
    breakdown: z.ZodObject<{
        systemTokens: z.ZodNumber;
        toolsTokens: z.ZodNumber;
        messageTokens: z.ZodNumber;
    }, z.core.$strict>;
}, z.core.$strict>;
type ContextBreakdownState = z.infer<typeof contextBreakdownStateSchema>;
/**
 * Context composition with the last nonempty surviving system in surface
 * order classified as system tokens; all other visible prices are messages.
 * Replacements use the measurement planner, not shadow-price claims. State
 * and surface transitions cost O(current retained surface), not O(log length).
 * Tools are priced from the latest request header. No route pricing applies.
 */
export declare const contextBreakdownProjectionDefinition: {
    key: "contextBreakdown";
    stateVersion: number;
    stateSchema: z.ZodObject<{
        nodes: z.ZodArray<z.ZodObject<{
            seq: z.ZodPipe<z.ZodNumber, z.ZodTransform<SessionSeq, number>>;
            heuristicTokens: z.ZodNumber;
            system: z.ZodBoolean;
        }, z.core.$strict>>;
        breakdown: z.ZodObject<{
            systemTokens: z.ZodNumber;
            toolsTokens: z.ZodNumber;
            messageTokens: z.ZodNumber;
        }, z.core.$strict>;
    }, z.core.$strict>;
    init: () => ContextBreakdownState;
    apply: (state: NoInfer<{
        nodes: {
            seq: SessionSeq;
            heuristicTokens: number;
            system: boolean;
        }[];
        breakdown: {
            systemTokens: number;
            toolsTokens: number;
            messageTokens: number;
        };
    }>, event: import("@deepseek-ai/dsh-session").SessionEvent) => {
        nodes: {
            seq: SessionSeq;
            heuristicTokens: number;
            system: boolean;
        }[];
        breakdown: {
            systemTokens: number;
            toolsTokens: number;
            messageTokens: number;
        };
    };
    wire: {
        viewSchema: z.ZodObject<{
            systemTokens: z.ZodNumber;
            toolsTokens: z.ZodNumber;
            messageTokens: z.ZodNumber;
        }, z.core.$strict>;
        view: (state: NoInfer<{
            nodes: {
                seq: SessionSeq;
                heuristicTokens: number;
                system: boolean;
            }[];
            breakdown: {
                systemTokens: number;
                toolsTokens: number;
                messageTokens: number;
            };
        }>) => {
            systemTokens: number;
            toolsTokens: number;
            messageTokens: number;
        };
    };
};
export {};
//# sourceMappingURL=breakdown-projection.d.ts.map
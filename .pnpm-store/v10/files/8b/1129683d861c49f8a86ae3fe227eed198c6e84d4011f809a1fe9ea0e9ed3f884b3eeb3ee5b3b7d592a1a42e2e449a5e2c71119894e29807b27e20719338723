import type { Api, Context, Model, SimpleStreamOptions, StreamOptions, ThinkingBudgets, ThinkingLevel } from "../types.ts";
export declare function clampMaxTokensToContext(model: Model<Api>, context: Context, maxTokens: number): number;
export declare function buildBaseOptions(model: Model<Api>, context: Context, options?: SimpleStreamOptions, apiKey?: string): StreamOptions;
/** Tokens always left for the answer when a thinking budget shares the response ceiling. */
export declare const MIN_ANSWER_TOKENS = 1024;
export declare const DEFAULT_THINKING_BUDGETS: ThinkingBudgets;
export declare function clampReasoning(effort: ThinkingLevel | undefined): Exclude<ThinkingLevel, "xhigh" | "max"> | undefined;
export declare function thinkingBudgetForLevel(reasoningLevel: ThinkingLevel, customBudgets?: ThinkingBudgets): number;
/** Cap a thinking budget so at least MIN_ANSWER_TOKENS remain under a shared response ceiling. */
export declare function clampThinkingBudgetToAnswerRoom(thinkingBudget: number, ceiling: number): number;
export declare function adjustMaxTokensForThinking(baseMaxTokens: number | undefined, modelMaxTokens: number, reasoningLevel: ThinkingLevel, customBudgets?: ThinkingBudgets): {
    maxTokens: number;
    thinkingBudget: number;
};
//# sourceMappingURL=simple-options.d.ts.map
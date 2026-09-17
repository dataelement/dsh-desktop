import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { Context, Model, OpenAICompletionsCompat, SimpleStreamOptions, StreamFunction, StreamOptions, ThinkingBudgets } from "../types.ts";
export interface OpenAICompletionsOptions extends StreamOptions {
    toolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
    reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
    /** Token budgets per thinking level. Used when `compat.thinkingTokenBudgetField` or `compat.supportsThinkingTokenBudget` is set, or by `{ "$var": "thinking.budget" }`. */
    thinkingBudgets?: ThinkingBudgets;
}
export interface ConvertCompletionsMessagesOptions {
    grammarToolInputProperties?: ReadonlyMap<string, string>;
}
type ResolvedOpenAICompletionsCompat = Omit<Required<OpenAICompletionsCompat>, "cacheControlFormat" | "deferredToolsMode" | "supportsThinkingTokenBudget" | "thinkingTokenBudgetField" | "vllmPriority"> & {
    cacheControlFormat?: OpenAICompletionsCompat["cacheControlFormat"];
    deferredToolsMode?: OpenAICompletionsCompat["deferredToolsMode"];
    supportsThinkingTokenBudget?: OpenAICompletionsCompat["supportsThinkingTokenBudget"];
    thinkingTokenBudgetField?: OpenAICompletionsCompat["thinkingTokenBudgetField"];
    vllmPriority?: OpenAICompletionsCompat["vllmPriority"];
};
export declare const stream: StreamFunction<"openai-completions", OpenAICompletionsOptions>;
export declare const streamSimple: StreamFunction<"openai-completions", SimpleStreamOptions>;
export declare function convertMessages(model: Model<"openai-completions">, context: Context, compat: ResolvedOpenAICompletionsCompat, options?: ConvertCompletionsMessagesOptions): ChatCompletionMessageParam[];
export {};
//# sourceMappingURL=openai-completions.d.ts.map
import { estimateContextTokens } from "../utils/estimate.js";
const CONTEXT_SAFETY_TOKENS = 4096;
const MIN_MAX_TOKENS = 1;
export function clampMaxTokensToContext(model, context, maxTokens) {
    if (model.contextWindow <= 0)
        return Math.max(MIN_MAX_TOKENS, maxTokens);
    const available = model.contextWindow - estimateContextTokens(context).tokens - CONTEXT_SAFETY_TOKENS;
    return Math.min(maxTokens, Math.max(MIN_MAX_TOKENS, available));
}
export function buildBaseOptions(model, context, options, apiKey) {
    const samplingParams = model.samplingParams || options?.samplingParams
        ? { ...model.samplingParams, ...options?.samplingParams }
        : undefined;
    return {
        temperature: options?.temperature,
        samplingParams,
        maxTokens: clampMaxTokensToContext(model, context, options?.maxTokens ?? model.maxTokens),
        signal: options?.signal,
        telemetryContext: options?.telemetryContext,
        apiKey: apiKey || options?.apiKey,
        fetch: options?.fetch,
        transport: options?.transport,
        cacheRetention: options?.cacheRetention,
        sessionId: options?.sessionId,
        headers: options?.headers,
        onPayload: options?.onPayload,
        onResponse: options?.onResponse,
        timeoutMs: options?.timeoutMs,
        websocketConnectTimeoutMs: options?.websocketConnectTimeoutMs,
        maxRetries: options?.maxRetries,
        maxRetryDelayMs: options?.maxRetryDelayMs,
        metadata: options?.metadata,
        env: options?.env,
    };
}
/** Tokens always left for the answer when a thinking budget shares the response ceiling. */
export const MIN_ANSWER_TOKENS = 1024;
export const DEFAULT_THINKING_BUDGETS = {
    minimal: 1024,
    low: 2048,
    medium: 8192,
    high: 16384,
};
export function clampReasoning(effort) {
    return effort === "xhigh" || effort === "max" ? "high" : effort;
}
export function thinkingBudgetForLevel(reasoningLevel, customBudgets) {
    const budgets = { ...DEFAULT_THINKING_BUDGETS, ...customBudgets };
    const level = clampReasoning(reasoningLevel);
    return budgets[level];
}
/** Cap a thinking budget so at least MIN_ANSWER_TOKENS remain under a shared response ceiling. */
export function clampThinkingBudgetToAnswerRoom(thinkingBudget, ceiling) {
    return Math.min(thinkingBudget, Math.max(0, ceiling - MIN_ANSWER_TOKENS));
}
export function adjustMaxTokensForThinking(
// Undefined means no explicit caller cap. Use the model cap and fit thinking inside it.
baseMaxTokens, modelMaxTokens, reasoningLevel, customBudgets) {
    let thinkingBudget = thinkingBudgetForLevel(reasoningLevel, customBudgets);
    const maxTokens = baseMaxTokens === undefined ? modelMaxTokens : Math.min(baseMaxTokens + thinkingBudget, modelMaxTokens);
    if (maxTokens <= thinkingBudget) {
        thinkingBudget = clampThinkingBudgetToAnswerRoom(thinkingBudget, maxTokens);
    }
    return { maxTokens, thinkingBudget };
}
//# sourceMappingURL=simple-options.js.map
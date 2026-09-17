import type { Api, AssistantMessage, Message, Model } from "../types.ts";
/**
 * Normalize tool call ID for cross-provider compatibility.
 * OpenAI Responses API generates IDs that are 450+ chars with special characters like `|`.
 * Anthropic APIs require IDs matching ^[a-zA-Z0-9_-]+$ (max 64 chars).
 */
export declare function transformMessages<TApi extends Api>(messages: Message[], model: Model<TApi>, normalizeToolCallId?: (id: string, model: Model<TApi>, source: AssistantMessage) => string): Message[];
//# sourceMappingURL=transform-messages.d.ts.map
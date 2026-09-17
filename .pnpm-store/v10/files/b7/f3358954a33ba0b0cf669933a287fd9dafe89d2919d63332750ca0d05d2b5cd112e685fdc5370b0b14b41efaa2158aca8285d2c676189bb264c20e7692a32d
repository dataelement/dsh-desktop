/**
 * Shared utilities for Google Generative AI and Google Vertex providers.
 */
import { FinishReason, FunctionCallingConfigMode } from "@google/genai";
import { retryProviderRequest } from "../utils/provider-retry.js";
import { sanitizeSurrogates } from "../utils/sanitize-unicode.js";
import { getJsonSchemaToolParameters, resolveJsonSchemaStrictSampling } from "./constrained-sampling.js";
import { transformMessages } from "./transform-messages.js";
/** Resolve a supported pi level or model-specific Google mapping to a standard Google level. */
export function resolveGoogleThinkingLevel(model, level) {
    if (level === "off")
        return "high";
    const mapped = model.thinkingLevelMap?.[level];
    const resolvedLevel = typeof mapped === "string" ? mapped.toLowerCase() : level;
    switch (resolvedLevel) {
        case "minimal":
        case "low":
        case "medium":
        case "high":
            return resolvedLevel;
        default:
            throw new Error(`Unsupported Google thinking level mapping for ${model.provider}/${model.id}: ${level} -> ${String(mapped)}`);
    }
}
/**
 * Determines whether a streamed Gemini `Part` should be treated as "thinking".
 *
 * Protocol note (Gemini / Vertex AI thought signatures):
 * - `thought: true` is the definitive marker for thinking content (thought summaries).
 * - `thoughtSignature` is an encrypted representation of the model's internal thought process
 *   used to preserve reasoning context across multi-turn interactions.
 * - `thoughtSignature` can appear on ANY part type (text, functionCall, etc.) - it does NOT
 *   indicate the part itself is thinking content.
 * - For non-functionCall responses, the signature appears on the last part for context replay.
 * - When persisting/replaying model outputs, signature-bearing parts must be preserved as-is;
 *   do not merge/move signatures across parts.
 *
 * See: https://ai.google.dev/gemini-api/docs/thought-signatures
 */
export function isThinkingPart(part) {
    return part.thought === true;
}
/**
 * Retain thought signatures during streaming.
 *
 * Some backends only send `thoughtSignature` on the first delta for a given part/block; later deltas may omit it.
 * This helper preserves the last non-empty signature for the current block.
 *
 * Note: this does NOT merge or move signatures across distinct response parts. It only prevents
 * a signature from being overwritten with `undefined` within the same streamed block.
 */
export function retainThoughtSignature(existing, incoming) {
    if (typeof incoming === "string" && incoming.length > 0)
        return incoming;
    return existing;
}
// Thought signatures must be base64 for Google APIs (TYPE_BYTES).
const base64SignaturePattern = /^[A-Za-z0-9+/]+={0,2}$/;
function isValidThoughtSignature(signature) {
    if (!signature)
        return false;
    if (signature.length % 4 !== 0)
        return false;
    return base64SignaturePattern.test(signature);
}
/**
 * Only keep signatures from the same provider/model and with valid base64.
 */
function resolveThoughtSignature(isSameProviderAndModel, signature) {
    return isSameProviderAndModel && isValidThoughtSignature(signature) ? signature : undefined;
}
/**
 * Models via Google APIs that require explicit tool call IDs in function calls/responses.
 */
export function requiresToolCallId(modelId) {
    const geminiMajorVersion = getGeminiMajorVersion(modelId);
    return (modelId.startsWith("claude-") ||
        modelId.startsWith("gpt-oss-") ||
        (geminiMajorVersion !== undefined && geminiMajorVersion >= 3));
}
function getGeminiMajorVersion(modelId) {
    const match = modelId.toLowerCase().match(/^gemini(?:-live)?-(\d+)/);
    if (!match)
        return undefined;
    return Number.parseInt(match[1], 10);
}
function supportsMultimodalFunctionResponse(modelId) {
    const geminiMajorVersion = getGeminiMajorVersion(modelId);
    if (geminiMajorVersion !== undefined) {
        return geminiMajorVersion >= 3;
    }
    return true;
}
/**
 * Convert internal messages to Gemini Content[] format.
 */
export function convertMessages(model, context) {
    const contents = [];
    const normalizeToolCallId = (id) => {
        if (!requiresToolCallId(model.id))
            return id;
        return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    };
    const transformedMessages = transformMessages(context.messages, model, normalizeToolCallId);
    for (const msg of transformedMessages) {
        if (msg.role === "user") {
            if (typeof msg.content === "string") {
                contents.push({
                    role: "user",
                    parts: [{ text: sanitizeSurrogates(msg.content) }],
                });
            }
            else {
                const parts = msg.content.map((item) => {
                    if (item.type === "text") {
                        return { text: sanitizeSurrogates(item.text) };
                    }
                    else {
                        return {
                            inlineData: {
                                mimeType: item.mimeType,
                                data: item.data,
                            },
                        };
                    }
                });
                if (parts.length === 0)
                    continue;
                contents.push({
                    role: "user",
                    parts,
                });
            }
        }
        else if (msg.role === "assistant") {
            const parts = [];
            // Check if message is from same provider and model - only then keep thinking blocks
            const isSameProviderAndModel = msg.provider === model.provider && msg.model === model.id;
            for (const block of msg.content) {
                if (block.type === "text") {
                    const thoughtSignature = resolveThoughtSignature(isSameProviderAndModel, block.textSignature);
                    // Skip empty text blocks — unless they carry a thought signature. Gemini can attach
                    // the signature to a part whose visible text is empty and requires it echoed back;
                    // dropping it breaks the reasoning chain and the model intermittently ends mid-task
                    // turns with a thought-only STOP (empty completion, no tool call).
                    if ((!block.text || block.text.trim() === "") && !thoughtSignature)
                        continue;
                    parts.push({
                        text: sanitizeSurrogates(block.text),
                        ...(thoughtSignature && { thoughtSignature }),
                    });
                }
                else if (block.type === "thinking") {
                    // Only keep as thinking block if same provider AND same model
                    // Otherwise convert to plain text (no tags to avoid model mimicking them)
                    if (isSameProviderAndModel) {
                        const thoughtSignature = resolveThoughtSignature(isSameProviderAndModel, block.thinkingSignature);
                        // Same rule as text blocks: an empty thinking block is dropped only when it
                        // carries no signature (mirrors the anthropic converter's handling).
                        if ((!block.thinking || block.thinking.trim() === "") && !thoughtSignature)
                            continue;
                        parts.push({
                            thought: true,
                            text: sanitizeSurrogates(block.thinking),
                            ...(thoughtSignature && { thoughtSignature }),
                        });
                    }
                    else {
                        // Cross-provider/model: the signature is unusable, empty blocks stay dropped.
                        if (!block.thinking || block.thinking.trim() === "")
                            continue;
                        parts.push({
                            text: sanitizeSurrogates(block.thinking),
                        });
                    }
                }
                else if (block.type === "toolCall") {
                    const thoughtSignature = resolveThoughtSignature(isSameProviderAndModel, block.thoughtSignature);
                    const part = {
                        functionCall: {
                            name: block.name,
                            args: block.arguments ?? {},
                            ...(requiresToolCallId(model.id) ? { id: block.id } : {}),
                        },
                        ...(thoughtSignature && { thoughtSignature }),
                    };
                    parts.push(part);
                }
            }
            if (parts.length === 0)
                continue;
            contents.push({
                role: "model",
                parts,
            });
        }
        else if (msg.role === "toolResult") {
            // Extract text and image content
            const textContent = msg.content.filter((c) => c.type === "text");
            const textResult = textContent.map((c) => c.text).join("\n");
            const imageContent = model.input.includes("image")
                ? msg.content.filter((c) => c.type === "image")
                : [];
            const hasText = textResult.length > 0;
            const hasImages = imageContent.length > 0;
            // Gemini 3+ models support multimodal function responses with images nested inside
            // functionResponse.parts. Claude and other non-Gemini models behind Cloud Code Assist /
            // Gemini < 3 still needs a separate user image turn.
            const modelSupportsMultimodalFunctionResponse = supportsMultimodalFunctionResponse(model.id);
            // Use "output" key for success, "error" key for errors as per SDK documentation
            const responseValue = hasText ? sanitizeSurrogates(textResult) : hasImages ? "(see attached image)" : "";
            const imageParts = imageContent.map((imageBlock) => ({
                inlineData: {
                    mimeType: imageBlock.mimeType,
                    data: imageBlock.data,
                },
            }));
            const includeId = requiresToolCallId(model.id);
            const functionResponsePart = {
                functionResponse: {
                    name: msg.toolName,
                    response: msg.isError ? { error: responseValue } : { output: responseValue },
                    ...(hasImages && modelSupportsMultimodalFunctionResponse && { parts: imageParts }),
                    ...(includeId ? { id: msg.toolCallId } : {}),
                },
            };
            // Cloud Code Assist API requires all function responses to be in a single user turn.
            // Check if the last content is already a user turn with function responses and merge.
            const lastContent = contents[contents.length - 1];
            if (lastContent?.role === "user" && lastContent.parts?.some((p) => p.functionResponse)) {
                lastContent.parts.push(functionResponsePart);
            }
            else {
                contents.push({
                    role: "user",
                    parts: [functionResponsePart],
                });
            }
            // For Gemini < 3, add images in a separate user message
            if (hasImages && !modelSupportsMultimodalFunctionResponse) {
                contents.push({
                    role: "user",
                    parts: [{ text: "Tool result image:" }, ...imageParts],
                });
            }
        }
    }
    return contents;
}
const JSON_SCHEMA_META_DECLARATIONS = new Set([
    "$schema",
    "$id",
    "$anchor",
    "$dynamicAnchor",
    "$vocabulary",
    "$comment",
    "$defs",
    "definitions", // pre-draft-2019-09 equivalent of $defs
]);
/**
 * Strip meta-declarations from a schema obj
 */
function sanitizeForOpenApi(schema) {
    if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
        return schema;
    }
    const result = {};
    for (const [key, value] of Object.entries(schema)) {
        if (JSON_SCHEMA_META_DECLARATIONS.has(key))
            continue;
        result[key] = sanitizeForOpenApi(value);
    }
    return result;
}
/**
 * Convert tools to Gemini function declarations format.
 *
 * By default uses `parametersJsonSchema` which supports full JSON Schema (including
 * anyOf, oneOf, const, etc.). Set `useParameters` to true to use the legacy `parameters`
 * field instead (OpenAPI 3.03 Schema). This is needed for Cloud Code Assist with Claude
 * models, where the API translates `parameters` into Anthropic's `input_schema`.
 */
export function convertTools(tools, useParameters = false, supportsStrictMode = true) {
    if (tools.length === 0)
        return undefined;
    return [
        {
            functionDeclarations: tools.map((tool) => {
                const strict = resolveJsonSchemaStrictSampling(tool, supportsStrictMode);
                const parameters = getJsonSchemaToolParameters(tool, strict);
                return {
                    name: tool.name,
                    description: tool.description,
                    ...(useParameters
                        ? { parameters: sanitizeForOpenApi(parameters) }
                        : { parametersJsonSchema: parameters }),
                };
            }),
        },
    ];
}
/** Gemini 3+ enforces required function parameters in validated tool-calling modes. */
export function supportsGoogleStrictToolSampling(modelId) {
    const majorVersion = getGeminiMajorVersion(modelId);
    return majorVersion !== undefined && majorVersion >= 3;
}
/** Map tool choice string to Gemini FunctionCallingConfigMode. */
export function mapToolChoice(choice) {
    switch (choice) {
        case "auto":
            return FunctionCallingConfigMode.AUTO;
        case "none":
            return FunctionCallingConfigMode.NONE;
        case "any":
            return FunctionCallingConfigMode.ANY;
        default:
            return FunctionCallingConfigMode.AUTO;
    }
}
export function resolveGoogleFunctionCallingMode(tools, toolChoice, supportsStrictMode) {
    const useStrictMode = tools.some((tool) => resolveJsonSchemaStrictSampling(tool, supportsStrictMode) === true);
    if (toolChoice === "none" || toolChoice === "any") {
        return mapToolChoice(toolChoice);
    }
    if (useStrictMode) {
        return FunctionCallingConfigMode.VALIDATED;
    }
    return toolChoice ? mapToolChoice(toolChoice) : undefined;
}
/**
 * Map Gemini FinishReason to our StopReason.
 */
export function mapStopReason(reason) {
    switch (reason) {
        case FinishReason.STOP:
            return "stop";
        case FinishReason.MAX_TOKENS:
            return "length";
        case FinishReason.BLOCKLIST:
        case FinishReason.PROHIBITED_CONTENT:
        case FinishReason.SPII:
        case FinishReason.SAFETY:
        case FinishReason.IMAGE_SAFETY:
        case FinishReason.IMAGE_PROHIBITED_CONTENT:
        case FinishReason.IMAGE_RECITATION:
        case FinishReason.IMAGE_OTHER:
        case FinishReason.RECITATION:
        case FinishReason.FINISH_REASON_UNSPECIFIED:
        case FinishReason.OTHER:
        case FinishReason.LANGUAGE:
        case FinishReason.MALFORMED_FUNCTION_CALL:
        case FinishReason.UNEXPECTED_TOOL_CALL:
        case FinishReason.NO_IMAGE:
            return "error";
        default: {
            const _exhaustive = reason;
            throw new Error(`Unhandled stop reason: ${_exhaustive}`);
        }
    }
}
/**
 * Map string finish reason to our StopReason (for raw API responses).
 */
export function mapStopReasonString(reason) {
    switch (reason) {
        case "STOP":
            return "stop";
        case "MAX_TOKENS":
            return "length";
        default:
            return "error";
    }
}
/**
 * Run a Google GenAI SDK request with the shared provider retry policy
 * (408/409/429/5xx with backoff, honoring retry-after), mirroring how the
 * Anthropic and OpenAI adapters wrap their initial request in
 * retryProviderRequest. The SDK's ApiError has a `status` property but no
 * `headers` property, and retryProviderRequest only retries errors that carry
 * both, so normalize the error by adding the missing `headers` before
 * rethrowing.
 */
export function retryGoogleRequest(request, options) {
    return retryProviderRequest(async () => {
        try {
            return await request();
        }
        catch (error) {
            if (error instanceof Error && "status" in error && !("headers" in error)) {
                error.headers = undefined;
            }
            throw error;
        }
    }, {
        maxRetries: options?.maxRetries,
        maxRetryDelayMs: options?.maxRetryDelayMs,
        signal: options?.signal,
    });
}
//# sourceMappingURL=google-shared.js.map
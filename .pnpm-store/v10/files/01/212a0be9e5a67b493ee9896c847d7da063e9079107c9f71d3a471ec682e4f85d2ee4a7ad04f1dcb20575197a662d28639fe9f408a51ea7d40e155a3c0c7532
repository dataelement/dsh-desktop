import { GoogleGenAI, ResourceScope, ThinkingLevel, } from "@google/genai";
import { calculateCost, clampThinkingLevel } from "../models.js";
import { formatProviderError, normalizeProviderError } from "../utils/error-body.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";
import { providerHeadersToRecord } from "../utils/headers.js";
import { getPiUserAgent } from "../utils/pi-user-agent.js";
import { getProviderEnvValue } from "../utils/provider-env.js";
import { sanitizeSurrogates } from "../utils/sanitize-unicode.js";
import { convertMessages, convertTools, isThinkingPart, mapStopReason, resolveGoogleFunctionCallingMode, resolveGoogleThinkingLevel, retainThoughtSignature, retryGoogleRequest, supportsGoogleStrictToolSampling, } from "./google-shared.js";
import { buildBaseOptions } from "./simple-options.js";
const API_VERSION = "v1";
const GCP_VERTEX_CREDENTIALS_MARKER = "gcp-vertex-credentials";
const THINKING_LEVEL_MAP = {
    THINKING_LEVEL_UNSPECIFIED: ThinkingLevel.THINKING_LEVEL_UNSPECIFIED,
    MINIMAL: ThinkingLevel.MINIMAL,
    LOW: ThinkingLevel.LOW,
    MEDIUM: ThinkingLevel.MEDIUM,
    HIGH: ThinkingLevel.HIGH,
};
// Counter for generating unique tool call IDs
let toolCallCounter = 0;
export const stream = (model, context, options) => {
    const stream = new AssistantMessageEventStream();
    (async () => {
        const output = {
            role: "assistant",
            content: [],
            api: "google-vertex",
            provider: model.provider,
            model: model.id,
            usage: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                totalTokens: 0,
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: "pending",
            timestamp: Date.now(),
        };
        try {
            if (options?.fetch && options.fetch !== globalThis.fetch) {
                throw new Error("Custom fetch is not supported by the Google Vertex adapter");
            }
            const apiKey = resolveApiKey(options);
            // Create the client using either a Vertex API key, if provided, or ADC with project and location
            const client = apiKey
                ? createClientWithApiKey(model, apiKey, options?.headers)
                : createClient(model, resolveProject(options), resolveLocation(options), options?.headers, options?.env);
            let params = buildParams(model, context, options);
            const nextParams = await options?.onPayload?.(params, model);
            if (nextParams !== undefined) {
                params = nextParams;
            }
            const googleStream = await retryGoogleRequest(() => client.models.generateContentStream(params), options);
            stream.push({ type: "start", partial: output });
            let currentBlock = null;
            const blocks = output.content;
            const blockIndex = () => blocks.length - 1;
            for await (const chunk of googleStream) {
                // Vertex uses the same @google/genai GenerateContentResponse type as Gemini.
                // responseId is documented there as an output-only identifier for each response.
                output.responseId ||= chunk.responseId;
                const candidate = chunk.candidates?.[0];
                if (candidate?.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.text !== undefined) {
                            const isThinking = isThinkingPart(part);
                            if (!currentBlock ||
                                (isThinking && currentBlock.type !== "thinking") ||
                                (!isThinking && currentBlock.type !== "text")) {
                                if (currentBlock) {
                                    if (currentBlock.type === "text") {
                                        stream.push({
                                            type: "text_end",
                                            contentIndex: blocks.length - 1,
                                            content: currentBlock.text,
                                            partial: output,
                                        });
                                    }
                                    else {
                                        stream.push({
                                            type: "thinking_end",
                                            contentIndex: blockIndex(),
                                            content: currentBlock.thinking,
                                            partial: output,
                                        });
                                    }
                                }
                                if (isThinking) {
                                    currentBlock = { type: "thinking", thinking: "", thinkingSignature: undefined };
                                    output.content.push(currentBlock);
                                    stream.push({ type: "thinking_start", contentIndex: blockIndex(), partial: output });
                                }
                                else {
                                    currentBlock = { type: "text", text: "" };
                                    output.content.push(currentBlock);
                                    stream.push({ type: "text_start", contentIndex: blockIndex(), partial: output });
                                }
                            }
                            if (currentBlock.type === "thinking") {
                                currentBlock.thinking += part.text;
                                currentBlock.thinkingSignature = retainThoughtSignature(currentBlock.thinkingSignature, part.thoughtSignature);
                                stream.push({
                                    type: "thinking_delta",
                                    contentIndex: blockIndex(),
                                    delta: part.text,
                                    partial: output,
                                });
                            }
                            else {
                                currentBlock.text += part.text;
                                currentBlock.textSignature = retainThoughtSignature(currentBlock.textSignature, part.thoughtSignature);
                                stream.push({
                                    type: "text_delta",
                                    contentIndex: blockIndex(),
                                    delta: part.text,
                                    partial: output,
                                });
                            }
                        }
                        if (part.functionCall) {
                            if (currentBlock) {
                                if (currentBlock.type === "text") {
                                    stream.push({
                                        type: "text_end",
                                        contentIndex: blockIndex(),
                                        content: currentBlock.text,
                                        partial: output,
                                    });
                                }
                                else {
                                    stream.push({
                                        type: "thinking_end",
                                        contentIndex: blockIndex(),
                                        content: currentBlock.thinking,
                                        partial: output,
                                    });
                                }
                                currentBlock = null;
                            }
                            const providedId = part.functionCall.id;
                            const needsNewId = !providedId || output.content.some((b) => b.type === "toolCall" && b.id === providedId);
                            const toolCallId = needsNewId
                                ? `${part.functionCall.name}_${Date.now()}_${++toolCallCounter}`
                                : providedId;
                            const toolCall = {
                                type: "toolCall",
                                id: toolCallId,
                                name: part.functionCall.name || "",
                                arguments: part.functionCall.args ?? {},
                                ...(part.thoughtSignature && { thoughtSignature: part.thoughtSignature }),
                            };
                            output.content.push(toolCall);
                            stream.push({ type: "toolcall_start", contentIndex: blockIndex(), partial: output });
                            stream.push({
                                type: "toolcall_delta",
                                contentIndex: blockIndex(),
                                delta: JSON.stringify(toolCall.arguments),
                                partial: output,
                            });
                            stream.push({ type: "toolcall_end", contentIndex: blockIndex(), toolCall, partial: output });
                        }
                    }
                }
                if (candidate?.finishReason) {
                    output.rawStopReason = candidate.finishReason;
                    output.stopReason = mapStopReason(candidate.finishReason);
                    if (output.content.some((b) => b.type === "toolCall") && output.stopReason === "stop") {
                        output.stopReason = "toolUse";
                    }
                }
                if (chunk.usageMetadata) {
                    output.usage = {
                        input: (chunk.usageMetadata.promptTokenCount || 0) - (chunk.usageMetadata.cachedContentTokenCount || 0),
                        output: (chunk.usageMetadata.candidatesTokenCount || 0) + (chunk.usageMetadata.thoughtsTokenCount || 0),
                        cacheRead: chunk.usageMetadata.cachedContentTokenCount || 0,
                        cacheWrite: 0,
                        reasoning: chunk.usageMetadata.thoughtsTokenCount || 0,
                        totalTokens: chunk.usageMetadata.totalTokenCount || 0,
                        cost: {
                            input: 0,
                            output: 0,
                            cacheRead: 0,
                            cacheWrite: 0,
                            total: 0,
                        },
                    };
                    calculateCost(model, output.usage);
                }
            }
            if (currentBlock) {
                if (currentBlock.type === "text") {
                    stream.push({
                        type: "text_end",
                        contentIndex: blockIndex(),
                        content: currentBlock.text,
                        partial: output,
                    });
                }
                else {
                    stream.push({
                        type: "thinking_end",
                        contentIndex: blockIndex(),
                        content: currentBlock.thinking,
                        partial: output,
                    });
                }
            }
            if (options?.signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (output.stopReason === "pending") {
                throw new Error("Google Vertex stream ended without a finish reason");
            }
            if (output.stopReason === "aborted" || output.stopReason === "error") {
                const errorMessage = output.rawStopReason
                    ? `Provider stopped with: ${output.rawStopReason}`
                    : "An unknown error occurred";
                throw new Error(errorMessage);
            }
            stream.push({ type: "done", reason: output.stopReason, message: output });
            stream.end();
        }
        catch (error) {
            // Remove internal index property used during streaming
            for (const block of output.content) {
                if ("index" in block) {
                    delete block.index;
                }
            }
            output.stopReason = options?.signal?.aborted ? "aborted" : "error";
            output.errorMessage = formatProviderError(normalizeProviderError(error));
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
export const streamSimple = (model, context, options) => {
    const base = {
        ...buildBaseOptions(model, context, options, undefined),
        toolChoice: options?.toolChoice,
    };
    if (!options?.reasoning) {
        return stream(model, context, {
            ...base,
            thinking: { enabled: false },
        });
    }
    const clampedReasoning = clampThinkingLevel(model, options.reasoning);
    const resolvedLevel = resolveGoogleThinkingLevel(model, clampedReasoning);
    const geminiModel = model;
    if (isGemini3ProModel(geminiModel) || isGemini3FlashModel(geminiModel)) {
        return stream(model, context, {
            ...base,
            thinking: {
                enabled: true,
                level: getGemini3ThinkingLevel(resolvedLevel, geminiModel),
            },
        });
    }
    return stream(model, context, {
        ...base,
        thinking: {
            enabled: true,
            budgetTokens: getGoogleBudget(geminiModel, resolvedLevel, options.thinkingBudgets),
        },
    });
};
function createClient(model, project, location, optionsHeaders, env) {
    const googleAuthOptions = buildGoogleAuthOptions(env);
    return new GoogleGenAI({
        vertexai: true,
        project,
        location,
        apiVersion: API_VERSION,
        ...(googleAuthOptions ? { googleAuthOptions } : {}),
        httpOptions: buildHttpOptions(model, optionsHeaders),
    });
}
function createClientWithApiKey(model, apiKey, optionsHeaders) {
    return new GoogleGenAI({
        vertexai: true,
        apiKey,
        apiVersion: API_VERSION,
        httpOptions: buildHttpOptions(model, optionsHeaders),
    });
}
function buildHttpOptions(model, optionsHeaders) {
    const httpOptions = {};
    const baseUrl = resolveCustomBaseUrl(model.baseUrl);
    if (baseUrl) {
        httpOptions.baseUrl = baseUrl;
        httpOptions.baseUrlResourceScope = ResourceScope.COLLECTION;
        if (baseUrlIncludesApiVersion(baseUrl)) {
            httpOptions.apiVersion = "";
        }
    }
    const headers = providerHeadersToRecord({ "User-Agent": getPiUserAgent(), ...model.headers, ...optionsHeaders });
    if (headers) {
        httpOptions.headers = headers;
    }
    return Object.keys(httpOptions).length > 0 ? httpOptions : undefined;
}
function resolveCustomBaseUrl(baseUrl) {
    const trimmed = baseUrl.trim();
    if (!trimmed || trimmed.includes("{location}")) {
        return undefined;
    }
    return trimmed;
}
function baseUrlIncludesApiVersion(baseUrl) {
    try {
        const url = new URL(baseUrl);
        return url.pathname.split("/").some((part) => /^v\d+(?:beta\d*)?$/.test(part));
    }
    catch {
        return /(?:^|\/)v\d+(?:beta\d*)?(?:\/|$)/.test(baseUrl);
    }
}
function buildGoogleAuthOptions(env) {
    const keyFilename = getProviderEnvValue("GOOGLE_APPLICATION_CREDENTIALS", env);
    return keyFilename ? { keyFilename } : undefined;
}
function resolveApiKey(options) {
    const apiKey = options?.apiKey?.trim();
    if (!apiKey || apiKey === GCP_VERTEX_CREDENTIALS_MARKER || isPlaceholderApiKey(apiKey)) {
        return undefined;
    }
    return apiKey;
}
function isPlaceholderApiKey(apiKey) {
    return /^<[^>]+>$/.test(apiKey);
}
function resolveProject(options) {
    const project = options?.project ||
        getProviderEnvValue("GOOGLE_CLOUD_PROJECT", options?.env) ||
        getProviderEnvValue("GCLOUD_PROJECT", options?.env);
    if (!project) {
        throw new Error("Vertex AI requires a project ID. Set GOOGLE_CLOUD_PROJECT/GCLOUD_PROJECT or pass project in options.");
    }
    return project;
}
function resolveLocation(options) {
    const location = options?.location || getProviderEnvValue("GOOGLE_CLOUD_LOCATION", options?.env);
    if (!location) {
        throw new Error("Vertex AI requires a location. Set GOOGLE_CLOUD_LOCATION or pass location in options.");
    }
    return location;
}
function buildParams(model, context, options = {}) {
    const contents = convertMessages(model, context);
    const generationConfig = {};
    if (options.temperature !== undefined) {
        generationConfig.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = options.maxTokens;
    }
    const supportsStrictMode = supportsGoogleStrictToolSampling(model.id);
    const functionCallingMode = context.tools?.length
        ? resolveGoogleFunctionCallingMode(context.tools, options.toolChoice, supportsStrictMode)
        : undefined;
    const config = {
        ...(Object.keys(generationConfig).length > 0 && generationConfig),
        ...(context.systemPrompt && { systemInstruction: sanitizeSurrogates(context.systemPrompt) }),
        ...(context.tools &&
            context.tools.length > 0 && {
            tools: convertTools(context.tools, false, supportsStrictMode),
        }),
        ...(functionCallingMode !== undefined && {
            toolConfig: { functionCallingConfig: { mode: functionCallingMode } },
        }),
    };
    if (options.thinking?.enabled && model.reasoning) {
        const thinkingConfig = { includeThoughts: true };
        if (options.thinking.level !== undefined) {
            thinkingConfig.thinkingLevel = THINKING_LEVEL_MAP[options.thinking.level];
        }
        else if (options.thinking.budgetTokens !== undefined) {
            thinkingConfig.thinkingBudget = options.thinking.budgetTokens;
        }
        config.thinkingConfig = thinkingConfig;
    }
    else if (model.reasoning && options.thinking && !options.thinking.enabled) {
        config.thinkingConfig = getDisabledThinkingConfig(model);
    }
    if (options.signal) {
        if (options.signal.aborted) {
            throw new Error("Request aborted");
        }
        config.abortSignal = options.signal;
    }
    const params = {
        model: model.id,
        contents,
        config,
    };
    return params;
}
function isGemini3ProModel(model) {
    return /gemini-3(?:\.\d+)?-pro/.test(model.id.toLowerCase());
}
function isGemini3FlashModel(model) {
    const id = model.id.toLowerCase();
    return /gemini-3(?:\.\d+)?-flash/.test(id) || id === "gemini-flash-latest" || id === "gemini-flash-lite-latest";
}
function getDisabledThinkingConfig(model) {
    // Google docs: Gemini 3.1 Pro cannot disable thinking, and Gemini 3 Flash / Flash-Lite
    // do not support full thinking-off either. For Gemini 3 models, use the lowest supported
    // thinkingLevel without includeThoughts so hidden thinking remains invisible to pi.
    const geminiModel = model;
    if (isGemini3ProModel(geminiModel)) {
        return { thinkingLevel: ThinkingLevel.LOW };
    }
    if (isGemini3FlashModel(geminiModel)) {
        return { thinkingLevel: ThinkingLevel.MINIMAL };
    }
    // Gemini 2.x supports disabling via thinkingBudget = 0.
    return { thinkingBudget: 0 };
}
function getGemini3ThinkingLevel(effort, model) {
    if (isGemini3ProModel(model)) {
        switch (effort) {
            case "minimal":
            case "low":
                return "LOW";
            case "medium":
            case "high":
                return "HIGH";
        }
    }
    switch (effort) {
        case "minimal":
            return "MINIMAL";
        case "low":
            return "LOW";
        case "medium":
            return "MEDIUM";
        case "high":
            return "HIGH";
    }
}
function getGoogleBudget(model, level, customBudgets) {
    if (customBudgets?.[level] !== undefined) {
        return customBudgets[level];
    }
    if (model.id.includes("2.5-pro")) {
        const budgets = {
            minimal: 128,
            low: 2048,
            medium: 8192,
            high: 32768,
        };
        return budgets[level];
    }
    if (model.id.includes("2.5-flash")) {
        const budgets = {
            minimal: 128,
            low: 2048,
            medium: 8192,
            high: 24576,
        };
        return budgets[level];
    }
    return -1;
}
//# sourceMappingURL=google-vertex.js.map
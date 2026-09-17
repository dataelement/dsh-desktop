import { AzureOpenAI } from "openai";
import { clampThinkingLevel } from "../models.js";
import { formatProviderError, normalizeProviderError } from "../utils/error-body.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";
import { headersToRecord } from "../utils/headers.js";
import { getPiUserAgent } from "../utils/pi-user-agent.js";
import { getProviderEnvValue } from "../utils/provider-env.js";
import { retryProviderRequest } from "../utils/provider-retry.js";
import { createGrammarToolInputProperties } from "./constrained-sampling.js";
import { clampOpenAIPromptCacheKey } from "./openai-prompt-cache.js";
import { convertResponsesMessages, convertResponsesTools, processResponsesStream } from "./openai-responses-shared.js";
import { buildBaseOptions } from "./simple-options.js";
const DEFAULT_AZURE_API_VERSION = "v1";
const AZURE_TOOL_CALL_PROVIDERS = new Set(["openai", "openai-codex", "opencode", "azure-openai-responses"]);
// OpenAI Responses rejects max_output_tokens below 16: https://github.com/earendil-works/pi/issues/6265
const OPENAI_RESPONSES_MIN_OUTPUT_TOKENS = 16;
function parseDeploymentNameMap(value) {
    const map = new Map();
    if (!value)
        return map;
    for (const entry of value.split(",")) {
        const trimmed = entry.trim();
        if (!trimmed)
            continue;
        const [modelId, deploymentName] = trimmed.split("=", 2);
        if (!modelId || !deploymentName)
            continue;
        map.set(modelId.trim(), deploymentName.trim());
    }
    return map;
}
function resolveDeploymentName(model, options) {
    if (options?.azureDeploymentName) {
        return options.azureDeploymentName;
    }
    const mappedDeployment = parseDeploymentNameMap(getProviderEnvValue("AZURE_OPENAI_DEPLOYMENT_NAME_MAP", options?.env)).get(model.id);
    return mappedDeployment || model.id;
}
function formatAzureOpenAIError(error) {
    return formatProviderError(normalizeProviderError(error), "Azure OpenAI API error");
}
/**
 * Generate function for Azure OpenAI Responses API
 */
export const stream = (model, context, options) => {
    const stream = new AssistantMessageEventStream();
    // Start async processing
    (async () => {
        const deploymentName = resolveDeploymentName(model, options);
        const output = {
            role: "assistant",
            content: [],
            api: "azure-openai-responses",
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
            // Create Azure OpenAI client
            const apiKey = options?.apiKey;
            if (!apiKey) {
                throw new Error(`No API key for provider: ${model.provider}`);
            }
            const client = createClient(model, apiKey, options);
            const grammarToolInputProperties = createGrammarToolInputProperties(context.tools, model.compat?.supportsOpenAIGrammarTools ?? false);
            let params = buildParams(model, context, options, deploymentName, grammarToolInputProperties);
            const nextParams = await options?.onPayload?.(params, model);
            if (nextParams !== undefined) {
                params = nextParams;
            }
            const requestOptions = {
                ...(options?.signal ? { signal: options.signal } : {}),
                ...(options?.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {}),
                maxRetries: 0,
            };
            const { data: openaiStream, response } = await retryProviderRequest(() => client.responses.create(params, requestOptions).withResponse(), {
                maxRetries: options?.maxRetries,
                maxRetryDelayMs: options?.maxRetryDelayMs,
                signal: options?.signal,
            });
            await options?.onResponse?.({ status: response.status, headers: headersToRecord(response.headers) }, model);
            stream.push({ type: "start", partial: output });
            await processResponsesStream(openaiStream, output, stream, model, { grammarToolInputProperties });
            if (options?.signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (output.stopReason === "pending") {
                throw new Error("Azure OpenAI Responses stream ended without a stop reason");
            }
            if (output.stopReason === "aborted" || output.stopReason === "error") {
                throw new Error(output.errorMessage || "An unknown error occurred");
            }
            stream.push({ type: "done", reason: output.stopReason, message: output });
            stream.end();
        }
        catch (error) {
            for (const block of output.content) {
                delete block.index;
                // Streaming scratch buffers are only used during parsing; never persist them.
                delete block.partialJson;
                delete block.customInput;
            }
            output.stopReason = options?.signal?.aborted ? "aborted" : "error";
            output.errorMessage = formatAzureOpenAIError(error);
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
export const streamSimple = (model, context, options) => {
    const apiKey = options?.apiKey;
    if (!apiKey) {
        throw new Error(`No API key for provider: ${model.provider}`);
    }
    const base = {
        ...buildBaseOptions(model, context, options, apiKey),
        toolChoice: options?.toolChoice,
    };
    const clampedReasoning = options?.reasoning ? clampThinkingLevel(model, options.reasoning) : undefined;
    const reasoningEffort = clampedReasoning === "off" ? undefined : clampedReasoning;
    return stream(model, context, {
        ...base,
        reasoningEffort,
    });
};
function normalizeAzureBaseUrl(baseUrl) {
    const trimmed = baseUrl.trim().replace(/\/+$/, "");
    let url;
    try {
        url = new URL(trimmed);
    }
    catch {
        throw new Error(`Invalid Azure OpenAI base URL: ${baseUrl}`);
    }
    const isAzureHost = url.hostname.endsWith(".openai.azure.com") ||
        url.hostname.endsWith(".cognitiveservices.azure.com") ||
        url.hostname.endsWith(".ai.azure.com");
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    // Ensure Azure hosts have /openai/v1 as base path so the AzureOpenAI SDK
    // can append /deployments/<model>/... and ?api-version=v1 correctly.
    if (isAzureHost &&
        (normalizedPath === "" ||
            normalizedPath === "/" ||
            normalizedPath === "/openai" ||
            normalizedPath === "/openai/v1/responses")) {
        url.pathname = "/openai/v1";
        url.search = "";
    }
    return url.toString().replace(/\/+$/, "");
}
function buildDefaultBaseUrl(resourceName) {
    return `https://${resourceName}.openai.azure.com/openai/v1`;
}
function resolveAzureConfig(model, options) {
    const apiVersion = options?.azureApiVersion ||
        getProviderEnvValue("AZURE_OPENAI_API_VERSION", options?.env) ||
        DEFAULT_AZURE_API_VERSION;
    const baseUrl = options?.azureBaseUrl?.trim() || getProviderEnvValue("AZURE_OPENAI_BASE_URL", options?.env)?.trim() || undefined;
    const resourceName = options?.azureResourceName || getProviderEnvValue("AZURE_OPENAI_RESOURCE_NAME", options?.env);
    let resolvedBaseUrl = baseUrl;
    if (!resolvedBaseUrl && resourceName) {
        resolvedBaseUrl = buildDefaultBaseUrl(resourceName);
    }
    if (!resolvedBaseUrl && model.baseUrl) {
        resolvedBaseUrl = model.baseUrl;
    }
    if (!resolvedBaseUrl) {
        throw new Error("Azure OpenAI base URL is required. Set AZURE_OPENAI_BASE_URL or AZURE_OPENAI_RESOURCE_NAME, or pass azureBaseUrl, azureResourceName, or model.baseUrl.");
    }
    return {
        baseUrl: normalizeAzureBaseUrl(resolvedBaseUrl),
        apiVersion,
    };
}
function createClient(model, apiKey, options) {
    const headers = { "User-Agent": getPiUserAgent(), ...model.headers };
    if (options?.headers) {
        Object.assign(headers, options.headers);
    }
    const { baseUrl, apiVersion } = resolveAzureConfig(model, options);
    return new AzureOpenAI({
        apiKey,
        apiVersion,
        dangerouslyAllowBrowser: true,
        fetch: options?.fetch,
        defaultHeaders: headers,
        baseURL: baseUrl,
    });
}
function buildParams(model, context, options, deploymentName, grammarToolInputProperties = createGrammarToolInputProperties(context.tools, model.compat?.supportsOpenAIGrammarTools ?? false)) {
    const messages = convertResponsesMessages(model, context, AZURE_TOOL_CALL_PROVIDERS, {
        grammarToolInputProperties,
    });
    const params = {
        model: deploymentName,
        input: messages,
        stream: true,
        prompt_cache_key: clampOpenAIPromptCacheKey(options?.sessionId),
        store: false,
    };
    if (options?.maxTokens) {
        params.max_output_tokens = Math.max(options.maxTokens, OPENAI_RESPONSES_MIN_OUTPUT_TOKENS);
    }
    if (options?.temperature !== undefined) {
        params.temperature = options?.temperature;
    }
    if (context.tools && context.tools.length > 0) {
        params.tools = convertResponsesTools(context.tools, {
            supportsStrictMode: model.compat?.supportsStrictMode ?? true,
            supportsOpenAIGrammarTools: model.compat?.supportsOpenAIGrammarTools ?? false,
        });
    }
    if (options?.toolChoice !== undefined) {
        params.tool_choice = options.toolChoice;
    }
    if (model.reasoning) {
        if (options?.reasoningEffort || options?.reasoningSummary) {
            const effort = options?.reasoningEffort
                ? (model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort)
                : "medium";
            params.reasoning = {
                effort: effort,
                summary: options?.reasoningSummary || "auto",
            };
            params.include = ["reasoning.encrypted_content"];
        }
        else if (model.thinkingLevelMap?.off !== null) {
            params.reasoning = {
                effort: (model.thinkingLevelMap?.off ?? "none"),
            };
        }
    }
    // Last so custom keys override the named request fields.
    if (options?.samplingParams) {
        Object.assign(params, options.samplingParams);
    }
    return params;
}
//# sourceMappingURL=azure-openai-responses.js.map
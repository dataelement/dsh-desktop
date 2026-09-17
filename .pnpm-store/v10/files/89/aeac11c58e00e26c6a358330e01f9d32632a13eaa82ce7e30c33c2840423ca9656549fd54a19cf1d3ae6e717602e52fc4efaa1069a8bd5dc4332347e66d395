import { BedrockRuntimeClient, BedrockRuntimeServiceException, StopReason as BedrockStopReason, CachePointType, CacheTTL, ConversationRole, ConverseStreamCommand, ImageFormat, ToolResultStatus, } from "@aws-sdk/client-bedrock-runtime";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { calculateCost } from "../models.js";
import { appendAssistantMessageDiagnostic } from "../utils/diagnostics.js";
import { normalizeProviderError } from "../utils/error-body.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";
import { providerHeadersToRecord } from "../utils/headers.js";
import { parseStreamingJson } from "../utils/json-parse.js";
import { resolveHttpProxyUrlForTarget } from "../utils/node-http-proxy.js";
import { getProviderEnvValue } from "../utils/provider-env.js";
import { sanitizeSurrogates } from "../utils/sanitize-unicode.js";
import { getJsonSchemaToolParameters, resolveJsonSchemaStrictSampling } from "./constrained-sampling.js";
import { adjustMaxTokensForThinking, buildBaseOptions, clampMaxTokensToContext, clampReasoning, } from "./simple-options.js";
import { transformMessages } from "./transform-messages.js";
const EMPTY_TEXT_PLACEHOLDER = "<empty>";
/** Matches the placeholder the Anthropic API path uses for redacted thinking. */
const REDACTED_THINKING_PLACEHOLDER = "[Reasoning redacted]";
export const stream = (model, context, options = {}) => {
    const stream = new AssistantMessageEventStream();
    (async () => {
        const output = {
            role: "assistant",
            content: [],
            api: "bedrock-converse-stream",
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
        const blocks = output.content;
        // A profile explicitly configured through pi's auth flow (the `profile`
        // option or scoped `AWS_PROFILE` on the stored credential's env) must win
        // over ambient AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. The SDK default
        // chain already prefers a configured profile over env keys, but only when
        // `credentials` is not set on the client config. See #6957.
        const optionsProfile = options.profile || options.env?.AWS_PROFILE;
        const config = {
            profile: optionsProfile || getProviderEnvValue("AWS_PROFILE", options.env),
        };
        const configuredRegion = getConfiguredBedrockRegion(options);
        const hasAmbientConfiguredProfile = Boolean(getProviderEnvValue("AWS_PROFILE"));
        const endpointRegion = getStandardBedrockEndpointRegion(model.baseUrl);
        const useExplicitEndpoint = shouldUseExplicitBedrockEndpoint(model.baseUrl, configuredRegion, hasAmbientConfiguredProfile);
        // Only pin standard AWS Bedrock runtime endpoints when no region or ambient AWS_PROFILE is configured.
        // This preserves custom endpoints (VPC/proxy) from #3402 without forcing built-in
        // catalog defaults such as us-east-1 to override AWS_REGION/AWS_PROFILE.
        if (useExplicitEndpoint) {
            config.endpoint = model.baseUrl;
        }
        // Resolve bearer token for Bedrock API key auth.
        const skipAuth = getProviderEnvValue("AWS_BEDROCK_SKIP_AUTH", options.env) === "1";
        const bearerToken = options.bearerToken ||
            options.apiKey ||
            getProviderEnvValue("AWS_BEARER_TOKEN_BEDROCK", options.env) ||
            undefined;
        const useBearerToken = bearerToken !== undefined && !skipAuth;
        // in Node.js/Bun environment only
        if (typeof process !== "undefined" && (process.versions?.node || process.versions?.bun)) {
            // Region resolution: ARN-embedded > explicit option > env vars > SDK default chain.
            // When the model ID is an inference profile ARN, extract the region from it.
            // This avoids conflicts with AWS_REGION set for other services.
            const arnRegionMatch = model.id.match(/^arn:aws(?:-[a-z0-9-]+)?:bedrock:([a-z0-9-]+):/);
            if (arnRegionMatch) {
                config.region = arnRegionMatch[1];
            }
            else if (configuredRegion) {
                config.region = configuredRegion;
            }
            else if (endpointRegion && useExplicitEndpoint) {
                config.region = endpointRegion;
            }
            else if (!hasAmbientConfiguredProfile) {
                config.region = "us-east-1";
            }
            // Support proxies that don't need authentication
            if (skipAuth) {
                config.credentials = {
                    accessKeyId: "dummy-access-key",
                    secretAccessKey: "dummy-secret-key",
                };
            }
            const credentials = getConfiguredBedrockCredentials(options.env);
            if (!skipAuth && credentials && !optionsProfile) {
                config.credentials = credentials;
            }
            const proxyUrl = resolveHttpProxyUrlForTarget(model.baseUrl, options.env);
            if (proxyUrl) {
                // Bedrock runtime uses NodeHttp2Handler by default since v3.798.0, which is based
                // on `http2` module and has no support for http agent.
                // Use NodeHttpHandler to support HTTP(S) proxy agents.
                config.requestHandler = new NodeHttpHandler({
                    httpAgent: new HttpProxyAgent(proxyUrl),
                    httpsAgent: new HttpsProxyAgent(proxyUrl),
                });
            }
            else if (getProviderEnvValue("AWS_BEDROCK_FORCE_HTTP1", options.env) === "1") {
                // Some custom endpoints require HTTP/1.1 instead of HTTP/2
                config.requestHandler = new NodeHttpHandler();
            }
        }
        else {
            // Non-Node environment (browser): fall back to us-east-1 since
            // there's no config file resolution available.
            config.region =
                configuredRegion || (endpointRegion && useExplicitEndpoint ? endpointRegion : undefined) || "us-east-1";
        }
        if (useBearerToken) {
            config.token = { token: bearerToken };
            config.authSchemePreference = ["httpBearerAuth"];
        }
        // Kept outside the try so the catch can still correlate a mid-stream failure:
        // exceptions delivered as stream events carry no HTTP metadata of their own.
        let responseRequestId;
        try {
            const supportsStrictMode = model.compat?.supportsStrictMode ?? false;
            const client = new BedrockRuntimeClient(config);
            let observedRawResponse = false;
            if (options.onResponse) {
                addResponseHeadersMiddleware(client, options.onResponse, model, () => {
                    observedRawResponse = true;
                });
            }
            const customHeaders = providerHeadersToRecord(options.headers);
            if (customHeaders) {
                addCustomHeadersMiddleware(client, customHeaders);
            }
            const cacheRetention = resolveCacheRetention(options.cacheRetention, options.env);
            const inferenceMaxTokens = options.maxTokens ?? (isAnthropicClaudeModel(model) ? model.maxTokens : undefined);
            let commandInput = {
                modelId: model.id,
                messages: convertMessages(context, model, cacheRetention, options.env),
                system: buildSystemPrompt(context.systemPrompt, model, cacheRetention, options.env),
                inferenceConfig: {
                    ...(inferenceMaxTokens !== undefined && { maxTokens: inferenceMaxTokens }),
                    ...(options.temperature !== undefined && { temperature: options.temperature }),
                },
                toolConfig: convertToolConfig(context.tools, options.toolChoice, supportsStrictMode),
                additionalModelRequestFields: buildAdditionalModelRequestFields(model, options),
                ...(options.requestMetadata !== undefined && { requestMetadata: options.requestMetadata }),
            };
            const nextCommandInput = await options?.onPayload?.(commandInput, model);
            if (nextCommandInput !== undefined) {
                commandInput = nextCommandInput;
            }
            const command = new ConverseStreamCommand(commandInput);
            const response = await client.send(command, { abortSignal: options.signal });
            responseRequestId = normalizeDiagnosticValue(response.$metadata.requestId);
            if (!observedRawResponse && response.$metadata.httpStatusCode !== undefined) {
                const responseHeaders = {};
                if (response.$metadata.requestId) {
                    responseHeaders["x-amzn-requestid"] = response.$metadata.requestId;
                }
                await options?.onResponse?.({ status: response.$metadata.httpStatusCode, headers: responseHeaders }, model);
            }
            for await (const item of response.stream) {
                if (item.messageStart) {
                    if (item.messageStart.role !== ConversationRole.ASSISTANT) {
                        throw new Error("Unexpected assistant message start but got user message start instead");
                    }
                    stream.push({ type: "start", partial: output });
                }
                else if (item.contentBlockStart) {
                    handleContentBlockStart(item.contentBlockStart, blocks, output, stream);
                }
                else if (item.contentBlockDelta) {
                    handleContentBlockDelta(item.contentBlockDelta, blocks, output, stream);
                }
                else if (item.contentBlockStop) {
                    handleContentBlockStop(item.contentBlockStop, blocks, output, stream);
                }
                else if (item.messageStop) {
                    output.rawStopReason = item.messageStop.stopReason;
                    const { stopReason, errorMessage } = mapStopReason(item.messageStop.stopReason);
                    output.stopReason = stopReason;
                    if (errorMessage) {
                        output.errorMessage = errorMessage;
                    }
                }
                else if (item.metadata) {
                    handleMetadata(item.metadata, model, output);
                }
                else if (item.internalServerException) {
                    throw item.internalServerException;
                }
                else if (item.modelStreamErrorException) {
                    throw item.modelStreamErrorException;
                }
                else if (item.validationException) {
                    throw item.validationException;
                }
                else if (item.throttlingException) {
                    throw item.throttlingException;
                }
                else if (item.serviceUnavailableException) {
                    throw item.serviceUnavailableException;
                }
            }
            if (options.signal?.aborted) {
                throw new Error("Request was aborted");
            }
            if (output.stopReason === "pending") {
                throw new Error("Bedrock stream ended without a stop reason");
            }
            if (output.stopReason === "error" || output.stopReason === "aborted") {
                throw new Error(output.errorMessage || "An unknown error occurred");
            }
            // A stream can settle without stopping every block, so finalize here too.
            for (const block of output.content)
                finalizeStreamingBlock(block);
            stream.push({ type: "done", reason: output.stopReason, message: output });
            stream.end();
        }
        catch (error) {
            for (const block of output.content) {
                finalizeStreamingBlock(block);
            }
            output.stopReason = options.signal?.aborted ? "aborted" : "error";
            output.errorMessage = formatBedrockError(error);
            if (output.stopReason === "error") {
                appendBedrockFailureDiagnostic(output, error, responseRequestId);
            }
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();
    return stream;
};
/**
 * Human-readable prefixes for Bedrock SDK exception names.
 * The downstream retry logic in agent-session matches patterns like
 * `server.?error` and `service.?unavailable`, so we preserve the legacy
 * prefix format rather than using the raw SDK exception name.
 */
const BEDROCK_ERROR_PREFIXES = {
    InternalServerException: "Internal server error",
    ModelStreamErrorException: "Model stream error",
    ValidationException: "Validation error",
    ThrottlingException: "Throttling error",
    ServiceUnavailableException: "Service unavailable",
};
/**
 * Some models reject the account/profile's configured Bedrock data retention mode
 * (e.g. "data retention mode 'default' is not available for this model"). Point
 * users at the AWS docs explaining how to configure a supported mode.
 */
const BEDROCK_DATA_RETENTION_DOCS_URL = "https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html";
/**
 * Format a Bedrock error with a human-readable prefix.
 * AWS SDK exceptions (both from `client.send()` and from stream event items)
 * extend BedrockRuntimeServiceException. We map the `.name` to a stable
 * human-readable prefix so downstream consumers (retry logic, context-overflow
 * detection) can distinguish error categories via simple string matching.
 */
function formatBedrockError(error) {
    const norm = normalizeProviderError(error);
    // Surface the raw HTTP body (with status) when the SDK did not fold it into
    // the message; otherwise fall back to the message. This is what stops a
    // gateway 403 from collapsing to `Unknown: UnknownError`.
    const core = !norm.messageCarriesBody && norm.status !== undefined && norm.body !== undefined
        ? `${norm.status}: ${norm.body}`
        : norm.message;
    const dataRetentionHint = /data retention mode/i.test(core)
        ? ` See ${BEDROCK_DATA_RETENTION_DOCS_URL} for supported data retention modes.`
        : "";
    if (error instanceof BedrockRuntimeServiceException) {
        const prefix = BEDROCK_ERROR_PREFIXES[error.name] ?? error.name;
        return `${prefix}: ${core}${dataRetentionHint}`;
    }
    return `${core}${dataRetentionHint}`;
}
/** Over-long header values are dropped rather than truncated: a truncated request id is not a request id. */
const MAX_BEDROCK_DIAGNOSTIC_VALUE_CHARS = 200;
function normalizeDiagnosticValue(value) {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_BEDROCK_DIAGNOSTIC_VALUE_CHARS)
        return undefined;
    return trimmed;
}
/**
 * The SDK puts the modeled code on `error.name` for service exceptions and unmodeled stream errors alike, so
 * do not narrow to `BedrockRuntimeServiceException`. Modeled Bedrock errors all end in `Exception`, unlike
 * transport names such as `TimeoutError`.
 */
function extractBedrockErrorCode(error) {
    if (!(error instanceof Error) || !error.name.endsWith("Exception"))
        return undefined;
    return normalizeDiagnosticValue(error.name);
}
/**
 * Structured metadata alongside `errorMessage`, which stays byte-identical because `isRetryableAssistantError`
 * matches against it. Unknown fields are omitted, never guessed: a modeled mid-stream exception reaches us as
 * a bare object literal, leaving only `fallbackRequestId`. `details` only, as the throw is not always `Error`.
 */
function appendBedrockFailureDiagnostic(output, error, fallbackRequestId) {
    const metadata = error?.$metadata;
    const details = {};
    if (typeof metadata?.httpStatusCode === "number")
        details.status = metadata.httpStatusCode;
    const errorCode = extractBedrockErrorCode(error);
    if (errorCode !== undefined)
        details.errorCode = errorCode;
    const requestId = normalizeDiagnosticValue(metadata?.requestId) ?? fallbackRequestId;
    if (requestId !== undefined)
        details.requestId = requestId;
    if (Object.keys(details).length === 0)
        return;
    appendAssistantMessageDiagnostic(output, { type: "bedrock_response_failure", timestamp: Date.now(), details });
}
/**
 * Header keys that must never be overwritten by caller-supplied headers.
 * `host` and `x-amz-*` participate in the SigV4 canonical request; `authorization`
 * is owned by SigV4 or the bearer-token path (config.token + authSchemePreference).
 * Compared case-insensitively (caller key is lower-cased before lookup).
 */
const RESERVED_HEADER_EXACT = new Set(["authorization", "host"]);
function isReservedHeader(key) {
    const lower = key.toLowerCase();
    return lower.startsWith("x-amz-") || RESERVED_HEADER_EXACT.has(lower);
}
/**
 * Attach caller-supplied headers to the outgoing Bedrock request via a Smithy
 * `build`-step middleware. The `build` step runs after request serialisation but
 * before SigV4 signing, so injected headers are covered by the signature. Reserved
 * SigV4 / auth headers (`x-amz-*`, `authorization`, `host`) are silently skipped;
 * all other caller headers override any existing same-named header on the request.
 */
function addCustomHeadersMiddleware(client, headers) {
    const middleware = (next) => async (args) => {
        const request = args.request;
        if (request && typeof request === "object" && "headers" in request) {
            const requestHeaders = request.headers;
            for (const [key, value] of Object.entries(headers)) {
                if (!isReservedHeader(key)) {
                    requestHeaders[key] = value;
                }
            }
        }
        return next(args);
    };
    client.middlewareStack.add(middleware, { step: "build", name: "pi-ai-custom-headers", priority: "low" });
}
function isSmithyHttpResponse(response) {
    if (!response || typeof response !== "object")
        return false;
    const candidate = response;
    return typeof candidate.statusCode === "number" && !!candidate.headers && typeof candidate.headers === "object";
}
function toProviderResponse(response) {
    if (!isSmithyHttpResponse(response))
        return undefined;
    return { status: response.statusCode, headers: { ...response.headers } };
}
/**
 * Bedrock's modeled `$metadata` only preserves selected HTTP metadata (for example
 * requestId), so custom gateway headers are otherwise lost before callers see
 * `onResponse`. Capture the raw Smithy HTTP response at the deserialize step,
 * after the SDK receives the response but before the event stream is consumed.
 */
function addResponseHeadersMiddleware(client, onResponse, model, onObserved) {
    const middleware = (next) => async (args) => {
        const result = await next(args);
        const providerResponse = toProviderResponse(result.response);
        if (providerResponse) {
            onObserved();
            await onResponse(providerResponse, model);
        }
        return result;
    };
    client.middlewareStack.add(middleware, { step: "deserialize", name: "pi-ai-response-headers" });
}
export const streamSimple = (model, context, options) => {
    const base = {
        ...buildBaseOptions(model, context, options, undefined),
        toolChoice: options?.toolChoice,
    };
    if (!options?.reasoning) {
        return stream(model, context, { ...base, reasoning: undefined });
    }
    if (isAnthropicClaudeModel(model)) {
        if (supportsAdaptiveThinking(model.id, model.name)) {
            return stream(model, context, {
                ...base,
                reasoning: options.reasoning,
                thinkingBudgets: options.thinkingBudgets,
            });
        }
        // Undefined means the caller did not request an output cap; let the helper use the model cap.
        // Do not coerce to 0 here, or the thinking budget would become the entire maxTokens value.
        const adjusted = adjustMaxTokensForThinking(base.maxTokens, model.maxTokens, options.reasoning, options.thinkingBudgets);
        const maxTokens = clampMaxTokensToContext(model, context, adjusted.maxTokens);
        return stream(model, context, {
            ...base,
            maxTokens,
            reasoning: options.reasoning,
            thinkingBudgets: {
                ...(options.thinkingBudgets || {}),
                [clampReasoning(options.reasoning)]: Math.min(adjusted.thinkingBudget, Math.max(0, maxTokens - 1024)),
            },
        });
    }
    return stream(model, context, {
        ...base,
        reasoning: options.reasoning,
        thinkingBudgets: options.thinkingBudgets,
    });
};
function handleContentBlockStart(event, blocks, output, stream) {
    const index = event.contentBlockIndex;
    const start = event.start;
    if (start?.toolUse) {
        const block = {
            type: "toolCall",
            id: start.toolUse.toolUseId || "",
            name: start.toolUse.name || "",
            arguments: {},
            partialJson: "",
            index,
        };
        output.content.push(block);
        stream.push({ type: "toolcall_start", contentIndex: blocks.length - 1, partial: output });
    }
}
function handleContentBlockDelta(event, blocks, output, stream) {
    const contentBlockIndex = event.contentBlockIndex;
    const delta = event.delta;
    let index = blocks.findIndex((b) => b.index === contentBlockIndex);
    let block = blocks[index];
    if (delta?.text !== undefined) {
        // If no text block exists yet, create one, as `handleContentBlockStart` is not sent for text blocks
        if (!block) {
            const newBlock = { type: "text", text: "", index: contentBlockIndex };
            output.content.push(newBlock);
            index = blocks.length - 1;
            block = blocks[index];
            stream.push({ type: "text_start", contentIndex: index, partial: output });
        }
        if (block.type === "text") {
            block.text += delta.text;
            stream.push({ type: "text_delta", contentIndex: index, delta: delta.text, partial: output });
        }
    }
    else if (delta?.toolUse && block?.type === "toolCall") {
        block.partialJson = (block.partialJson || "") + (delta.toolUse.input || "");
        block.arguments = parseStreamingJson(block.partialJson);
        stream.push({ type: "toolcall_delta", contentIndex: index, delta: delta.toolUse.input || "", partial: output });
    }
    else if (delta?.reasoningContent) {
        let thinkingBlock = block;
        let thinkingIndex = index;
        if (!thinkingBlock) {
            const newBlock = { type: "thinking", thinking: "", thinkingSignature: "", index: contentBlockIndex };
            output.content.push(newBlock);
            thinkingIndex = blocks.length - 1;
            thinkingBlock = blocks[thinkingIndex];
            stream.push({ type: "thinking_start", contentIndex: thinkingIndex, partial: output });
        }
        if (thinkingBlock?.type === "thinking") {
            if (delta.reasoningContent.text) {
                thinkingBlock.thinking += delta.reasoningContent.text;
                stream.push({
                    type: "thinking_delta",
                    contentIndex: thinkingIndex,
                    delta: delta.reasoningContent.text,
                    partial: output,
                });
            }
            // `thinkingSignature` holds either an Anthropic signature or an opaque redacted
            // payload, never both: mixing them would corrupt whichever arrived first.
            if (delta.reasoningContent.signature && !thinkingBlock.redacted) {
                thinkingBlock.thinkingSignature =
                    (thinkingBlock.thinkingSignature || "") + delta.reasoningContent.signature;
            }
            if (delta.reasoningContent.redactedContent?.length) {
                // Encrypted reasoning from non-Anthropic models on Bedrock (e.g. OpenAI GPT-5.6).
                // The payload is opaque, so keep it verbatim in `thinkingSignature` the way the
                // Anthropic path stores redacted thinking, and replay it on the next turn.
                if (!thinkingBlock.redacted) {
                    thinkingBlock.redacted = true;
                    thinkingBlock.thinkingSignature = "";
                    thinkingBlock.thinking += REDACTED_THINKING_PLACEHOLDER;
                    stream.push({
                        type: "thinking_delta",
                        contentIndex: thinkingIndex,
                        delta: REDACTED_THINKING_PLACEHOLDER,
                        partial: output,
                    });
                }
                thinkingBlock.redactedChunks ??= [];
                thinkingBlock.redactedChunks.push(delta.reasoningContent.redactedContent);
            }
        }
    }
}
/**
 * Encodes buffered encrypted reasoning into `thinkingSignature` and drops the scratch
 * buffer, which must never reach a persisted message: `Uint8Array` serializes to an
 * index-keyed object roughly ten times the size of the base64 payload.
 */
function flushRedactedContent(block) {
    if (block.type !== "thinking" || !block.redactedChunks)
        return;
    block.thinkingSignature = bytesToBase64(block.redactedChunks);
    delete block.redactedChunks;
}
/**
 * Strips every streaming scratch field. Runs from the terminal paths as well as
 * `contentBlockStop`, because a stream can settle without stopping each block.
 */
function finalizeStreamingBlock(block) {
    delete block.index;
    // partialJson is only a streaming scratch buffer; never persist it.
    delete block.partialJson;
    flushRedactedContent(block);
}
function handleMetadata(event, model, output) {
    if (event.usage) {
        output.usage.input = event.usage.inputTokens || 0;
        output.usage.output = event.usage.outputTokens || 0;
        output.usage.cacheRead = event.usage.cacheReadInputTokens || 0;
        output.usage.cacheWrite = event.usage.cacheWriteInputTokens || 0;
        output.usage.totalTokens = event.usage.totalTokens || output.usage.input + output.usage.output;
        calculateCost(model, output.usage);
    }
}
function handleContentBlockStop(event, blocks, output, stream) {
    const index = blocks.findIndex((b) => b.index === event.contentBlockIndex);
    const block = blocks[index];
    if (!block)
        return;
    delete block.index;
    switch (block.type) {
        case "text":
            stream.push({ type: "text_end", contentIndex: index, content: block.text, partial: output });
            break;
        case "thinking":
            flushRedactedContent(block);
            stream.push({ type: "thinking_end", contentIndex: index, content: block.thinking, partial: output });
            break;
        case "toolCall":
            block.arguments = parseStreamingJson(block.partialJson);
            // Finalize in-place and strip the scratch buffer so replay only
            // carries parsed arguments.
            delete block.partialJson;
            stream.push({ type: "toolcall_end", contentIndex: index, toolCall: block, partial: output });
            break;
    }
}
/**
 * Check if the model supports adaptive thinking (Opus 4.6+, Sonnet 4.6).
 * Checks both model ID and model name to support application inference profiles
 * whose ARNs don't contain the model name.
 */
function getModelMatchCandidates(modelId, modelName) {
    const values = modelName ? [modelId, modelName] : [modelId];
    return values.flatMap((value) => {
        const lower = value.toLowerCase();
        return [lower, lower.replace(/[\s_.:]+/g, "-")];
    });
}
function supportsAdaptiveThinking(modelId, modelName) {
    const candidates = getModelMatchCandidates(modelId, modelName);
    return candidates.some((s) => s.includes("opus-4-6") ||
        s.includes("opus-4-7") ||
        s.includes("opus-4-8") ||
        s.includes("opus-5") ||
        s.includes("sonnet-4-6") ||
        s.includes("sonnet-5") ||
        s.includes("fable-5"));
}
function supportsNativeXhighEffort(model) {
    const candidates = getModelMatchCandidates(model.id, model.name);
    return candidates.some((s) => s.includes("opus-4-7") ||
        s.includes("opus-4-8") ||
        s.includes("opus-5") ||
        s.includes("sonnet-5") ||
        s.includes("fable-5"));
}
function mapThinkingLevelToEffort(model, level) {
    if (level === "xhigh" && supportsNativeXhighEffort(model))
        return "xhigh";
    const mapped = level ? model.thinkingLevelMap?.[level] : undefined;
    if (typeof mapped === "string")
        return mapped;
    switch (level) {
        case "minimal":
        case "low":
            return "low";
        case "medium":
            return "medium";
        case "high":
            return "high";
        default:
            return "high";
    }
}
/**
 * Resolve cache retention preference.
 * Defaults to "short" and uses PI_CACHE_RETENTION for backward compatibility.
 */
function resolveCacheRetention(cacheRetention, env) {
    if (cacheRetention) {
        return cacheRetention;
    }
    if (getProviderEnvValue("PI_CACHE_RETENTION", env) === "long") {
        return "long";
    }
    return "short";
}
/**
 * Check if the model is an Anthropic Claude model on Bedrock.
 * Checks both model ID and model name to support application inference profiles
 * whose ARNs don't contain the model name.
 */
function isAnthropicClaudeModel(model) {
    const id = model.id.toLowerCase();
    const name = model.name?.toLowerCase() ?? "";
    return (id.includes("anthropic.claude") ||
        id.includes("anthropic/claude") ||
        name.includes("anthropic.claude") ||
        name.includes("anthropic/claude") ||
        name.includes("claude"));
}
/**
 * Check if the model supports prompt caching.
 * Supported: Claude 3.5 Haiku, Claude 3.7 Sonnet, Claude 4.x models, Claude 5 models
 *
 * For base models and system-defined inference profiles the model ID / ARN
 * contains the model name, so we can decide locally.
 *
 * For application inference profiles (whose ARNs don't contain the model name),
 * also checks model.name which is user-controlled via models.json or registerProvider.
 * As a last resort, set AWS_BEDROCK_FORCE_CACHE=1 to enable cache points.
 * Amazon Nova models have automatic caching and don't need explicit cache points.
 */
function supportsPromptCaching(model, env) {
    const candidates = getModelMatchCandidates(model.id, model.name);
    const hasClaudeRef = candidates.some((s) => s.includes("claude"));
    if (!hasClaudeRef) {
        // Application inference profiles don't contain the model name in the ARN.
        // Allow users to force cache points via environment variable.
        if (getProviderEnvValue("AWS_BEDROCK_FORCE_CACHE", env) === "1")
            return true;
        return false;
    }
    // Claude 5 models (fable-5, opus-5, sonnet-5)
    if (candidates.some((s) => s.includes("fable-5") || s.includes("opus-5") || s.includes("sonnet-5")))
        return true;
    // Claude 4.x models (opus-4, sonnet-4, haiku-4)
    if (candidates.some((s) => s.includes("-4-")))
        return true;
    // Claude 3.7 Sonnet
    if (candidates.some((s) => s.includes("claude-3-7-sonnet")))
        return true;
    // Claude 3.5 Haiku
    if (candidates.some((s) => s.includes("claude-3-5-haiku")))
        return true;
    return false;
}
/**
 * Check if the model supports thinking signatures in reasoningContent.
 * Only Anthropic Claude models support the signature field.
 * Other models (OpenAI, Qwen, Minimax, Moonshot, etc.) reject it with:
 * "This model doesn't support the reasoningContent.reasoningText.signature field"
 *
 * Checks both model ID and model name to support application inference profiles.
 */
function supportsThinkingSignature(model) {
    return isAnthropicClaudeModel(model);
}
function buildSystemPrompt(systemPrompt, model, cacheRetention, env) {
    if (!systemPrompt)
        return undefined;
    const blocks = [{ text: sanitizeSurrogates(systemPrompt) }];
    // Add cache point for supported Claude models when caching is enabled
    if (cacheRetention !== "none" && supportsPromptCaching(model, env)) {
        blocks.push({
            cachePoint: { type: CachePointType.DEFAULT, ...(cacheRetention === "long" ? { ttl: CacheTTL.ONE_HOUR } : {}) },
        });
    }
    return blocks;
}
function normalizeToolCallId(id) {
    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    return sanitized.length > 64 ? sanitized.slice(0, 64) : sanitized;
}
function createNonBlankTextBlock(text) {
    const sanitized = sanitizeSurrogates(text);
    return sanitized.trim().length === 0 ? undefined : { text: sanitized };
}
function createRequiredTextBlock(text) {
    return createNonBlankTextBlock(text) ?? { text: EMPTY_TEXT_PLACEHOLDER };
}
function sanitizeBedrockDocument(value) {
    if (Array.isArray(value)) {
        return value.map(sanitizeBedrockDocument);
    }
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value)
            .filter(([key]) => key.length > 0)
            .map(([key, nestedValue]) => [key, sanitizeBedrockDocument(nestedValue)]));
    }
    return value;
}
function convertToolResultContent(content) {
    const result = [];
    for (const c of content) {
        if (c.type === "image") {
            result.push({ image: createImageBlock(c.mimeType, c.data) });
        }
        else {
            const textBlock = createNonBlankTextBlock(c.text);
            if (textBlock)
                result.push(textBlock);
        }
    }
    if (result.length === 0)
        result.push({ text: EMPTY_TEXT_PLACEHOLDER });
    return result;
}
function convertMessages(context, model, cacheRetention, env) {
    const result = [];
    const transformedMessages = transformMessages(context.messages, model, normalizeToolCallId);
    for (let i = 0; i < transformedMessages.length; i++) {
        const m = transformedMessages[i];
        switch (m.role) {
            case "user": {
                const content = [];
                if (typeof m.content === "string") {
                    content.push(createRequiredTextBlock(m.content));
                }
                else {
                    for (const c of m.content) {
                        switch (c.type) {
                            case "text": {
                                const textBlock = createNonBlankTextBlock(c.text);
                                if (textBlock)
                                    content.push(textBlock);
                                break;
                            }
                            case "image":
                                content.push({ image: createImageBlock(c.mimeType, c.data) });
                                break;
                            default:
                                continue;
                        }
                    }
                    if (content.length === 0)
                        content.push({ text: EMPTY_TEXT_PLACEHOLDER });
                }
                result.push({
                    role: ConversationRole.USER,
                    content,
                });
                break;
            }
            case "assistant": {
                // Skip assistant messages with empty content (e.g., from aborted requests)
                // Bedrock rejects messages with empty content arrays
                if (m.content.length === 0) {
                    continue;
                }
                const contentBlocks = [];
                for (const c of m.content) {
                    switch (c.type) {
                        case "text": {
                            // Skip empty text blocks
                            const textBlock = createNonBlankTextBlock(c.text);
                            if (!textBlock)
                                continue;
                            contentBlocks.push(textBlock);
                            break;
                        }
                        case "toolCall":
                            contentBlocks.push({
                                toolUse: { toolUseId: c.id, name: c.name, input: sanitizeBedrockDocument(c.arguments) },
                            });
                            break;
                        case "thinking": {
                            // Encrypted reasoning is opaque: replay the stored payload as the
                            // `redactedContent` member instead of lowering it to reasoning text.
                            if (c.redacted) {
                                const redactedContent = decodeRedactedContent(c.thinkingSignature);
                                if (redactedContent?.length) {
                                    contentBlocks.push({ reasoningContent: { redactedContent } });
                                }
                                continue;
                            }
                            // Skip empty thinking blocks
                            const thinking = sanitizeSurrogates(c.thinking);
                            if (thinking.trim().length === 0)
                                continue;
                            // Only Anthropic models support the signature field in reasoningText.
                            // For other models, we omit the signature to avoid errors like:
                            // "This model doesn't support the reasoningContent.reasoningText.signature field"
                            if (supportsThinkingSignature(model)) {
                                // Signatures arrive after thinking deltas. If a partial or externally
                                // persisted message lacks a signature, Bedrock rejects the replayed
                                // reasoning block. Fall back to plain text, matching Anthropic.
                                if (!c.thinkingSignature || c.thinkingSignature.trim().length === 0) {
                                    contentBlocks.push({ text: thinking });
                                }
                                else {
                                    contentBlocks.push({
                                        reasoningContent: {
                                            reasoningText: {
                                                text: thinking,
                                                signature: c.thinkingSignature,
                                            },
                                        },
                                    });
                                }
                            }
                            else {
                                contentBlocks.push({
                                    reasoningContent: {
                                        reasoningText: { text: thinking },
                                    },
                                });
                            }
                            break;
                        }
                        default:
                            continue;
                    }
                }
                // Skip if all content blocks were filtered out
                if (contentBlocks.length === 0) {
                    continue;
                }
                result.push({
                    role: ConversationRole.ASSISTANT,
                    content: contentBlocks,
                });
                break;
            }
            case "toolResult": {
                // Collect all consecutive toolResult messages into a single user message
                // Bedrock requires all tool results to be in one message
                const toolResults = [];
                // Add current tool result with all content blocks combined
                toolResults.push({
                    toolResult: {
                        toolUseId: m.toolCallId,
                        content: convertToolResultContent(m.content),
                        status: m.isError ? ToolResultStatus.ERROR : ToolResultStatus.SUCCESS,
                    },
                });
                // Look ahead for consecutive toolResult messages
                let j = i + 1;
                while (j < transformedMessages.length && transformedMessages[j].role === "toolResult") {
                    const nextMsg = transformedMessages[j];
                    toolResults.push({
                        toolResult: {
                            toolUseId: nextMsg.toolCallId,
                            content: convertToolResultContent(nextMsg.content),
                            status: nextMsg.isError ? ToolResultStatus.ERROR : ToolResultStatus.SUCCESS,
                        },
                    });
                    j++;
                }
                // Skip the messages we've already processed
                i = j - 1;
                result.push({
                    role: ConversationRole.USER,
                    content: toolResults,
                });
                break;
            }
            default:
                continue;
        }
    }
    // Add cache point to the last user message for supported Claude models when caching is enabled
    if (cacheRetention !== "none" && supportsPromptCaching(model, env) && result.length > 0) {
        const lastMessage = result[result.length - 1];
        if (lastMessage.role === ConversationRole.USER && lastMessage.content) {
            lastMessage.content.push({
                cachePoint: {
                    type: CachePointType.DEFAULT,
                    ...(cacheRetention === "long" ? { ttl: CacheTTL.ONE_HOUR } : {}),
                },
            });
        }
    }
    return result;
}
function convertToolConfig(tools, toolChoice, supportsStrictMode) {
    if (!tools?.length)
        return undefined;
    if (toolChoice === "none")
        return undefined;
    const bedrockTools = tools.map((tool) => {
        const strict = resolveJsonSchemaStrictSampling(tool, supportsStrictMode);
        return {
            toolSpec: {
                name: tool.name,
                description: tool.description,
                inputSchema: { json: getJsonSchemaToolParameters(tool, strict) },
                ...(strict === true ? { strict: true } : {}),
            },
        };
    });
    let bedrockToolChoice;
    switch (toolChoice) {
        case "auto":
            bedrockToolChoice = { auto: {} };
            break;
        case "any":
            bedrockToolChoice = { any: {} };
            break;
        default:
            if (toolChoice?.type === "tool") {
                bedrockToolChoice = { tool: { name: toolChoice.name } };
            }
    }
    return { tools: bedrockTools, toolChoice: bedrockToolChoice };
}
function mapStopReason(reason) {
    switch (reason) {
        case BedrockStopReason.END_TURN:
        case BedrockStopReason.STOP_SEQUENCE:
            return { stopReason: "stop" };
        case BedrockStopReason.MAX_TOKENS:
        case BedrockStopReason.MODEL_CONTEXT_WINDOW_EXCEEDED:
            return { stopReason: "length" };
        case BedrockStopReason.TOOL_USE:
            return { stopReason: "toolUse" };
        default:
            return reason
                ? { stopReason: "error", errorMessage: `Provider stopped with: ${reason}` }
                : { stopReason: "error" };
    }
}
function getConfiguredBedrockRegion(options) {
    return (options.region ||
        getProviderEnvValue("AWS_REGION", options.env) ||
        getProviderEnvValue("AWS_DEFAULT_REGION", options.env) ||
        undefined);
}
function getConfiguredBedrockCredentials(env) {
    const accessKeyId = getProviderEnvValue("AWS_ACCESS_KEY_ID", env);
    const secretAccessKey = getProviderEnvValue("AWS_SECRET_ACCESS_KEY", env);
    if (!accessKeyId || !secretAccessKey) {
        return undefined;
    }
    const sessionToken = getProviderEnvValue("AWS_SESSION_TOKEN", env);
    return {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
    };
}
function getStandardBedrockEndpointRegion(baseUrl) {
    if (!baseUrl) {
        return undefined;
    }
    try {
        const { hostname } = new URL(baseUrl);
        const match = hostname.toLowerCase().match(/^bedrock-runtime(?:-fips)?\.([a-z0-9-]+)\.amazonaws\.com(?:\.cn)?$/);
        return match?.[1];
    }
    catch {
        return undefined;
    }
}
function shouldUseExplicitBedrockEndpoint(baseUrl, configuredRegion, hasAmbientConfiguredProfile) {
    const endpointRegion = getStandardBedrockEndpointRegion(baseUrl);
    if (!endpointRegion) {
        return true;
    }
    return !configuredRegion && !hasAmbientConfiguredProfile;
}
function isGovCloudBedrockTarget(model, options) {
    const region = getConfiguredBedrockRegion(options);
    if (region?.toLowerCase().startsWith("us-gov-")) {
        return true;
    }
    const modelId = model.id.toLowerCase();
    return modelId.startsWith("us-gov.") || modelId.startsWith("arn:aws-us-gov:");
}
function buildAdditionalModelRequestFields(model, options) {
    if (!options.reasoning || !model.reasoning) {
        return undefined;
    }
    if (isAnthropicClaudeModel(model)) {
        // GovCloud Bedrock currently rejects the Claude thinking.display field.
        // Omit it there until the GovCloud Converse schema catches up.
        const display = isGovCloudBedrockTarget(model, options) ? undefined : (options.thinkingDisplay ?? "summarized");
        const result = supportsAdaptiveThinking(model.id, model.name)
            ? {
                thinking: { type: "adaptive", ...(display !== undefined ? { display } : {}) },
                output_config: { effort: mapThinkingLevelToEffort(model, options.reasoning) },
            }
            : (() => {
                const defaultBudgets = {
                    minimal: 1024,
                    low: 2048,
                    medium: 8192,
                    high: 16384,
                    xhigh: 16384, // Budget-based Claude clamps extended levels to high
                    max: 16384,
                };
                // Custom budgets only cover token-based levels through high.
                const level = options.reasoning === "xhigh" || options.reasoning === "max" ? "high" : options.reasoning;
                const budget = options.thinkingBudgets?.[level] ?? defaultBudgets[options.reasoning];
                return {
                    thinking: {
                        type: "enabled",
                        budget_tokens: budget,
                        ...(display !== undefined ? { display } : {}),
                    },
                };
            })();
        if (!supportsAdaptiveThinking(model.id, model.name) && (options.interleavedThinking ?? true)) {
            result.anthropic_beta = ["interleaved-thinking-2025-05-14"];
        }
        return result;
    }
    return undefined;
}
function createImageBlock(mimeType, data) {
    let format;
    switch (mimeType) {
        case "image/jpeg":
        case "image/jpg":
            format = ImageFormat.JPEG;
            break;
        case "image/png":
            format = ImageFormat.PNG;
            break;
        case "image/gif":
            format = ImageFormat.GIF;
            break;
        case "image/webp":
            format = ImageFormat.WEBP;
            break;
        default:
            throw new Error(`Unknown image type: ${mimeType}`);
    }
    return { source: { bytes: base64ToBytes(data) }, format };
}
function base64ToBytes(data) {
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
/**
 * Decodes a stored redacted payload. The AWS SDK hands the blob over as bytes, but a
 * persisted session carries it as base64. A hand-edited or externally produced session
 * can hold a signature that is not base64; drop that block instead of failing the
 * whole request.
 */
function decodeRedactedContent(signature) {
    if (!signature)
        return undefined;
    try {
        return base64ToBytes(signature);
    }
    catch {
        return undefined;
    }
}
function bytesToBase64(chunks) {
    // Encrypted reasoning runs to tens of KB, so build the binary string in slices
    // rather than one concatenation per byte. The window stays under the engine's
    // argument-count limit for spread calls.
    const WINDOW = 0x8000;
    let binary = "";
    for (const chunk of chunks) {
        for (let i = 0; i < chunk.length; i += WINDOW) {
            binary += String.fromCharCode(...chunk.subarray(i, i + WINDOW));
        }
    }
    return btoa(binary);
}
//# sourceMappingURL=bedrock-converse-stream.js.map
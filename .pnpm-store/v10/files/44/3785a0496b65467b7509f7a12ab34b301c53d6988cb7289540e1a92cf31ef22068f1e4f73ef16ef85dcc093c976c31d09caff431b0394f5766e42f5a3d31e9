import z from "@deepseek-ai/schemastery";
import { CONTEXT_WINDOW_EXCEEDED_CODE, EMPTY_RESPONSE_CODE, LlmAdapter, LlmError, ProviderRequestId, QUOTA_EXCEEDED_CODE, ReasoningEffortId, RetryPolicySchema, assertUsableApiKey, attributionHeaders, contentHasImage, isContextWindowExceededError, isQuotaExceededError, offloadRequestImagesWithPolicy, offloadedImagePrefixCount, offloadedImageText, requestImageHandleText, resolveImageAttachmentAccess, resolveRetryPolicy, textOnlyImageText } from "@deepseek-ai/dsh-llm";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { MAX_TIMER_DELAY_MS, deadline, idleWatchdog, timeoutOf } from "@deepseek-ai/dsh-timeout";
import { deepEqualJson } from "@deepseek-ai/dsh-util-values";
import { getOrCreateAnonymousUserId } from "@deepseek-ai/dsh-anonymous-user-id";
import { ImageVariantId, requestImageDimensions } from "@deepseek-ai/dsh-attachment";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { withFileLock, writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { brandString } from "@deepseek-ai/dsh-brand";
//#region lib/types/serialize.js
/**
* Serialize harness messages into DeepSeek chat completions. Text-only
* requests retain string user content; the image path resolves durable
* attachments into ordered file-id or inline parts. Tool-result images follow their
* string-only tool messages in a separate user message.
* @module dsh-llm-deepseek/serialize
*/
const TOOL_RESULT_IMAGE_TEXT = "Attached image(s) from tool result:";
/** Validate the adapter-owned effort before resolving its DeepSeek wire fields. */
function reasoningEffort(effort) {
	if (effort === "off" || effort === "low" || effort === "high" || effort === "max") return effort;
	throw new LlmError(`DeepSeek does not support reasoning effort "${effort}"`, "UNSUPPORTED_REASONING_EFFORT");
}
/** Resolve one legal thinking/effort pair without exposing `off` as a wire effort. */
function resolveThinking(options, defaults) {
	if (options.purpose === "session-title") return { thinking: "disabled" };
	const effort = options.reasoningEffort === void 0 ? defaults.reasoningEffort : reasoningEffort(options.reasoningEffort);
	if (defaults.thinking === "disabled" && effort !== void 0 && effort !== "off") throw new LlmError(`DeepSeek deployment does not support reasoning effort "${effort}"`, "UNSUPPORTED_REASONING_EFFORT");
	if (effort === "off") return { thinking: "disabled" };
	if (effort === "low" || effort === "high" || effort === "max") return {
		thinking: "enabled",
		reasoningEffort: effort
	};
	return defaults.thinking === void 0 ? {} : { thinking: defaults.thinking };
}
/** Join the text blocks of a message (used for user/tool-result content). */
function flattenText(blocks) {
	return blocks.filter((block) => block.type === "text").map((block) => block.text).join("");
}
/** Reject core image content before any text-flattening path can silently erase it. */
function assertTextOnly(blocks) {
	if (contentHasImage(blocks)) throw new LlmError("The DeepSeek chat-completions adapter does not support image content.", "UNSUPPORTED_CONTENT");
}
/** Reject roles whose DeepSeek history format cannot carry image input. */
function assertSupportedImageRoles(messages) {
	for (const message of messages) if (message.role !== "user" && contentHasImage(message.content)) throw new LlmError(`The DeepSeek chat-completions adapter cannot represent image content in a ${message.role} message.`, "UNSUPPORTED_CONTENT");
}
/** Describe the exact request preview and its model-callable coordinate system. */
function imageHandle(ref, version, resolveAccess, precededByContent) {
	return {
		type: "text",
		text: `${precededByContent ? "\n" : ""}${requestImageHandleText(ref, version, resolveAccess?.(ref))}`
	};
}
/** Resolve one durable image into its descriptor and transient DeepSeek image part. */
async function imageParts(block, images, location, precededByContent) {
	const version = images.requestImages.get(block.attachment.attachmentId);
	if (version === void 0) throw new LlmError(`DeepSeek request image ${block.attachment.attachmentId} was not prepared.`, "INVALID_REQUEST");
	const image = images.representation.kind === "file" ? {
		type: "file",
		file_id: await images.representation.resolveFileId(version, block, location)
	} : {
		type: "image_url",
		image_url: { url: `data:${version.mediaType};base64,${Buffer.from(version.data).toString("base64")}` }
	};
	return [imageHandle(block.attachment, version, images.resolveImageAccess, precededByContent), image];
}
/** Convert user or nested tool-result blocks into ordered wire parts. */
async function contentParts(blocks, images, message, nextImage) {
	const parts = [];
	for (const block of blocks) switch (block.type) {
		case "text":
			if (block.text.length > 0) parts.push({
				type: "text",
				text: block.text
			});
			break;
		case "image":
			nextImage.value += 1;
			parts.push(...await imageParts(block, images, {
				message,
				image: nextImage.value
			}, parts.length > 0));
			break;
		case "tool-result":
			parts.push(...await contentParts(block.content, images, message, nextImage));
			break;
		default: break;
	}
	return parts;
}
/** Keep text-only user messages on the compact string wire form. */
function userContent(parts) {
	const text = [];
	for (const part of parts) {
		if (part.type !== "text") return [...parts];
		text.push(part.text);
	}
	return text.join("");
}
/** Serialize one assistant message (text + reasoning + tool calls). */
function serializeAssistant(message) {
	const text = flattenText(message.content);
	const reasoning = message.content.filter((block) => block.type === "reasoning").map((block) => block.text).join("");
	const toolCalls = message.content.filter((block) => block.type === "tool-call").map((block) => ({
		id: block.id,
		type: "function",
		function: {
			name: block.name,
			arguments: block.arguments
		}
	}));
	return {
		role: "assistant",
		content: text,
		...reasoning.length > 0 ? { reasoning_content: reasoning } : {},
		...toolCalls.length > 0 ? { tool_calls: toolCalls } : {}
	};
}
/**
* Serialize the conversation. `tool-result` blocks become standalone
* `{role: 'tool'}` messages; the harness puts each tool result in its own
* user-role message, so a mixed user message contributes its text first and
* its tool results as separate wire messages after.
* @param messages - the harness conversation, in order.
* @returns the wire messages; order preserved, each tool result expanded into its own entry.
*/
function serializeMessages(messages) {
	const wire = [];
	for (const message of messages) {
		assertTextOnly(message.content);
		if (message.role === "system") {
			wire.push({
				role: "system",
				content: flattenText(message.content)
			});
			continue;
		}
		if (message.role === "assistant") {
			wire.push(serializeAssistant(message));
			continue;
		}
		const toolResults = message.content.filter((block) => block.type === "tool-result");
		const text = flattenText(message.content);
		if (text.length > 0 || toolResults.length === 0) wire.push({
			role: "user",
			content: text
		});
		for (const result of toolResults) wire.push({
			role: "tool",
			tool_call_id: result.toolCallId,
			content: flattenText(result.content) || "(no output)"
		});
	}
	return wire;
}
/**
* Serialize image-capable history after resolving durable attachments.
* Consecutive tool results keep string `tool` messages and share one following
* user message containing their images.
* @param messages - transient request history after request-size offloading.
* @param images - prepared request versions, one provider representation, and its budget.
* @returns ordered DeepSeek wire messages.
*/
async function serializeMessagesWithImages(messages, images) {
	assertSupportedImageRoles(messages);
	const wire = [];
	let pendingToolImages = [];
	const flushToolImages = () => {
		if (pendingToolImages.length === 0) return;
		wire.push({
			role: "user",
			content: [{
				type: "text",
				text: TOOL_RESULT_IMAGE_TEXT
			}, ...pendingToolImages]
		});
		pendingToolImages = [];
	};
	for (const [messageIndex, message] of messages.entries()) {
		const nextImage = { value: 0 };
		if (message.role === "system") {
			flushToolImages();
			wire.push({
				role: "system",
				content: flattenText(message.content)
			});
			continue;
		}
		if (message.role === "assistant") {
			flushToolImages();
			wire.push(serializeAssistant(message));
			continue;
		}
		const regular = message.content.filter((block) => block.type !== "tool-result");
		const toolResults = message.content.filter((block) => block.type === "tool-result");
		const content = userContent(await contentParts(regular, images, messageIndex + 1, nextImage));
		if (content.length > 0 || toolResults.length === 0) {
			flushToolImages();
			wire.push({
				role: "user",
				content
			});
		}
		for (const result of toolResults) {
			const parts = await contentParts(result.content, images, messageIndex + 1, nextImage);
			const imageParts = parts.filter((part) => part.type !== "text");
			const text = parts.filter((part) => part.type === "text").map((part) => part.text).join("");
			wire.push({
				role: "tool",
				tool_call_id: result.toolCallId,
				content: text || "(no output)"
			});
			pendingToolImages.push(...imageParts);
		}
	}
	flushToolImages();
	return wire;
}
/** Assemble request fields shared by text-only and image-capable conversion. */
function requestWithMessages(options, messages, defaults) {
	const tools = options.tools?.map((tool) => ({
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters
		}
	}));
	const resolvedThinking = resolveThinking(options, defaults);
	return {
		model: options.model,
		messages,
		stream: true,
		stream_options: { include_usage: true },
		...resolvedThinking.thinking !== void 0 ? { thinking: { type: resolvedThinking.thinking } } : {},
		...resolvedThinking.reasoningEffort !== void 0 ? { reasoning_effort: resolvedThinking.reasoningEffort } : {},
		...tools !== void 0 && tools.length > 0 ? { tools } : {},
		...options.temperature !== void 0 ? { temperature: options.temperature } : {},
		...options.maxTokens === void 0 ? {} : { max_tokens: options.maxTokens },
		...options.stop !== void 0 ? { stop: options.stop } : {}
	};
}
/**
* Build the full wire request. Always streaming (`stream: true`, usage
* reporting on); optional fields are omitted rather than sent as null, so
* provider defaults apply.
* @param options - the harness request (model, history, system, tools, sampling).
* @param defaults - adapter-level thinking defaults; undefined fields put nothing on the wire.
* @returns the chat-completions request body.
*/
function serializeRequest(options, defaults = {}) {
	const messages = [];
	if (options.system !== void 0) messages.push({
		role: "system",
		content: options.system
	});
	messages.push(...serializeMessages(options.messages));
	return requestWithMessages(options, messages, defaults);
}
/**
* Build one image-capable request while keeping durable bytes out of session
* messages. Oversized oldest images become per-image text after their
* exact request-version byte lengths are known and before provider serialization.
* @param options - harness request containing image-capable user content.
* @param images - request versions, optional current access resolver, and request bounds.
* @param defaults - adapter-level thinking defaults.
* @returns the fully materialized DeepSeek request body.
*/
async function serializeRequestWithImages(options, images, defaults = {}) {
	assertSupportedImageRoles(options.messages);
	const requestMessages = offloadRequestImagesWithPolicy(options.messages, {
		representation: images.representation.kind === "file" ? "raw" : "base64",
		byteLength: (ref) => {
			const version = images.requestImages.get(ref.attachmentId);
			if (version === void 0) throw new LlmError(`DeepSeek request image ${ref.attachmentId} was not prepared.`, "INVALID_REQUEST");
			return version.bytes;
		},
		maxBytes: images.maxRequestImageBytes,
		...images.maxImagesPerRequest === void 0 ? {} : { maxImages: images.maxImagesPerRequest },
		...images.byteQuantum === void 0 ? {} : { byteQuantum: images.byteQuantum },
		...images.countQuantum === void 0 ? {} : { countQuantum: images.countQuantum },
		placeholder: (ref) => offloadedImageText(ref, images.resolveImageAccess?.(ref))
	});
	const messages = [];
	if (options.system !== void 0) messages.push({
		role: "system",
		content: options.system
	});
	messages.push(...await serializeMessagesWithImages(requestMessages, images));
	return requestWithMessages(options, messages, defaults);
}
//#endregion
//#region lib/types/image-tokens.js
/**
* DeepSeek v4 vision-token accounting: the provider's published image-token
* calculator (api-docs.deepseek.com, Token & Token Usage) ported verbatim.
* The provider resizes every request image onto a 14px-patch grid, downsamples
* 3:1 per axis, and caps one image at 384 tokens; the port prices the
* pad-to-4 alignment at its 3-token upper bound because request pricing has
* no preceding-token position. Actual usage remains authoritative.
*
* @module dsh-llm-deepseek/image-tokens
*/
/** Vision patch edge in pixels. */
const PATCH_SIZE = 14;
/** Per-axis patch-to-token downsampling ratio. */
const DOWNSAMPLE_RATIO = 3;
/** Provider cap on tokens for one request image. */
const MAX_IMAGE_TOKENS = 384;
/** Token-alignment quantum; pricing charges its worst-case `QUANTUM - 1` pad. */
const COMPRESS_PAD_TO = 4;
/** Width is clamped to this multiple of height before grid projection. */
const MAX_WIDTH_HEIGHT_RATIO = 8;
/** Total-pixel floor; smaller images are scaled up before grid projection. */
const MIN_PIXELS = 384 * 384;
const intDiv = (value, divisor) => Math.floor(value / divisor);
const ceilDiv = (value, divisor) => Math.floor((value + divisor - 1) / divisor);
/** Token count of one grid, including row separators and framing. */
function gridTokens(gridHeight, gridWidth) {
	let tokens = gridHeight * (gridWidth + 1) + 2;
	if (gridHeight % 2 === 1) tokens += gridWidth + 1;
	tokens += ceilDiv(gridHeight, 2) * (gridWidth + 1) % 2 * 2;
	return tokens;
}
/** Solve the largest grid within `budget` tokens preserving the aspect ratio. */
function solveResizeRatio(height, width, budget) {
	const aspect = height / width;
	const idealGridWidth = Math.sqrt((budget - 2) / aspect + .25) - .5;
	const idealGridHeight = idealGridWidth * aspect;
	let bestHeight;
	let bestWidth;
	if (idealGridWidth < 1) {
		const solvedGridWidth = 1;
		let solvedGridHeight = intDiv(budget - 2, 2);
		// v8 ignore: at the provider budget the one-column solve always lands on
		/* v8 ignore next */
		if (solvedGridHeight % 2 === 1) solvedGridHeight -= 1;
		bestWidth = solvedGridWidth * PATCH_SIZE * DOWNSAMPLE_RATIO;
		bestHeight = solvedGridHeight * PATCH_SIZE * DOWNSAMPLE_RATIO;
	} else if (idealGridHeight < 2) {
		const solvedGridHeight = 2;
		const solvedGridWidth = intDiv(budget - 2, solvedGridHeight) - 1;
		if (!(solvedGridWidth > 1)) throw new Error("deepseek image tokens: no grid fits the token budget");
		bestWidth = solvedGridWidth * PATCH_SIZE * DOWNSAMPLE_RATIO;
		bestHeight = solvedGridHeight * PATCH_SIZE * DOWNSAMPLE_RATIO;
	} else {
		const solvedGridWidth = Math.trunc(idealGridWidth);
		let solvedGridHeight = Math.trunc(idealGridHeight);
		if (solvedGridHeight % 2 === 1) solvedGridHeight -= 1;
		const widthScale = solvedGridWidth * PATCH_SIZE * DOWNSAMPLE_RATIO / width;
		const heightScale = solvedGridHeight * PATCH_SIZE * DOWNSAMPLE_RATIO / height;
		const scale = Math.min(widthScale, heightScale);
		bestWidth = Math.trunc(width * scale / PATCH_SIZE) * PATCH_SIZE;
		bestHeight = Math.trunc(height * scale / PATCH_SIZE) * PATCH_SIZE;
	}
	const gridHeight = ceilDiv(intDiv(bestHeight, PATCH_SIZE), DOWNSAMPLE_RATIO);
	const gridWidth = ceilDiv(intDiv(bestWidth, PATCH_SIZE), DOWNSAMPLE_RATIO);
	return {
		gridHeight,
		gridWidth,
		bestHeight,
		bestWidth,
		numTokens: gridTokens(gridHeight, gridWidth)
	};
}
/** Project padded pixel dimensions onto the largest in-budget token grid. */
function safeResize(height, width, paddedHeight, paddedWidth) {
	const gridHeight = ceilDiv(intDiv(paddedHeight, PATCH_SIZE), DOWNSAMPLE_RATIO);
	const gridWidth = ceilDiv(intDiv(paddedWidth, PATCH_SIZE), DOWNSAMPLE_RATIO);
	const pad = COMPRESS_PAD_TO - 1;
	const budget = MAX_IMAGE_TOKENS - pad;
	let result = {
		gridHeight,
		gridWidth,
		bestHeight: paddedHeight,
		bestWidth: paddedWidth,
		numTokens: gridTokens(gridHeight, gridWidth)
	};
	if (result.numTokens > budget) {
		result = solveResizeRatio(height, width, budget);
		/* v8 ignore next 4 -- the published solver's safety net; the closed-form
		solve stays within budget for every geometry the clamps admit. */
		for (let reduced = budget; result.numTokens > budget; reduced -= 1) result = solveResizeRatio(height, width, reduced);
	}
	return {
		...result,
		numTokens: result.numTokens + pad
	};
}
/** One clamp-scale-pad-project pass; the caller iterates it to a fixpoint. */
function resizeOnce(width, height) {
	let clampedWidth = width;
	let clampedHeight = height;
	if (clampedWidth > clampedHeight * MAX_WIDTH_HEIGHT_RATIO) clampedWidth = clampedHeight * MAX_WIDTH_HEIGHT_RATIO;
	const pixels = clampedWidth * clampedHeight;
	if (pixels < MIN_PIXELS && pixels > 0) {
		const scale = Math.sqrt(MIN_PIXELS / pixels);
		clampedWidth = Math.trunc(clampedWidth * scale);
		clampedHeight = Math.trunc(clampedHeight * scale);
	}
	const paddedWidth = ceilDiv(clampedWidth, PATCH_SIZE) * PATCH_SIZE;
	const paddedHeight = ceilDiv(clampedHeight, PATCH_SIZE) * PATCH_SIZE;
	return safeResize(clampedHeight, clampedWidth, paddedHeight, paddedWidth);
}
function sameResize(a, b) {
	return a.gridHeight === b.gridHeight && a.gridWidth === b.gridWidth && a.bestHeight === b.bestHeight && a.bestWidth === b.bestWidth && a.numTokens === b.numTokens;
}
/**
* Vision tokens DeepSeek v4 charges for one request image of the given
* dimensions, at the worst-case alignment pad.
* @param width - positive integer request-image width in pixels.
* @param height - positive integer request-image height in pixels.
* @returns the provider vision-token price, at most 384.
*/
function deepSeekImageTokens(width, height) {
	let result = resizeOnce(width, height);
	for (let iteration = 1; iteration < 10; iteration += 1) {
		const next = resizeOnce(result.bestWidth, result.bestHeight);
		if (sameResize(next, result)) return result.numTokens;
		result = next;
	}
	/* v8 ignore next 2 -- the published solver's non-convergence guard; every
	pass is a projection, so a second identical pass is a fixpoint. */
	throw new Error(`deepseek image tokens: resize did not converge for ${width}x${height}`);
}
//#endregion
//#region lib/types/request-pricing.js
/**
* Provider-side request-image pricing for DeepSeek routes: reproduces the
* adapter's deterministic request projection (per-model pixel budget,
* oldest-first offload under the raw-byte and count budgets) and prices every
* retained image with the published v4 vision-token accounting. Consumed
* synchronously by the token meter through `LlmAdapter.imageRequestPricing`;
* provider usage remains the authoritative anchor for completed requests.
*
* @module dsh-llm-deepseek/request-pricing
*/
/** Default bound on accumulated file-referenced image bytes per request. */
const DEFAULT_MAX_REQUEST_FILES_BYTES = 128 * 1024 * 1024;
/** Provider request image-count limit. */
const DEFAULT_MAX_IMAGES_PER_REQUEST = 600;
/** Total-pixel budget matching DeepSeek's normal vision projection. */
const DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET = 64e4;
/** Total-pixel budget matching provider low-detail image input. */
const DEFAULT_LOW_DETAIL_IMAGE_PIXEL_BUDGET = 512 * 512;
/** Encoded-byte target for one deterministic model-request image; the smallest quality-ladder output is used when no quality fits. */
const DEFAULT_REQUEST_IMAGE_MAX_BYTES = 1024 * 1024;
/**
* Resolve the request-image budgets owned by one DeepSeek model route.
* @param model - Advertised model route and its optional image overrides.
* @returns Complete pixel and encoded-byte budgets.
* @internal
*/
function resolveRequestImagePolicy(model) {
	return {
		maxPixels: model.imagePixelBudget === "low" ? DEFAULT_LOW_DETAIL_IMAGE_PIXEL_BUDGET : model.imagePixelBudget ?? 64e4,
		maxBytes: model.imageMaxBytes === void 0 ? DEFAULT_REQUEST_IMAGE_MAX_BYTES : model.imageMaxBytes
	};
}
/**
* Price one occurrence a text-only route substitutes with deterministic text,
* reproducing the `projectImagesForTextModel` substitution `LlmRuntime`
* applies before dispatching to a route without the `image` modality.
*/
function textOnlyPrice(ref) {
	return {
		visualTokens: 0,
		text: textOnlyImageText(ref)
	};
}
/**
* Build the request-image pricing for one DeepSeek route from a validated
* connection snapshot. Uncatalogued and text-only models price every
* occurrence as its deterministic text substitution; image-capable models
* reproduce the adapter's first-stage oldest-first offload from durable byte
* lengths and price retained images by their projected request dimensions,
* with each occurrence's handle or placeholder text built through the same
* access resolution the serializer uses. The base64 fallback's tighter inline
* budget is not reproduced, so a fallback request can only cost less than
* this estimate; access paths resolve at pricing time, so a path that changes
* before the request only shifts the text price by its own length.
* @param connection - validated connection facts of the pricing resolution.
* @param model - exact model id named by the request header.
* @param resolveAccess - current execution-world access resolution shared with request serialization.
* @returns synchronous per-occurrence pricing for the route.
*/
function deepSeekImageRequestPricing(connection, model, resolveAccess) {
	const catalogModel = connection.models.find((entry) => entry.id === model);
	if (catalogModel?.inputModalities?.includes("image") !== true) return { priceImages: (images) => images.map(textOnlyPrice) };
	const policy = resolveRequestImagePolicy(catalogModel);
	return { priceImages: (images) => {
		const offloaded = offloadedImagePrefixCount(images.map((ref) => Math.min(ref.bytes, policy.maxBytes)), {
			maxBytes: connection.maxRequestFilesBytes,
			maxImages: connection.maxImagesPerRequest,
			byteQuantum: connection.imageOffloadByteQuantum,
			countQuantum: connection.imageOffloadCountQuantum
		});
		return images.map((ref, index) => {
			if (index < offloaded) return {
				visualTokens: 0,
				text: offloadedImageText(ref, resolveAccess?.(ref))
			};
			const dimensions = requestImageDimensions(ref.width, ref.height, policy.maxPixels);
			return {
				visualTokens: deepSeekImageTokens(dimensions.width, dimensions.height),
				text: requestImageHandleText(ref, dimensions, resolveAccess?.(ref))
			};
		});
	} };
}
//#endregion
//#region lib/types/file-id.js
/** DeepSeek Files API identifiers. @module dsh-llm-deepseek/file-id */
/**
* Brand a provider-returned file identifier after wire validation.
* @param id - non-empty Files API identifier.
* @returns the same string with its provider identity attached at type level.
*/
function DeepSeekFileId(id) {
	return id;
}
/**
* Brand a locally derived namespace digest.
* @param scope - SHA-256 digest of endpoint and API key.
* @returns the same string with namespace identity attached at type level.
*/
function DeepSeekFileScope(scope) {
	return scope;
}
//#endregion
//#region lib/types/files-api.js
/** OpenAI-compatible DeepSeek Files API transport. @module dsh-llm-deepseek/files-api */
/** Minimum provider-supported file lifetime. */
const MIN_FILE_EXPIRY_SECONDS = 3600;
/** Maximum provider-supported file lifetime. */
const MAX_FILE_EXPIRY_SECONDS = 2592e3;
/** Maximum Files API upload size. */
const MAX_FILE_UPLOAD_BYTES = 128 * 1024 * 1024;
/** Current per-key file-count quota. */
const MAX_STORED_FILE_COUNT = 1e4;
/** Current per-key storage quota. */
const MAX_STORED_FILE_BYTES = 25 * 1024 * 1024 * 1024;
/** Files API operation failure with its HTTP status retained for recovery policy. */
var DeepSeekFilesError = class extends LlmError {
	/** Parsed provider detail used only for error classification. */
	detail;
	/**
	* @param message - user-readable provider failure.
	* @param status - HTTP status returned by the Files API.
	* @param detail - provider error fields joined for classification.
	*/
	constructor(message, status, detail) {
		super(message, status === 401 || status === 403 ? "AUTH" : status === 429 ? "RATE_LIMIT" : status >= 500 ? "SERVER" : "FILES_API", { status });
		this.name = "DeepSeekFilesError";
		this.detail = detail;
	}
};
/**
* Whether an upload failure reports a provider storage or file-count quota.
* @param error - Files API operation failure.
* @returns whether one bounded remote cleanup and upload retry may recover.
*/
function isFilesQuotaError(error) {
	return error instanceof DeepSeekFilesError && /(?:quota|storage|stored files|file count|too many files)/iu.test(error.detail);
}
function invalidResponse(operation) {
	return new LlmError(`DeepSeek Files API returned an invalid ${operation} response.`, "INVALID_RESPONSE");
}
function parseFileObject(value, operation) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw invalidResponse(operation);
	const wire = value;
	if (typeof wire.id !== "string" || wire.id.length === 0 || wire.object !== "file" || !Number.isSafeInteger(wire.bytes) || wire.bytes < 0 || !Number.isSafeInteger(wire.created_at) || wire.created_at < 0 || typeof wire.filename !== "string" || wire.filename.length === 0 || wire.purpose !== "user_data" || wire.expires_at !== void 0 && (!Number.isSafeInteger(wire.expires_at) || wire.expires_at < 0)) throw invalidResponse(operation);
	return {
		id: DeepSeekFileId(wire.id),
		bytes: wire.bytes,
		createdAt: wire.created_at,
		filename: wire.filename,
		purpose: "user_data",
		...wire.expires_at === void 0 ? {} : { expiresAt: wire.expires_at }
	};
}
function providerErrorDetail(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return { detail: "" };
	const error = value.error;
	if (error === null || typeof error !== "object" || Array.isArray(error)) return { detail: "" };
	const fields = error;
	const message = typeof fields.message === "string" ? fields.message : void 0;
	return {
		...message === void 0 ? {} : { message },
		detail: [
			fields.code,
			fields.type,
			fields.message
		].filter((field) => typeof field === "string").join(" ")
	};
}
/** Direct client for the OpenAI-compatible `/files` endpoints. */
var DeepSeekFilesClient = class {
	baseURL;
	apiKey;
	fetchImpl;
	/**
	* @param options - endpoint, API-key snapshot, and optional test transport.
	*/
	constructor(options) {
		this.baseURL = options.baseURL.replace(/\/+$/u, "");
		this.apiKey = options.apiKey;
		this.fetchImpl = options.fetch ?? globalThis.fetch;
	}
	async request(path, init, signal) {
		let response;
		try {
			const headers = new Headers(attributionHeaders());
			headers.set("authorization", `Bearer ${this.apiKey}`);
			response = await this.fetchImpl(`${this.baseURL}${path}`, {
				...init,
				headers,
				...signal === void 0 ? {} : { signal }
			});
		} catch (error) {
			if (signal?.aborted) throw error;
			throw new LlmError(`DeepSeek Files API request to ${this.baseURL} failed`, "TRANSPORT", { cause: error });
		}
		if (response.ok) return response;
		let parsed;
		try {
			parsed = await response.json();
		} catch {}
		const { message, detail } = providerErrorDetail(parsed);
		throw new DeepSeekFilesError(message ?? `DeepSeek Files API error (HTTP ${response.status})`, response.status, detail);
	}
	/**
	* Upload one image with an explicit expiry.
	* @param input - deterministic request-version bytes, media type, filename, lifetime, and cancellation.
	* @returns the validated provider file object, including `expires_at`.
	*/
	async upload(input) {
		if (input.data.byteLength > 134217728) throw new LlmError("DeepSeek Files API upload exceeds 128 MiB.", "INVALID_REQUEST");
		if (!Number.isSafeInteger(input.expiresAfterSeconds) || input.expiresAfterSeconds < 3600 || input.expiresAfterSeconds > 2592e3) throw new LlmError("DeepSeek file expiry must be between 3600 and 2592000 seconds.", "INVALID_REQUEST");
		const form = new FormData();
		form.set("purpose", "user_data");
		form.set("expires_after[anchor]", "created_at");
		form.set("expires_after[seconds]", String(input.expiresAfterSeconds));
		form.set("file", new Blob([Uint8Array.from(input.data).buffer], { type: input.mediaType }), input.filename);
		const file = parseFileObject(await (await this.request("/files", {
			method: "POST",
			body: form
		}, input.signal)).json(), "upload");
		if (file.expiresAt === void 0) throw invalidResponse("upload");
		return {
			...file,
			expiresAt: file.expiresAt
		};
	}
	/**
	* List one ascending or descending page of user-data files.
	* @param options - pagination, ordering, and cancellation.
	* @returns the validated page.
	*/
	async list(options = {}) {
		const query = new URLSearchParams({ purpose: "user_data" });
		if (options.after !== void 0) query.set("after", options.after);
		if (options.limit !== void 0) query.set("limit", String(options.limit));
		if (options.order !== void 0) query.set("order", options.order);
		const value = await (await this.request(`/files?${query.toString()}`, { method: "GET" }, options.signal)).json();
		if (value === null || typeof value !== "object" || Array.isArray(value)) throw invalidResponse("list");
		const wire = value;
		if (wire.object !== "list" || !Array.isArray(wire.data) || typeof wire.has_more !== "boolean" || wire.first_id !== void 0 && typeof wire.first_id !== "string" || wire.last_id !== void 0 && typeof wire.last_id !== "string") throw invalidResponse("list");
		return {
			data: wire.data.map((item) => parseFileObject(item, "list")),
			...typeof wire.first_id === "string" ? { firstId: DeepSeekFileId(wire.first_id) } : {},
			...typeof wire.last_id === "string" ? { lastId: DeepSeekFileId(wire.last_id) } : {},
			hasMore: wire.has_more
		};
	}
	/**
	* Retrieve one file object.
	* @param fileId - provider file identifier.
	* @param signal - request cancellation.
	* @returns the validated file object.
	*/
	async retrieve(fileId, signal) {
		return parseFileObject(await (await this.request(`/files/${encodeURIComponent(fileId)}`, { method: "GET" }, signal)).json(), "retrieve");
	}
	/**
	* Delete one provider file.
	* @param fileId - provider file identifier.
	* @param signal - request cancellation.
	*/
	async delete(fileId, signal) {
		const value = await (await this.request(`/files/${encodeURIComponent(fileId)}`, { method: "DELETE" }, signal)).json();
		if (value === null || typeof value !== "object" || Array.isArray(value)) throw invalidResponse("delete");
		const wire = value;
		if (wire.id !== fileId || wire.object !== "file" || wire.deleted !== true) throw invalidResponse("delete");
	}
};
//#endregion
//#region lib/types/upload-index.js
/** Durable DeepSeek attachment-to-file-id index. @module dsh-llm-deepseek/upload-index */
var InvalidUploadIndexError = class extends Error {};
/**
* Derive a non-secret stable index namespace without persisting or logging the API key.
* @param baseURL - normalized provider endpoint namespace.
* @param apiKey - resolved credential used only as hash input.
* @returns branded SHA-256 namespace digest.
*/
function deepSeekFileScope(baseURL, apiKey) {
	return DeepSeekFileScope(createHash("sha256").update(baseURL.replace(/\/+$/u, "")).update("\0").update(apiKey).digest("hex"));
}
function absent(error) {
	return error?.code === "ENOENT";
}
function parseRecord(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new InvalidUploadIndexError("llm-deepseek: upload index contains a non-object record");
	const record = value;
	if (typeof record.scope !== "string" || !/^[0-9a-f]{64}$/u.test(record.scope) || typeof record.attachmentId !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(record.attachmentId) || typeof record.variantId !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(record.variantId) || typeof record.fileId !== "string" || record.fileId.length === 0 || !Number.isSafeInteger(record.bytes) || record.bytes < 0 || !Number.isSafeInteger(record.createdAt) || record.createdAt < 0 || !Number.isSafeInteger(record.expiresAt) || record.expiresAt < 0) throw new InvalidUploadIndexError("llm-deepseek: upload index contains an invalid record");
	return {
		scope: DeepSeekFileScope(record.scope),
		attachmentId: record.attachmentId,
		variantId: ImageVariantId(record.variantId),
		fileId: DeepSeekFileId(record.fileId),
		bytes: record.bytes,
		createdAt: record.createdAt,
		expiresAt: record.expiresAt
	};
}
function parseIndex(text) {
	let value;
	try {
		value = JSON.parse(text);
	} catch (error) {
		throw new InvalidUploadIndexError("llm-deepseek: upload index is not valid JSON", { cause: error });
	}
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new InvalidUploadIndexError("llm-deepseek: upload index is not an object");
	const index = value;
	if (index.formatVersion !== 3 || !Array.isArray(index.records)) throw new InvalidUploadIndexError("llm-deepseek: unsupported upload index format");
	const records = index.records.map(parseRecord);
	const keys = /* @__PURE__ */ new Set();
	for (const record of records) {
		const key = `${record.scope}\0${record.variantId}`;
		if (keys.has(key)) throw new InvalidUploadIndexError("llm-deepseek: upload index contains duplicate mappings");
		keys.add(key);
	}
	return {
		formatVersion: 3,
		records
	};
}
function reusable(record, now, refreshMarginMs) {
	return record.expiresAt - now > refreshMarginMs;
}
/** Atomic local index shared by every DeepSeek session in this DSH home. */
var DeepSeekUploadIndex = class {
	/** Absolute owner-private JSON index path. */
	path;
	/**
	* @param path - explicit test path; omission uses `DSH_HOME/llm-deepseek/files-v3.json`.
	*/
	constructor(path = join(resolveDshHome(), "llm-deepseek", "files-v3.json")) {
		this.path = path;
	}
	async load() {
		try {
			return parseIndex(await readFile(this.path, "utf8"));
		} catch (error) {
			if (absent(error) || error instanceof InvalidUploadIndexError) return {
				formatVersion: 3,
				records: []
			};
			throw error;
		}
	}
	async save(index) {
		await writeFileAtomic(this.path, `${JSON.stringify(index, void 0, 2)}\n`, {
			mode: 384,
			dirMode: 448
		});
	}
	/**
	* Read one reusable mapping.
	* @param scope - endpoint/API-key namespace.
	* @param variantId - complete request-image transformation identity.
	* @param now - current Unix time in milliseconds.
	* @param refreshMarginMs - remaining lifetime below which a mapping is not reused.
	* @returns the mapping when it has enough lifetime remaining.
	*/
	async get(scope, variantId, now, refreshMarginMs) {
		const record = (await this.load()).records.find((candidate) => candidate.scope === scope && candidate.variantId === variantId);
		return record !== void 0 && reusable(record, now, refreshMarginMs) ? record : void 0;
	}
	/**
	* Publish a completed upload unless another process already published a reusable mapping.
	* @param candidate - completed remote upload.
	* @param now - current Unix time in milliseconds.
	* @param refreshMarginMs - minimum reusable remaining lifetime.
	* @returns the winning record and whether the candidate entered the index.
	*/
	async commit(candidate, now, refreshMarginMs) {
		await mkdir(dirname(this.path), {
			recursive: true,
			mode: 448
		});
		return withFileLock(this.path, async () => {
			const index = await this.load();
			const existing = index.records.find((record) => record.scope === candidate.scope && record.variantId === candidate.variantId && reusable(record, now, refreshMarginMs));
			if (existing !== void 0) return {
				record: existing,
				accepted: false
			};
			const records = index.records.filter((record) => reusable(record, now, refreshMarginMs) && !(record.scope === candidate.scope && record.variantId === candidate.variantId));
			records.push(candidate);
			await this.save({
				formatVersion: 3,
				records
			});
			return {
				record: candidate,
				accepted: true
			};
		});
	}
	/**
	* Remove one exact mapping without deleting a concurrently installed successor.
	* @param scope - endpoint/API-key namespace.
	* @param variantId - complete request-image transformation identity.
	* @param fileId - exact remote generation being invalidated.
	*/
	async remove(scope, variantId, fileId) {
		await mkdir(dirname(this.path), {
			recursive: true,
			mode: 448
		});
		await withFileLock(this.path, async () => {
			const index = await this.load();
			const records = index.records.filter((record) => !(record.scope === scope && record.variantId === variantId && record.fileId === fileId));
			if (records.length !== index.records.length) await this.save({
				formatVersion: 3,
				records
			});
		});
	}
	/**
	* Remove every local mapping for one remote namespace.
	* @param scope - endpoint/API-key namespace.
	*/
	async clear(scope) {
		await mkdir(dirname(this.path), {
			recursive: true,
			mode: 448
		});
		await withFileLock(this.path, async () => {
			const index = await this.load();
			const records = index.records.filter((record) => record.scope !== scope);
			if (records.length !== index.records.length) await this.save({
				formatVersion: 3,
				records
			});
		});
	}
};
//#endregion
//#region lib/types/file-store.js
/** DeepSeek Files API upload reuse, invalidation, and quota recovery. @module dsh-llm-deepseek/file-store */
/** DeepSeek chat accepts at most 32 MiB per image even when it is referenced by file id. */
const MAX_CHAT_IMAGE_BYTES = 32 * 1024 * 1024;
const OWNED_FILE_PREFIX = "dsh-";
function abortReason(signal) {
	const reason = signal.reason;
	return reason instanceof Error ? reason : new Error("DeepSeek file upload cancelled with a non-Error reason.", { cause: reason });
}
function uploadFailure(error) {
	return error instanceof Error ? error : new Error("DeepSeek file upload failed with a non-Error reason.", { cause: error });
}
function waitForUpload(operation, signal) {
	signal?.throwIfAborted();
	operation.waiters += 1;
	let released = false;
	const release = (cancelledReason) => {
		if (released) return;
		released = true;
		operation.waiters -= 1;
		if (cancelledReason !== void 0 && operation.waiters === 0 && !operation.settled) operation.controller.abort(cancelledReason);
	};
	if (signal === void 0) return operation.promise.finally(() => {
		release();
	});
	return new Promise((resolve, reject) => {
		const abort = () => {
			const reason = abortReason(signal);
			release(reason);
			reject(reason);
		};
		signal.addEventListener("abort", abort, { once: true });
		operation.promise.then((value) => {
			signal.removeEventListener("abort", abort);
			release();
			resolve(value);
		}, (error) => {
			signal.removeEventListener("abort", abort);
			release();
			reject(uploadFailure(error));
		});
	});
}
function extension(mediaType) {
	switch (mediaType) {
		case "image/png": return "png";
		case "image/jpeg": return "jpeg";
		case "image/webp": return "webp";
		case "image/gif": return "gif";
	}
}
function filename(version) {
	return `${OWNED_FILE_PREFIX}${String(version.attachment.attachmentId).slice(7, 23)}-${String(version.variantId).slice(7, 15)}.${extension(version.mediaType)}`;
}
/** User-scoped durable file-id reuse for the DeepSeek route. */
var DeepSeekFileStore = class {
	index;
	now;
	fetchImpl;
	inflight = /* @__PURE__ */ new Map();
	/**
	* @param options - testable index, clock, and transport boundaries.
	*/
	constructor(options = {}) {
		this.index = options.index ?? new DeepSeekUploadIndex();
		this.now = options.now ?? Date.now;
		this.fetchImpl = options.fetch;
	}
	client(connection) {
		return new DeepSeekFilesClient({
			baseURL: connection.baseURL,
			apiKey: connection.apiKey,
			...this.fetchImpl === void 0 ? {} : { fetch: this.fetchImpl }
		});
	}
	/**
	* Resolve or upload one deterministic request image. Concurrent calls share one upload while retaining independent waits.
	* @param version - deterministic model-request bytes and complete transformation identity.
	* @param connection - endpoint and API-key snapshot.
	* @param policy - expiry and quota-recovery policy.
	* @param signal - cancellation of this wait; shared transport stops when no waiter remains.
	* @returns a reusable file id and whether this call published a new upload.
	*/
	ensureUploaded(version, connection, policy, signal) {
		signal?.throwIfAborted();
		const key = `${deepSeekFileScope(connection.baseURL, connection.apiKey)}\0${version.variantId}`;
		let active = this.inflight.get(key);
		if (active?.controller.signal.aborted) {
			this.inflight.delete(key);
			active = void 0;
		}
		if (active !== void 0) return waitForUpload(active, signal);
		const controller = new AbortController();
		const shared = {
			controller,
			settled: false,
			waiters: 0,
			promise: void 0
		};
		shared.promise = this.ensureUploadedOnce(version, connection, policy, controller.signal).then((value) => {
			shared.settled = true;
			return value;
		}, (error) => {
			shared.settled = true;
			throw uploadFailure(error);
		});
		this.inflight.set(key, shared);
		shared.promise.finally(() => {
			if (this.inflight.get(key) === shared) this.inflight.delete(key);
		}).catch(() => {});
		return waitForUpload(shared, signal);
	}
	async ensureUploadedOnce(version, connection, policy, signal) {
		if (version.bytes > 33554432) throw new LlmError("DeepSeek chat image exceeds the 32 MiB per-image limit.", "INVALID_REQUEST");
		const scope = deepSeekFileScope(connection.baseURL, connection.apiKey);
		const now = this.now();
		const marginMs = policy.refreshMarginSeconds * 1e3;
		const cached = await this.index.get(scope, version.variantId, now, marginMs);
		if (cached !== void 0) return {
			record: cached,
			uploaded: false
		};
		const client = this.client(connection);
		const upload = async () => {
			const remote = await client.upload({
				data: version.data,
				mediaType: version.mediaType,
				filename: filename(version),
				expiresAfterSeconds: policy.expiresAfterSeconds,
				signal
			});
			if (remote.bytes !== version.data.byteLength) throw new LlmError("DeepSeek Files API upload response does not match the submitted image.", "INVALID_RESPONSE");
			return {
				scope,
				attachmentId: version.attachment.attachmentId,
				variantId: version.variantId,
				fileId: remote.id,
				bytes: remote.bytes,
				createdAt: remote.createdAt * 1e3,
				expiresAt: remote.expiresAt * 1e3
			};
		};
		let candidate;
		try {
			candidate = await upload();
		} catch (error) {
			if (!isFilesQuotaError(error)) throw error;
			if (await this.reclaimOldestOwned(connection, policy.quotaCleanupBatch, signal) === 0) throw error;
			candidate = await upload();
		}
		const committed = await this.index.commit(candidate, this.now(), marginMs);
		if (!committed.accepted) try {
			await client.delete(candidate.fileId, signal);
		} catch {}
		return {
			record: committed.record,
			uploaded: committed.accepted
		};
	}
	/**
	* Invalidate one exact local mapping after the chat endpoint rejects its remote id.
	* @param version - request-image version whose remote generation failed.
	* @param fileId - exact rejected file id.
	* @param connection - endpoint and API-key snapshot.
	*/
	async invalidate(version, fileId, connection) {
		await this.index.remove(deepSeekFileScope(connection.baseURL, connection.apiKey), version.variantId, fileId);
	}
	/**
	* Delete the indexed remote file for one attachment and remove its local mapping.
	* @param version - exact request-image version to release.
	* @param connection - endpoint and API-key snapshot.
	* @param policy - expiry policy used to locate a reusable mapping.
	* @param signal - request cancellation.
	* @returns whether an indexed file existed and was deleted.
	*/
	async release(version, connection, policy, signal) {
		const scope = deepSeekFileScope(connection.baseURL, connection.apiKey);
		const record = await this.index.get(scope, version.variantId, this.now(), policy.refreshMarginSeconds * 1e3);
		if (record === void 0) return false;
		await this.client(connection).delete(record.fileId, signal);
		await this.index.remove(scope, version.variantId, record.fileId);
		return true;
	}
	/**
	* Delete the oldest provider files whose names identify harness ownership.
	* @param connection - endpoint and API-key snapshot.
	* @param count - positive maximum number of files to delete.
	* @param signal - request cancellation.
	* @returns number of successfully deleted files.
	*/
	async reclaimOldestOwned(connection, count, signal) {
		const client = this.client(connection);
		let after;
		const owned = [];
		while (owned.length < count) {
			const page = await client.list({
				...after === void 0 ? {} : { after },
				limit: 1e3,
				order: "asc",
				...signal === void 0 ? {} : { signal }
			});
			for (const file of page.data) {
				if (!file.filename.startsWith(OWNED_FILE_PREFIX)) continue;
				owned.push(file.id);
				if (owned.length === count) break;
			}
			if (!page.hasMore || page.lastId === void 0 || page.lastId === after) break;
			after = page.lastId;
		}
		for (const fileId of owned) await client.delete(fileId, signal);
		return owned.length;
	}
	/**
	* Delete every remote harness-owned file in the active API-key namespace and clear its index.
	* @param connection - endpoint and API-key snapshot.
	* @param signal - request cancellation.
	* @returns number of deleted files.
	*/
	async releaseAll(connection, signal) {
		let total = 0;
		for (;;) {
			const deleted = await this.reclaimOldestOwned(connection, 1e3, signal);
			total += deleted;
			if (deleted < 1e3) break;
		}
		await this.index.clear(deepSeekFileScope(connection.baseURL, connection.apiKey));
		return total;
	}
};
/**
* Parse an SSE byte stream into data payloads. Yields `[DONE]` as the final
* value and returns; throws `LlmError('STREAM_CLOSED')` when the stream ends
* without it (truncated response — the model call cannot be trusted).
* @param stream - raw SSE bytes; reads may split anywhere, including mid-UTF-8 sequence.
* @param onComment - optional transport-activity callback; comments never enter the yielded payload stream.
* @returns each event's data payload in arrival order, the `[DONE]` sentinel last.
*/
async function* parseSse(stream, onComment) {
	const events = stream.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream({ onComment }));
	for await (const { data } of events) {
		yield data;
		if (data === "[DONE]") return;
	}
	throw new LlmError("SSE stream ended without [DONE]", "STREAM_CLOSED");
}
//#endregion
//#region lib/types/translate.js
/**
* Translate DeepSeek SSE payloads with one stateful harness block per content, reasoning, or tool
* call index. An empty initial reasoning delta does not open a block. Finish reason and the latest
* usage are deferred until `[DONE]`, covering both finish-attached and trailing usage-only shapes
* while ensuring no chunk follows `finish`.
*
* Translate DeepSeek wire chunks into the harness `StreamChunk` protocol.
* @module dsh-llm-deepseek/translate
*/
/**
* Map the wire finish_reason vocabulary to the harness FinishReason.
* @param reason - the wire `finish_reason` string.
* @returns the mapped reason; unrecognized values (content_filter, …) become `{kind: 'error'}` with the uppercased value as `code`.
*/
function mapFinishReason(reason) {
	switch (reason) {
		case "stop": return { kind: "stop" };
		case "tool_calls": return { kind: "tool-calls" };
		case "length": return { kind: "max-tokens" };
		default: return {
			kind: "error",
			failure: {
				message: `model stopped: ${reason}`,
				code: reason.toUpperCase()
			}
		};
	}
}
/**
* Map wire usage fields. DeepSeek's `prompt_tokens` INCLUDES cache hits
* (`prompt_tokens = prompt_cache_hit_tokens + prompt_cache_miss_tokens`,
* api/create-chat-completion); the harness TokenUsage convention is
* DISJOINT counts, so cache reads are subtracted out of `inputTokens`.
* @param usage - wire usage from the finish chunk or the trailing usage-only chunk.
* @returns disjoint harness counts; an exact total is present only when the
*   aggregate prompt/completion counters are valid and agree with any wire total.
*/
function mapUsage(usage) {
	const cacheRead = usage.prompt_tokens_details?.cached_tokens ?? usage.prompt_cache_hit_tokens;
	const reasoning = usage.completion_tokens_details?.reasoning_tokens;
	const combined = usage.prompt_tokens + usage.completion_tokens;
	const hasExactTotal = Number.isSafeInteger(usage.prompt_tokens) && usage.prompt_tokens >= 0 && Number.isSafeInteger(usage.completion_tokens) && usage.completion_tokens >= 0 && Number.isSafeInteger(combined) && (usage.total_tokens === void 0 || usage.total_tokens === combined);
	return {
		inputTokens: usage.prompt_tokens - (cacheRead ?? 0),
		outputTokens: usage.completion_tokens,
		...hasExactTotal ? { totalTokens: combined } : {},
		...cacheRead !== void 0 ? { cacheReadTokens: cacheRead } : {},
		...reasoning !== void 0 ? { reasoningTokens: reasoning } : {}
	};
}
/**
* Accept one streamed identity field for a tool call. `id` and `name` are
* identity, not accumulation: the wire sends each once, on the call's first
* delta. A continuation delta that re-sends the field empty — or `null`, which
* some OpenAI-compatible gateways fill in — means "no update", never "clear".
* @param current - the identity established by an earlier delta of this call.
* @param incoming - the field as parsed from this delta. The wire type is a
*   claim about a remote encoder, so anything but a non-empty string leaves the
*   established value alone rather than overwriting it.
* @returns the identity in force after this delta.
*/
function acceptIdentity(current, incoming) {
	return typeof incoming === "string" && incoming.length > 0 ? incoming : current;
}
/** Assemble the final ContentBlock for one open block. */
function closeBlock(block) {
	switch (block.kind) {
		case "text": return {
			type: "text",
			text: block.text
		};
		case "reasoning": return {
			type: "reasoning",
			text: block.text
		};
		case "tool-call": return {
			type: "tool-call",
			id: brandString(block.callId ?? ""),
			name: block.name ?? "",
			arguments: block.text
		};
	}
}
/**
* Consume SSE data payloads (ending with `[DONE]`) and yield StreamChunks.
* Malformed JSON payloads abort the stream with `MALFORMED_RESPONSE`.
* @param payloads - SSE data payloads from {@link parseSse}, `[DONE]`-terminated.
* @returns deltas as they arrive; `block-end`s, `usage`, and `finish` are all deferred to the `[DONE]` sentinel.
*   A `stop` (or absent) finish with no opened blocks is a degenerate provider completion and maps to an
*   `EMPTY_RESPONSE` error finish instead of a successful empty message.
*/
async function* translate(payloads) {
	let nextIndex = 0;
	let textBlock;
	let reasoningBlock;
	const toolBlocks = /* @__PURE__ */ new Map();
	const order = [];
	let pendingFinish;
	let pendingUsage;
	function open(kind) {
		const block = {
			index: nextIndex++,
			kind,
			text: ""
		};
		order.push(block);
		return block;
	}
	for await (const payload of payloads) {
		if (payload === "[DONE]") {
			for (const block of order) yield {
				type: "block-end",
				index: block.index,
				block: closeBlock(block)
			};
			if (pendingUsage) yield {
				type: "usage",
				usage: pendingUsage
			};
			const reason = pendingFinish ?? { kind: "stop" };
			yield {
				type: "finish",
				reason: reason.kind === "stop" && order.length === 0 ? {
					kind: "error",
					failure: {
						message: "model returned a completed response with no content",
						code: EMPTY_RESPONSE_CODE
					}
				} : reason
			};
			return;
		}
		let chunk;
		try {
			chunk = JSON.parse(payload);
		} catch {
			throw new LlmError(`malformed SSE payload: ${payload.slice(0, 120)}`, "MALFORMED_RESPONSE");
		}
		for (const choice of chunk.choices ?? []) {
			const delta = choice.delta;
			const reasoning = delta?.reasoning_content;
			if (typeof reasoning === "string" && reasoning.length > 0) {
				if (!reasoningBlock) {
					reasoningBlock = open("reasoning");
					yield {
						type: "block-start",
						index: reasoningBlock.index,
						blockType: "reasoning"
					};
				}
				reasoningBlock.text += reasoning;
				yield {
					type: "reasoning-delta",
					index: reasoningBlock.index,
					text: reasoning
				};
			}
			const content = delta?.content;
			if (typeof content === "string" && content.length > 0) {
				if (!textBlock) {
					textBlock = open("text");
					yield {
						type: "block-start",
						index: textBlock.index,
						blockType: "text"
					};
				}
				textBlock.text += content;
				yield {
					type: "text-delta",
					index: textBlock.index,
					text: content
				};
			}
			for (const call of delta?.tool_calls ?? []) {
				let block = toolBlocks.get(call.index);
				if (!block) {
					block = open("tool-call");
					toolBlocks.set(call.index, block);
					yield {
						type: "block-start",
						index: block.index,
						blockType: "tool-call"
					};
				}
				block.callId = acceptIdentity(block.callId, call.id);
				block.name = acceptIdentity(block.name, call.function?.name);
				const fragment = call.function?.arguments ?? "";
				block.text += fragment;
				yield {
					type: "tool-call-delta",
					index: block.index,
					id: brandString(block.callId ?? ""),
					...block.name !== void 0 ? { name: block.name } : {},
					argumentsDelta: fragment
				};
			}
			if (typeof choice.finish_reason === "string") pendingFinish = mapFinishReason(choice.finish_reason);
		}
		if (chunk.usage) pendingUsage = mapUsage(chunk.usage);
	}
	throw new LlmError("SSE payload stream ended without [DONE]", "STREAM_CLOSED");
}
//#endregion
//#region lib/types/adapter.js
/**
* `DeepSeekAdapter`: fetch + SSE against a DeepSeek (OpenAI-compatible)
* chat-completions endpoint, emitting harness StreamChunks. The adapter is
* transport-only: connection facts arrive through a thunk resolved once per
* operation and the bearer token through a per-request resolver, so the
* registering plugin owns validation, layering, and credential policy.
*
* @module dsh-llm-deepseek/adapter
*/
var __addDisposableResource = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/** Default maximum idle interval while an adapter stream read is outstanding. */
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 3e5;
/** Default combined request/response context capacity. */
const DEFAULT_CONTEXT_WINDOW = 1e6;
/** Default per-request output-token cap. */
const DEFAULT_MAX_TOKENS = 256e3;
/** Default bound on accumulated base64 image payload after Files API fallback. */
const DEFAULT_MAX_INLINE_REQUEST_IMAGE_BYTES = 20 * 1024 * 1024;
/** Deterministic raw-byte removal step. */
const DEFAULT_IMAGE_OFFLOAD_BYTE_QUANTUM = 64 * 1024 * 1024;
/** Deterministic base64-byte removal step after Files API fallback. */
const DEFAULT_INLINE_IMAGE_OFFLOAD_BYTE_QUANTUM = 10 * 1024 * 1024;
/** Deterministic image-count removal step. */
const DEFAULT_IMAGE_OFFLOAD_COUNT_QUANTUM = 20;
/** Default explicit lifetime for uploaded images. */
const DEFAULT_FILE_EXPIRY_SECONDS = 10080 * 60;
/** Default proactive refresh window for indexed file ids. */
const DEFAULT_FILE_REFRESH_MARGIN_SECONDS = 3600;
/** Default number of oldest harness-owned files removed on quota recovery. */
const DEFAULT_FILE_QUOTA_CLEANUP_BATCH = 100;
/** Default deadline for resolving one request image through the Files API. */
const DEFAULT_FILES_API_TIMEOUT_MS = 6e4;
const STREAM_IDLE_TIMEOUT_CODE = "LLM_STREAM_IDLE_TIMEOUT";
const FILES_API_TIMEOUT_CODE = "DEEPSEEK_FILES_API_TIMEOUT";
const OFF_REASONING_EFFORT = ReasoningEffortId("off");
const LOW_REASONING_EFFORT = ReasoningEffortId("low");
const HIGH_REASONING_EFFORT = ReasoningEffortId("high");
const MAX_REASONING_EFFORT = ReasoningEffortId("max");
const REASONING_EFFORTS = [
	{
		id: OFF_REASONING_EFFORT,
		name: "Off",
		description: "Use for simple tasks that do not need reasoning."
	},
	{
		id: LOW_REASONING_EFFORT,
		name: "Low",
		description: "Prefer for routine or latency-sensitive tasks."
	},
	{
		id: HIGH_REASONING_EFFORT,
		name: "High",
		description: "The default balance for most tasks."
	},
	{
		id: MAX_REASONING_EFFORT,
		name: "Max",
		description: "Reserve for the hardest quality-first tasks."
	}
];
const OFF_ONLY_REASONING_EFFORTS = [{
	id: OFF_REASONING_EFFORT,
	name: "Off",
	description: "Use for simple tasks that do not need reasoning."
}];
/** Marks a failed file-id resolution that may be retried as an inline request. */
var FileResolutionFailure = class extends Error {
	constructor(cause) {
		super("DeepSeek Files API could not resolve a request image.", { cause });
		this.name = "FileResolutionFailure";
	}
};
function collectImageRefs(content, refs) {
	for (const block of content) if (block.type === "image") refs.set(block.attachment.attachmentId, block.attachment);
	else if (block.type === "tool-result") collectImageRefs(block.content, refs);
}
async function prepareRequestImages(options, attachments, model, signal) {
	const refs = /* @__PURE__ */ new Map();
	for (const message of options.messages) collectImageRefs(message.content, refs);
	const policy = resolveRequestImagePolicy(model);
	const orderedRefs = [...refs.values()];
	const projected = await Promise.all(orderedRefs.map((ref) => attachments.readImageRequest(ref, policy, signal)));
	return new Map(orderedRefs.map((ref, index) => [ref.attachmentId, projected[index]]));
}
function providerRejectedNormalizedImage(detail) {
	return /(?:unsupported|invalid|cannot read|failed to (?:decode|process)).{0,40}image/iu.test(detail) || /image.{0,40}(?:unsupported|invalid|cannot be decoded)/iu.test(detail);
}
function providerRejectedFileId(detail) {
	const file = /\bfile(?:[_ -]?(?:id|api|not[_ -]?found|deleted|expired))?/iu.test(detail);
	const missing = /(?:expired|not[_ -]?found|deleted|do(?:es)? not exist|not created under (?:this|your) account)/iu.test(detail);
	const invalidId = /(?:invalid.{0,20}file[_ -]?(?:id|api)|file[_ -]?(?:id|api).{0,20}invalid)/iu.test(detail);
	return file && (missing || invalidId);
}
function detailNamesFileId(detail, fileId) {
	let index = detail.indexOf(fileId);
	while (index >= 0) {
		const before = detail[index - 1];
		const after = detail[index + fileId.length];
		if ((before === void 0 || !/[\p{L}\p{N}_-]/u.test(before)) && (after === void 0 || !/[\p{L}\p{N}_-]/u.test(after))) return true;
		index = detail.indexOf(fileId, index + 1);
	}
	return false;
}
function staleMappings(files, detail) {
	const unique = [...new Map(files.map((file) => [`${file.version.variantId}\0${file.fileId}`, file])).values()];
	const exact = unique.filter((file) => detailNamesFileId(detail, file.fileId));
	return exact.length > 0 ? exact : unique;
}
function normalizedImageFacts(file) {
	const version = file.version;
	const name = version.attachment.name ?? version.attachment.attachmentId;
	const colour = version.hasAlpha ? "sRGBA" : "sRGB";
	return `"${name}" at message ${file.location.message}, image ${file.location.image} (${version.mediaType}, 8-bit ${colour}, ${version.width}x${version.height})`;
}
function normalizedImageDiagnostic(files, providerMessage, providerDetail) {
	const target = files.find((file) => detailNamesFileId(providerDetail, file.fileId)) ?? (files.length === 1 ? files[0] : void 0);
	if (target !== void 0) return `DeepSeek rejected normalized image ${normalizedImageFacts(target)}: ${providerMessage}. The provider rejected bytes already normalized by the harness; PNG, JPEG, WebP, and GIF remain supported input formats.`;
	return `DeepSeek rejected a normalized request image: ${providerMessage}. Candidate images: ${[...new Map(files.map((file) => [`${file.version.variantId}\0${file.location.message}\0${file.location.image}`, file])).values()].map(normalizedImageFacts).join("; ")}. The provider rejected bytes already normalized by the harness; PNG, JPEG, WebP, and GIF remain supported input formats.`;
}
function modelInfo(provider, model) {
	return {
		provider,
		id: model.id,
		name: model.name ?? model.id,
		...model.description === void 0 ? {} : { description: model.description },
		inputModalities: model.inputModalities ?? ["text"]
	};
}
function providerRetryAfterMs(value) {
	if (value === null) return void 0;
	if (/^\d+$/.test(value)) {
		const delay = Number(value) * 1e3;
		return Number.isFinite(delay) && delay > 0 ? delay : void 0;
	}
	const delay = Date.parse(value) - Date.now();
	return Number.isFinite(delay) && delay > 0 ? delay : void 0;
}
function requestId(headers) {
	const value = headers.get("x-request-id") ?? headers.get("x-deepseek-request-id");
	return value === null || value.length === 0 ? void 0 : ProviderRequestId(value);
}
/**
* Map an HTTP status to a stable LlmError code.
* @param status - status of a non-2xx provider response.
* @param error - parsed provider error body, when available.
* @returns the normalized harness error code.
*/
function httpErrorCode(status, error) {
	if (status === 401 || status === 403) return "AUTH";
	if (status === 413) return "INVALID_REQUEST";
	const detail = [
		error?.code,
		error?.type,
		error?.message
	].filter(Boolean).join(" ");
	if (isQuotaExceededError(detail)) return QUOTA_EXCEEDED_CODE;
	if (status === 429) return "RATE_LIMIT";
	if (status === 400) {
		if (isContextWindowExceededError(detail)) return CONTEXT_WINDOW_EXCEEDED_CODE;
		return "INVALID_REQUEST";
	}
	if (status >= 500) return "SERVER";
	return `HTTP_${status}`;
}
/**
* The first real `LlmAdapter`. One instance serves every model name it was
* registered under (the harness model name IS the wire model name).
*
* One stable signal reaches both initial fetch and body reads. Caller aborts
* map to `ABORTED`; the configured per-read idle watchdog maps to `TIMEOUT`.
*/
var DeepSeekAdapter = class extends LlmAdapter {
	config;
	files;
	constructor(config) {
		super();
		this.config = config;
		this.files = config.resolveFiles?.() ?? new DeepSeekFileStore();
	}
	providerInfo(provider) {
		return {
			id: provider,
			name: "DeepSeek"
		};
	}
	providerRetryPolicy(_provider) {
		return this.config.options().retryPolicy;
	}
	imageRequestPricing(_provider, model) {
		const attachments = this.config.resolveAttachments?.();
		const resolveAccess = attachments === void 0 ? void 0 : (ref) => this.config.resolveImageAccess?.(attachments, ref);
		return deepSeekImageRequestPricing(this.config.options(), model, resolveAccess);
	}
	listModels(provider) {
		return Promise.resolve(this.config.options().models.map((model) => modelInfo(provider, model)));
	}
	resolveModel(provider, model, _signal) {
		return Promise.resolve(this.modelInfoFor(this.config.options(), provider, model));
	}
	modelInfoFor(connection, provider, model) {
		const configured = connection.models.find((entry) => entry.id === model);
		const contextWindow = configured?.contextWindow ?? connection.defaultContextWindow;
		return {
			...configured === void 0 ? {
				provider,
				id: model,
				name: model,
				inputModalities: ["text"]
			} : modelInfo(provider, configured),
			context: { contextWindow },
			defaultMaxTokens: configured?.maxTokens ?? connection.maxTokens,
			...configured?.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: configured.systemPromptUpdate },
			...connection.defaults.thinking === "disabled" ? { reasoning: {
				efforts: OFF_ONLY_REASONING_EFFORTS,
				defaultEffort: OFF_REASONING_EFFORT
			} } : { reasoning: {
				efforts: REASONING_EFFORTS,
				defaultEffort: connection.defaults.reasoningEffort === "off" ? OFF_REASONING_EFFORT : connection.defaults.reasoningEffort === "low" ? LOW_REASONING_EFFORT : connection.defaults.reasoningEffort === "max" ? MAX_REASONING_EFFORT : HIGH_REASONING_EFFORT
			} }
		};
	}
	prepareCall(provider, model, _signal) {
		const connection = this.config.options();
		return Promise.resolve({
			model: this.modelInfoFor(connection, provider, model),
			stream: (options) => this.streamWithConnection(options, connection)
		});
	}
	stream(options) {
		return this.streamWithConnection(options, this.config.options());
	}
	async *streamWithConnection(options, connection) {
		const env_1 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			const hasImages = options.messages.some((message) => contentHasImage(message.content));
			let attachments;
			if (hasImages) {
				if (connection.models.find((entry) => entry.id === options.model)?.inputModalities?.includes("image") !== true) throw new LlmError(`DeepSeek model "${options.model}" does not accept image input.`, "UNSUPPORTED_CONTENT");
				attachments = this.config.resolveAttachments?.();
				if (attachments === void 0) throw new LlmError("DeepSeek image conversion requires the durable attachment service.", "UNSUPPORTED_CONTENT");
			}
			const apiKey = await this.config.resolveApiKey(connection);
			const userId = this.config.resolveUserId();
			const consumer = new AbortController();
			const watchdog = __addDisposableResource(env_1, idleWatchdog(options.signal === void 0 ? consumer.signal : AbortSignal.any([options.signal, consumer.signal]), connection.streamIdleTimeoutMs, STREAM_IDLE_TIMEOUT_CODE), false);
			const iterator = this.request(options, watchdog.signal, connection, apiKey, userId, attachments, () => {
				watchdog.pulse();
			})[Symbol.asyncIterator]();
			let exhausted = false;
			try {
				while (true) {
					const result = await watchdog.next(iterator);
					if (result.done) {
						exhausted = true;
						return;
					}
					yield result.value;
				}
			} catch (error) {
				if (timeoutOf(watchdog.signal, STREAM_IDLE_TIMEOUT_CODE) !== void 0) throw new LlmError(`DeepSeek stream idle timeout after ${connection.streamIdleTimeoutMs}ms`, "TIMEOUT", { cause: error });
				if (options.signal?.aborted) throw new LlmError("DeepSeek request aborted by caller", "ABORTED", { cause: error });
				if (error instanceof LlmError) throw error;
				throw new LlmError(`DeepSeek API stream from ${connection.baseURL} failed`, "TRANSPORT", { cause: error });
			} finally {
				consumer.abort("DeepSeek stream consumer stopped");
				if (!exhausted && iterator.return !== void 0) try {
					await iterator.return();
				} catch (_abortedTransportTeardown) {}
			}
		} catch (e_1) {
			env_1.error = e_1;
			env_1.hasError = true;
		} finally {
			__disposeResources(env_1);
		}
	}
	async *request(options, signal, connection, apiKey, userId, attachments, onActivity) {
		const headers = {
			"authorization": `Bearer ${apiKey}`,
			"content-type": "application/json",
			"accept": "text/event-stream",
			...attributionHeaders(),
			"x-deepseek-harness-user-id": String(userId),
			...options.sessionId !== void 0 ? { "x-deepseek-harness-session-id": String(options.sessionId) } : {},
			...options.purpose === "compaction" ? { "x-deepseek-harness-compact": "1" } : {}
		};
		const fileConnection = {
			baseURL: connection.baseURL,
			apiKey
		};
		const model = connection.models.find((entry) => entry.id === options.model);
		const policy = model === void 0 ? void 0 : resolveRequestImagePolicy(model);
		const resolveImageAccess = attachments === void 0 ? void 0 : (ref) => this.config.resolveImageAccess?.(attachments, ref);
		const imageAccessOptions = resolveImageAccess === void 0 ? {} : { resolveImageAccess };
		const requestMessages = policy === void 0 ? options.messages : offloadRequestImagesWithPolicy(options.messages, {
			representation: "raw",
			maxBytes: connection.maxRequestFilesBytes,
			maxImages: connection.maxImagesPerRequest,
			byteQuantum: connection.imageOffloadByteQuantum,
			countQuantum: connection.imageOffloadCountQuantum,
			byteLength: (ref) => Math.min(ref.bytes, policy.maxBytes),
			placeholder: (ref) => offloadedImageText(ref, resolveImageAccess?.(ref))
		});
		const requestOptions = requestMessages === options.messages ? options : {
			...options,
			messages: [...requestMessages]
		};
		const requestImages = attachments === void 0 || model === void 0 ? /* @__PURE__ */ new Map() : await prepareRequestImages(requestOptions, attachments, model, signal);
		let representation = "file";
		let fileAttempt = 0;
		while (true) {
			const usedFiles = [];
			let body;
			if (attachments === void 0) body = serializeRequest(requestOptions, connection.defaults);
			else if (representation === "base64") body = await serializeRequestWithImages(requestOptions, {
				representation: { kind: "base64" },
				requestImages,
				...imageAccessOptions,
				maxRequestImageBytes: connection.maxInlineRequestImageBytes,
				maxImagesPerRequest: connection.maxImagesPerRequest,
				byteQuantum: connection.inlineImageOffloadByteQuantum,
				countQuantum: connection.imageOffloadCountQuantum
			}, connection.defaults);
			else try {
				body = await serializeRequestWithImages(requestOptions, {
					representation: {
						kind: "file",
						resolveFileId: async (version, _block, location) => {
							const env_2 = {
								stack: [],
								error: void 0,
								hasError: false
							};
							try {
								const filesDeadline = __addDisposableResource(env_2, deadline(signal, connection.filesApiTimeoutMs, FILES_API_TIMEOUT_CODE), false);
								let resolved;
								try {
									resolved = await this.files.ensureUploaded(version, fileConnection, connection.filePolicy, filesDeadline.signal);
								} catch (error) {
									if (signal.aborted) throw error;
									throw new FileResolutionFailure(error);
								}
								onActivity();
								usedFiles.push({
									version,
									fileId: resolved.record.fileId,
									location
								});
								return resolved.record.fileId;
							} catch (e_2) {
								env_2.error = e_2;
								env_2.hasError = true;
							} finally {
								__disposeResources(env_2);
							}
						}
					},
					requestImages,
					...imageAccessOptions,
					maxRequestImageBytes: connection.maxRequestFilesBytes,
					maxImagesPerRequest: connection.maxImagesPerRequest,
					byteQuantum: connection.imageOffloadByteQuantum,
					countQuantum: connection.imageOffloadCountQuantum
				}, connection.defaults);
			} catch (error) {
				if (!(error instanceof FileResolutionFailure)) throw error;
				representation = "base64";
				continue;
			}
			let extensions;
			try {
				extensions = await this.config.prepareExtensions({
					body,
					signal,
					...options.sessionId === void 0 ? {} : { sessionId: String(options.sessionId) },
					...options.purpose === void 0 ? {} : { purpose: options.purpose }
				});
			} catch (error) {
				throw new LlmError("DeepSeek request extension preparation failed", "REQUEST_EXTENSION", { cause: error });
			}
			for (const field of Object.keys(extensions.fields)) if (Object.hasOwn(body, field)) throw new LlmError(`DeepSeek request extension field ${JSON.stringify(field)} collides with the base request`, "REQUEST_EXTENSION");
			const payload = JSON.stringify({
				...body,
				...extensions.fields
			});
			let response;
			try {
				response = await fetch(`${connection.baseURL}/chat/completions`, {
					method: "POST",
					headers,
					body: payload,
					signal
				});
			} catch (error) {
				if (signal.aborted) throw error;
				throw new LlmError(`DeepSeek API request to ${connection.baseURL} failed`, "TRANSPORT", { cause: error });
			}
			if (!response.ok) {
				let message = `DeepSeek API error (HTTP ${response.status})`;
				let providerError;
				const rawResponse = await response.text();
				try {
					providerError = JSON.parse(rawResponse).error;
					if (providerError?.message) message = providerError.message;
				} catch {}
				const detail = [
					providerError?.code,
					providerError?.type,
					providerError?.message
				].filter((field) => typeof field === "string").join(" ");
				if (usedFiles.length > 0 && providerRejectedFileId(detail)) {
					await Promise.all(staleMappings(usedFiles, detail).map((file) => this.files.invalidate(file.version, file.fileId, fileConnection)));
					if (fileAttempt === 0) {
						fileAttempt += 1;
						continue;
					}
				}
				if (response.status === 400 && usedFiles.length > 0 && providerRejectedNormalizedImage(detail)) message = normalizedImageDiagnostic(usedFiles, message, detail);
				const delay = providerRetryAfterMs(response.headers.get("retry-after"));
				const id = requestId(response.headers);
				throw new LlmError(message, httpErrorCode(response.status, providerError), {
					cause: new Error(rawResponse.length > 0 ? rawResponse : `DeepSeek HTTP ${response.status}`),
					status: response.status,
					...delay === void 0 ? {} : { providerRetryAfterMs: delay },
					...id === void 0 ? {} : { requestId: id }
				});
			}
			try {
				await extensions.accept();
			} catch (error) {
				throw new LlmError("DeepSeek request extension acceptance failed", "REQUEST_EXTENSION", { cause: error });
			}
			if (!response.body) throw new LlmError("DeepSeek API returned no response body", "EMPTY_RESPONSE");
			yield* translate(parseSse(response.body, onActivity));
			return;
		}
	}
};
//#endregion
//#region lib/types/index.js
/**
* Register a {@link DeepSeekAdapter} for the `deepseek-official` provider route on
* `ctx.llm`, with connection facts resolved per request instead of frozen at
* load: the plugin layers its `cordis.yml` entry config under the optional
* `llm-deepseek` user-settings section (`ctx.settings`) and resolves the API
* key through the optional credential seam (`ctx.credentials`), so a changed
* base URL, catalog, or key reaches the very next request without restarting
* anything, while an in-flight stream keeps the facts it started with. The
* one registration-captured fact — the retry policy — re-registers the route
* in place when it changes.
* @module @deepseek-ai/dsh-llm-deepseek
*/
const name = "llm-deepseek";
const inject = ["llm"];
const NS = "llm-deepseek";
const DEFAULT_API_KEY_ENV = "DEEPSEEK_API_KEY";
/** The single provider route this plugin owns. */
const PROVIDER = "deepseek-official";
const DEFAULT_MODELS = [
	{
		id: "deepseek-flash",
		name: "DeepSeek-V41-Flash",
		contextWindow: DEFAULT_CONTEXT_WINDOW,
		inputModalities: ["text", "image"],
		imagePixelBudget: DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET,
		imageMaxBytes: DEFAULT_REQUEST_IMAGE_MAX_BYTES,
		systemPromptUpdate: "in-history"
	},
	{
		id: "deepseek-v4-flash",
		name: "DeepSeek-V4-Flash",
		description: "Fast, efficient, and economical; suited to focused, routine, or parallel tasks.",
		contextWindow: DEFAULT_CONTEXT_WINDOW
	},
	{
		id: "deepseek-v4-pro",
		name: "DeepSeek-V4-Pro",
		description: "Stronger agentic coding, knowledge, and difficult reasoning; suited to complex or quality-critical tasks at higher cost.",
		contextWindow: DEFAULT_CONTEXT_WINDOW
	},
	{
		id: "deepseek-v4-flash-vision-exp",
		name: "DeepSeek-V4-Flash-Vision-Exp",
		contextWindow: DEFAULT_CONTEXT_WINDOW,
		inputModalities: ["text", "image"],
		imagePixelBudget: DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET,
		imageMaxBytes: DEFAULT_REQUEST_IMAGE_MAX_BYTES
	}
];
const MODEL_MODALITIES = ["text", "image"];
const catalogModel = z.object({
	id: z.string().required(),
	name: z.string(),
	description: z.string(),
	contextWindow: z.number().step(1).min(1),
	maxTokens: z.number().step(1).min(1),
	inputModalities: z.array(z.union(MODEL_MODALITIES)).min(1).default(["text"]),
	imagePixelBudget: z.union([z.number().step(1).min(1), "low"]),
	imageMaxBytes: z.number().step(1).min(1),
	systemPromptUpdate: z.const("in-history")
});
const Config = z.object({
	apiKeyEnv: z.string().role("credential-ref").default(DEFAULT_API_KEY_ENV),
	baseURL: z.string(),
	thinking: z.union(["enabled", "disabled"]),
	reasoningEffort: z.union([
		"off",
		"low",
		"high",
		"max"
	]),
	maxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_TOKENS),
	defaultContextWindow: z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW),
	models: z.array(catalogModel).default(DEFAULT_MODELS),
	streamIdleTimeoutMs: z.number().min(Number.MIN_VALUE).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TIMEOUT_MS),
	maxRequestFilesBytes: z.number().step(1).min(1).default(DEFAULT_MAX_REQUEST_FILES_BYTES),
	maxInlineRequestImageBytes: z.number().step(1).min(1).default(DEFAULT_MAX_INLINE_REQUEST_IMAGE_BYTES),
	maxImagesPerRequest: z.number().step(1).min(1).default(600),
	imageOffloadByteQuantum: z.number().step(1).min(1).default(DEFAULT_IMAGE_OFFLOAD_BYTE_QUANTUM),
	inlineImageOffloadByteQuantum: z.number().step(1).min(1).default(DEFAULT_INLINE_IMAGE_OFFLOAD_BYTE_QUANTUM),
	imageOffloadCountQuantum: z.number().step(1).min(1).default(20),
	filesApiTimeoutMs: z.number().min(Number.MIN_VALUE).max(MAX_TIMER_DELAY_MS).default(DEFAULT_FILES_API_TIMEOUT_MS),
	fileExpiresAfterSeconds: z.number().step(1).min(3600).max(2592e3).default(DEFAULT_FILE_EXPIRY_SECONDS),
	fileRefreshMarginSeconds: z.number().step(1).min(0).default(DEFAULT_FILE_REFRESH_MARGIN_SECONDS),
	fileQuotaCleanupBatch: z.number().step(1).min(1).max(1e3).default(100),
	retryPolicy: RetryPolicySchema
});
/** Public API default; the internal endpoint comes from $DEEPSEEK_BASE_URL. */
const PUBLIC_BASE_URL = "https://api.deepseek.com";
/** Environment variable naming this provider's endpoint, honored only from trusted layers. */
const BASE_URL_ENV = "DEEPSEEK_BASE_URL";
/** Resolve, validate, and detach the advisory model catalog. */
function resolveModels(models) {
	const seen = /* @__PURE__ */ new Set();
	return (models ?? DEFAULT_MODELS).map((model) => {
		if (Object.hasOwn(model, "imageDetail")) throw new Error("llm-deepseek: catalog model imageDetail is no longer supported; use imagePixelBudget");
		if (model.id.length === 0) throw new Error("llm-deepseek: catalog model ids must be non-empty");
		if (model.name !== void 0 && model.name.length === 0) throw new Error(`llm-deepseek: catalog model "${model.id}" has an empty name`);
		if (model.contextWindow !== void 0 && (!Number.isInteger(model.contextWindow) || model.contextWindow <= 0)) throw new Error(`llm-deepseek: catalog model "${model.id}" contextWindow must be a positive integer`);
		if (model.maxTokens !== void 0 && (!Number.isInteger(model.maxTokens) || model.maxTokens <= 0)) throw new Error(`llm-deepseek: catalog model "${model.id}" maxTokens must be a positive integer`);
		const inputModalities = model.inputModalities ?? ["text"];
		if (inputModalities.length === 0) throw new Error(`llm-deepseek: catalog model "${model.id}" inputModalities must not be empty`);
		if (inputModalities.some((modality) => !MODEL_MODALITIES.includes(modality))) throw new Error(`llm-deepseek: catalog model "${model.id}" inputModalities must contain only "text" and "image"`);
		if (new Set(inputModalities).size !== inputModalities.length) throw new Error(`llm-deepseek: catalog model "${model.id}" inputModalities must not contain duplicates`);
		const hasImage = inputModalities.includes("image");
		if (!hasImage && (model.imagePixelBudget !== void 0 || model.imageMaxBytes !== void 0)) throw new Error(`llm-deepseek: text-only catalog model "${model.id}" cannot declare image request limits`);
		if (model.imagePixelBudget !== void 0 && model.imagePixelBudget !== "low" && (!Number.isSafeInteger(model.imagePixelBudget) || model.imagePixelBudget <= 0)) throw new Error(`llm-deepseek: catalog model "${model.id}" imagePixelBudget must be "low" or a positive safe integer`);
		if (model.imageMaxBytes !== void 0 && (!Number.isSafeInteger(model.imageMaxBytes) || model.imageMaxBytes <= 0)) throw new Error(`llm-deepseek: catalog model "${model.id}" imageMaxBytes must be a positive safe integer`);
		const systemPromptUpdate = model.systemPromptUpdate;
		if (systemPromptUpdate !== void 0 && systemPromptUpdate !== "in-history") throw new Error(`llm-deepseek: catalog model "${model.id}" systemPromptUpdate must be "in-history" when present`);
		if (seen.has(model.id)) throw new Error(`llm-deepseek: duplicate catalog model "${model.id}"`);
		seen.add(model.id);
		return {
			id: model.id,
			...model.name === void 0 ? {} : { name: model.name },
			...model.description === void 0 ? {} : { description: model.description },
			...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
			...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens },
			...model.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: model.systemPromptUpdate },
			inputModalities: [...inputModalities],
			...hasImage ? {
				imagePixelBudget: model.imagePixelBudget === "low" ? DEFAULT_LOW_DETAIL_IMAGE_PIXEL_BUDGET : model.imagePixelBudget ?? 64e4,
				imageMaxBytes: model.imageMaxBytes ?? 1048576
			} : {}
		};
	});
}
/**
* The one explicit resolve step from raw config to validated connection
* facts. Programmatic construction may bypass Schemastery normalization, so
* every default and bound is re-judged here — for the composition entry at
* load (fail loud) and for each settings snapshot at its first use.
* @param config - raw plugin config or resolved settings snapshot.
* @param environment - this run's environment layers, or `undefined` outside
* the product CLI. Every layer may supply an endpoint: the product trusts the
* project it is launched in, so a checkout can point its own agent at the
* gateway that checkout is meant to use.
* @returns validated connection facts plus the credential reference.
*/
function resolveAdapterOptions(config, environment) {
	if (config.thinking === "disabled" && config.reasoningEffort !== void 0 && config.reasoningEffort !== "off") throw new Error("llm-deepseek: only reasoningEffort \"off\" can be configured when thinking is disabled");
	if (config.defaultContextWindow !== void 0 && (!Number.isInteger(config.defaultContextWindow) || config.defaultContextWindow <= 0)) throw new Error("llm-deepseek: defaultContextWindow must be a positive integer");
	if (config.maxTokens !== void 0 && (!Number.isSafeInteger(config.maxTokens) || config.maxTokens <= 0)) throw new Error("llm-deepseek: maxTokens must be a positive safe integer");
	const streamIdleTimeoutMs = config.streamIdleTimeoutMs ?? 3e5;
	if (!Number.isFinite(streamIdleTimeoutMs) || streamIdleTimeoutMs <= 0 || streamIdleTimeoutMs > MAX_TIMER_DELAY_MS) throw new Error(`llm-deepseek: streamIdleTimeoutMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	const maxRequestFilesBytes = config.maxRequestFilesBytes ?? 134217728;
	if (!Number.isSafeInteger(maxRequestFilesBytes) || maxRequestFilesBytes <= 0) throw new Error("llm-deepseek: maxRequestFilesBytes must be a positive safe integer");
	const maxInlineRequestImageBytes = config.maxInlineRequestImageBytes ?? 20971520;
	if (!Number.isSafeInteger(maxInlineRequestImageBytes) || maxInlineRequestImageBytes <= 0) throw new Error("llm-deepseek: maxInlineRequestImageBytes must be a positive safe integer");
	const maxImagesPerRequest = config.maxImagesPerRequest ?? 600;
	if (!Number.isSafeInteger(maxImagesPerRequest) || maxImagesPerRequest <= 0) throw new Error("llm-deepseek: maxImagesPerRequest must be a positive safe integer");
	const imageOffloadByteQuantum = config.imageOffloadByteQuantum ?? 67108864;
	if (!Number.isSafeInteger(imageOffloadByteQuantum) || imageOffloadByteQuantum <= 0) throw new Error("llm-deepseek: imageOffloadByteQuantum must be a positive safe integer");
	if (imageOffloadByteQuantum > maxRequestFilesBytes) throw new Error("llm-deepseek: imageOffloadByteQuantum must not exceed maxRequestFilesBytes");
	const inlineImageOffloadByteQuantum = config.inlineImageOffloadByteQuantum ?? 10485760;
	if (!Number.isSafeInteger(inlineImageOffloadByteQuantum) || inlineImageOffloadByteQuantum <= 0) throw new Error("llm-deepseek: inlineImageOffloadByteQuantum must be a positive safe integer");
	if (inlineImageOffloadByteQuantum > maxInlineRequestImageBytes) throw new Error("llm-deepseek: inlineImageOffloadByteQuantum must not exceed maxInlineRequestImageBytes");
	const imageOffloadCountQuantum = config.imageOffloadCountQuantum ?? 20;
	if (!Number.isSafeInteger(imageOffloadCountQuantum) || imageOffloadCountQuantum <= 0) throw new Error("llm-deepseek: imageOffloadCountQuantum must be a positive safe integer");
	if (imageOffloadCountQuantum > maxImagesPerRequest) throw new Error("llm-deepseek: imageOffloadCountQuantum must not exceed maxImagesPerRequest");
	const filesApiTimeoutMs = config.filesApiTimeoutMs ?? 6e4;
	if (!Number.isFinite(filesApiTimeoutMs) || filesApiTimeoutMs <= 0 || filesApiTimeoutMs > MAX_TIMER_DELAY_MS) throw new Error(`llm-deepseek: filesApiTimeoutMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	const fileExpiresAfterSeconds = config.fileExpiresAfterSeconds ?? 604800;
	if (!Number.isSafeInteger(fileExpiresAfterSeconds) || fileExpiresAfterSeconds < 3600 || fileExpiresAfterSeconds > 2592e3) throw new Error("llm-deepseek: fileExpiresAfterSeconds must be an integer from 3600 through 2592000");
	const fileRefreshMarginSeconds = config.fileRefreshMarginSeconds ?? 3600;
	if (!Number.isSafeInteger(fileRefreshMarginSeconds) || fileRefreshMarginSeconds < 0 || fileRefreshMarginSeconds >= fileExpiresAfterSeconds) throw new Error("llm-deepseek: fileRefreshMarginSeconds must be a non-negative integer below fileExpiresAfterSeconds");
	const fileQuotaCleanupBatch = config.fileQuotaCleanupBatch ?? 100;
	if (!Number.isSafeInteger(fileQuotaCleanupBatch) || fileQuotaCleanupBatch < 1 || fileQuotaCleanupBatch > 1e3) throw new Error("llm-deepseek: fileQuotaCleanupBatch must be an integer from 1 through 1000");
	return {
		apiKeyEnv: credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV),
		baseURL: config.baseURL ?? environment?.get(BASE_URL_ENV)?.value ?? "https://api.deepseek.com",
		defaults: {
			thinking: config.thinking,
			reasoningEffort: config.reasoningEffort
		},
		maxTokens: config.maxTokens ?? 256e3,
		defaultContextWindow: config.defaultContextWindow ?? 1e6,
		models: resolveModels(config.models),
		streamIdleTimeoutMs,
		maxRequestFilesBytes,
		maxInlineRequestImageBytes,
		maxImagesPerRequest,
		imageOffloadByteQuantum,
		inlineImageOffloadByteQuantum,
		imageOffloadCountQuantum,
		filesApiTimeoutMs,
		filePolicy: {
			expiresAfterSeconds: fileExpiresAfterSeconds,
			refreshMarginSeconds: fileRefreshMarginSeconds,
			quotaCleanupBatch: fileQuotaCleanupBatch
		},
		retryPolicy: resolveRetryPolicy(config.retryPolicy, "llm-deepseek: retryPolicy")
	};
}
function apply(ctx, config) {
	let current = () => config;
	let lastRaw;
	let lastGood;
	const options = () => {
		const raw = current();
		if (raw === lastRaw && lastGood !== void 0) return lastGood;
		try {
			const next = resolveAdapterOptions(raw, launchEnvironmentOf(ctx));
			lastRaw = raw;
			lastGood = next;
			return next;
		} catch (error) {
			if (lastGood === void 0) throw error;
			lastRaw = raw;
			ctx.logger.error("llm-deepseek: keeping the last good configuration after an invalid settings section");
			ctx.logger.error(error);
			return lastGood;
		}
	};
	options();
	const resolveApiKey = async (connection) => {
		const ref = connection.apiKeyEnv;
		const credentials = ctx.get("credentials");
		if (credentials !== void 0) {
			const hit = await credentials.resolve(ref);
			if (hit !== void 0) return assertUsableApiKey(hit.value, "llm-deepseek", ref);
		} else {
			const ambient = launchEnvironmentOf(ctx).get(ref);
			if (ambient !== void 0 && ambient.value.length > 0) return assertUsableApiKey(ambient.value, "llm-deepseek", ref);
		}
		throw new LlmError(`llm-deepseek: no API key for provider route "${PROVIDER}"; store ${ref} through the credentials service (the web Models page writes it), or export ${ref} in the launching environment`, "MISSING_CREDENTIAL");
	};
	let userId;
	const resolveUserId = () => userId ??= getOrCreateAnonymousUserId();
	const adapter = new DeepSeekAdapter({
		options,
		resolveApiKey,
		resolveUserId,
		resolveAttachments: () => ctx.get("attachments"),
		resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(attachments, (hostPath) => ctx.get("fs")?.processPathFromHostPath(hostPath), ref),
		prepareExtensions: (request) => {
			return ctx.get("deepseekLlmApiExtensions")?.prepare(request) ?? Promise.resolve({
				fields: {},
				accept: () => Promise.resolve()
			});
		}
	});
	ctx.llm.registerConfigurableProviders([{
		provider: PROVIDER,
		displayName: "DeepSeek",
		settingsNs: NS,
		settingsPath: []
	}]);
	const registration = ctx.llm.registerAdapter([PROVIDER], adapter);
	let registeredPolicy = options().retryPolicy;
	const ensureRegistrationFacts = () => {
		const policy = options().retryPolicy;
		if (deepEqualJson(policy, registeredPolicy)) return;
		registration.replace([PROVIDER]);
		registeredPolicy = policy;
	};
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.installSection(ctx, NS, Config, config, {
			setSource: (source) => {
				current = source;
			},
			onChange: ensureRegistrationFacts
		});
	});
}
//#endregion
export { Config, DEFAULT_CONTEXT_WINDOW, DEFAULT_FILES_API_TIMEOUT_MS, DEFAULT_FILE_EXPIRY_SECONDS, DEFAULT_FILE_QUOTA_CLEANUP_BATCH, DEFAULT_FILE_REFRESH_MARGIN_SECONDS, DEFAULT_IMAGE_OFFLOAD_BYTE_QUANTUM, DEFAULT_IMAGE_OFFLOAD_COUNT_QUANTUM, DEFAULT_INLINE_IMAGE_OFFLOAD_BYTE_QUANTUM, DEFAULT_LOW_DETAIL_IMAGE_PIXEL_BUDGET, DEFAULT_MAX_IMAGES_PER_REQUEST, DEFAULT_MAX_INLINE_REQUEST_IMAGE_BYTES, DEFAULT_MAX_REQUEST_FILES_BYTES, DEFAULT_MAX_TOKENS, DEFAULT_REQUEST_IMAGE_MAX_BYTES, DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET, DEFAULT_STREAM_IDLE_TIMEOUT_MS, DeepSeekAdapter, DeepSeekFileId, DeepSeekFileStore, DeepSeekFilesClient, DeepSeekUploadIndex, MAX_CHAT_IMAGE_BYTES, MAX_FILE_EXPIRY_SECONDS, MAX_FILE_UPLOAD_BYTES, MAX_STORED_FILE_BYTES, MAX_STORED_FILE_COUNT, MIN_FILE_EXPIRY_SECONDS, PUBLIC_BASE_URL, apply, deepSeekFileScope, deepSeekImageRequestPricing, deepSeekImageTokens, inject, name, resolveAdapterOptions, resolveRequestImagePolicy };

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
import type { ImageAttachmentAccessResolver, LlmImageRequestPricing } from '@deepseek-ai/dsh-llm';
import type { ImageRequestPolicy } from '@deepseek-ai/dsh-attachment';
import type { DeepSeekCatalogModel, DeepSeekConnectionOptions } from './adapter.ts';
/** Default bound on accumulated file-referenced image bytes per request. */
export declare const DEFAULT_MAX_REQUEST_FILES_BYTES: number;
/** Provider request image-count limit. */
export declare const DEFAULT_MAX_IMAGES_PER_REQUEST = 600;
/** Total-pixel budget matching DeepSeek's normal vision projection. */
export declare const DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET = 640000;
/** Total-pixel budget matching provider low-detail image input. */
export declare const DEFAULT_LOW_DETAIL_IMAGE_PIXEL_BUDGET: number;
/** Encoded-byte target for one deterministic model-request image; the smallest quality-ladder output is used when no quality fits. */
export declare const DEFAULT_REQUEST_IMAGE_MAX_BYTES: number;
/**
 * Resolve the request-image budgets owned by one DeepSeek model route.
 * @param model - Advertised model route and its optional image overrides.
 * @returns Complete pixel and encoded-byte budgets.
 * @internal
 */
export declare function resolveRequestImagePolicy(model: DeepSeekCatalogModel): ImageRequestPolicy;
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
export declare function deepSeekImageRequestPricing(connection: DeepSeekConnectionOptions, model: string, resolveAccess?: ImageAttachmentAccessResolver): LlmImageRequestPricing;
//# sourceMappingURL=request-pricing.d.ts.map
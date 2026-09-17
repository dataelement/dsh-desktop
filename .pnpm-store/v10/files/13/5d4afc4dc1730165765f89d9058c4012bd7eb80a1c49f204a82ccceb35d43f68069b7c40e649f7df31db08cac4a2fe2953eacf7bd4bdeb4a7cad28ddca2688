/**
 * Harness request-history conversion into pi-ai's Context vocabulary.
 *
 * @module dsh-llm-pi-ai/context
 */
import type { GenerateOptions, ImageAttachmentAccessResolver } from '@deepseek-ai/dsh-llm';
import type { AttachmentStore, ImageRequestPolicy } from '@deepseek-ai/dsh-attachment';
import type { Context as PiContext } from '@earendil-works/pi-ai';
/** Inputs that bind deterministic request images to one current tool execution world. */
export interface PiImageRequestContext {
    /** Durable provider that resolves request-image bytes and provider-owned host objects. */
    attachments: AttachmentStore;
    /** Resolve current tool access separately from deterministic request-image versions. */
    resolveImageAccess: ImageAttachmentAccessResolver;
    /** Request-level bound on base64-encoded image payload; omission leaves every image in place. */
    maxRequestImageBytes?: number;
    /** Route pixel and raw encoded-byte budgets. */
    requestImagePolicy?: ImageRequestPolicy;
}
/**
 * Convert text-only harness history to a synchronous pi-ai Context. Tool
 * result names are recovered from preceding assistant tool calls.
 * @param options - the harness request; `options.system`, else a leading `system` message, maps to pi-ai's single `systemPrompt` slot.
 * @param images - absent; selects the synchronous conversion.
 * @param onReplayDegrade - forwarded to {@link toPiAssistant} for each assistant message.
 * @returns the pi-ai context; `tools` is omitted when the request declares none.
 * @throws {LlmError} `UNSUPPORTED_CONTENT` for images in any history role, including a leading system message.
 */
export declare function toPiContext(options: GenerateOptions, images?: undefined, onReplayDegrade?: (reason: string) => void): PiContext;
/**
 * Convert harness history to a pi-ai Context while resolving durable images.
 * Tool result names are recovered from preceding assistant tool calls. When
 * the accumulated base64 image payload exceeds `maxRequestImageBytes`, the
 * oldest images are replaced by text placeholders until the request fits, so
 * an image-heavy session keeps clearing gateway request-size caps.
 * @param options - the harness request; `options.system`, else a leading `system` message, maps to pi-ai's single `systemPrompt` slot.
 * @param images - attachment provider, current path resolver, and request limits.
 * @param onReplayDegrade - forwarded to {@link toPiAssistant} for each assistant message.
 * @returns the asynchronously resolved pi-ai context.
 */
export declare function toPiContext(options: GenerateOptions, images: PiImageRequestContext, onReplayDegrade?: (reason: string) => void): Promise<PiContext>;
//# sourceMappingURL=context.d.ts.map
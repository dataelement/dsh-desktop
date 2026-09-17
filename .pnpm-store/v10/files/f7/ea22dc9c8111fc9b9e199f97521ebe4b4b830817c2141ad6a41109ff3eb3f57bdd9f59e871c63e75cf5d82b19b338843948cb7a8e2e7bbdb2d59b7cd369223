/**
 * Serialize harness messages into DeepSeek chat completions. Text-only
 * requests retain string user content; the image path resolves durable
 * attachments into ordered file-id or inline parts. Tool-result images follow their
 * string-only tool messages in a separate user message.
 * @module dsh-llm-deepseek/serialize
 */
import type { ContentBlock, GenerateOptions, ImageAttachmentAccessResolver, Message } from '@deepseek-ai/dsh-llm';
import type { ImageAttachmentRef, RequestImageAttachment } from '@deepseek-ai/dsh-attachment';
import type { WireMessage, WireRequest } from './types.ts';
/** Adapter-level request defaults (from plugin config). */
export interface RequestDefaults {
    thinking?: 'enabled' | 'disabled' | undefined;
    reasoningEffort?: 'off' | 'low' | 'high' | 'max' | undefined;
}
/** Provider representation for every retained image in one request. */
export type ImageRequestRepresentation = {
    kind: 'file';
    /** Resolve a retained request version to a reusable DeepSeek file id. */
    resolveFileId: (version: RequestImageAttachment, block: Extract<ContentBlock, {
        type: 'image';
    }>, location: ImageWireLocation) => Promise<string>;
} | {
    kind: 'base64';
};
/** Dependencies required only when the request contains image input. */
export interface ImageSerializationOptions {
    /** One representation used for every retained image in this request. */
    representation: ImageRequestRepresentation;
    /** Request versions prepared for the conservatively retained normalized attachments, keyed by attachment id. */
    requestImages: ReadonlyMap<ImageAttachmentRef['attachmentId'], RequestImageAttachment>;
    /** Resolve current tool access independently from deterministic request-image versions. */
    resolveImageAccess?: ImageAttachmentAccessResolver;
    /** Positive bound on accumulated represented image bytes. */
    maxRequestImageBytes: number;
    /** Maximum represented images in one request. */
    maxImagesPerRequest?: number;
    /** Represented-byte removal step applied after the request exceeds its byte bound. */
    byteQuantum?: number;
    /** Image-count removal step applied after the request exceeds its count bound. */
    countQuantum?: number;
}
/** Durable message and image ordinal used in provider diagnostics. */
export interface ImageWireLocation {
    message: number;
    image: number;
}
/**
 * Serialize the conversation. `tool-result` blocks become standalone
 * `{role: 'tool'}` messages; the harness puts each tool result in its own
 * user-role message, so a mixed user message contributes its text first and
 * its tool results as separate wire messages after.
 * @param messages - the harness conversation, in order.
 * @returns the wire messages; order preserved, each tool result expanded into its own entry.
 */
export declare function serializeMessages(messages: Message[]): WireMessage[];
/**
 * Serialize image-capable history after resolving durable attachments.
 * Consecutive tool results keep string `tool` messages and share one following
 * user message containing their images.
 * @param messages - transient request history after request-size offloading.
 * @param images - prepared request versions, one provider representation, and its budget.
 * @returns ordered DeepSeek wire messages.
 */
export declare function serializeMessagesWithImages(messages: readonly Message[], images: ImageSerializationOptions): Promise<WireMessage[]>;
/**
 * Build the full wire request. Always streaming (`stream: true`, usage
 * reporting on); optional fields are omitted rather than sent as null, so
 * provider defaults apply.
 * @param options - the harness request (model, history, system, tools, sampling).
 * @param defaults - adapter-level thinking defaults; undefined fields put nothing on the wire.
 * @returns the chat-completions request body.
 */
export declare function serializeRequest(options: GenerateOptions, defaults?: RequestDefaults): WireRequest;
/**
 * Build one image-capable request while keeping durable bytes out of session
 * messages. Oversized oldest images become per-image text after their
 * exact request-version byte lengths are known and before provider serialization.
 * @param options - harness request containing image-capable user content.
 * @param images - request versions, optional current access resolver, and request bounds.
 * @param defaults - adapter-level thinking defaults.
 * @returns the fully materialized DeepSeek request body.
 */
export declare function serializeRequestWithImages(options: GenerateOptions, images: ImageSerializationOptions, defaults?: RequestDefaults): Promise<WireRequest>;
//# sourceMappingURL=serialize.d.ts.map
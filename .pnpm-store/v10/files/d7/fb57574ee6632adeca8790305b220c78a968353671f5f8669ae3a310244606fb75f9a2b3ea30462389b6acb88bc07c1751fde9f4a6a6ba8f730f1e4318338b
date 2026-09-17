/** Pure image-card derivation from raw result content and metadata. @module */
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { ToolCallBlock } from './tool-call-model.ts';
/**
 * The image-card material one settled call contributes: the display label plus
 * the durable references the attachment slot renders as a gallery.
 *
 * The bytes are not here. `attachmentId` is opaque and provider-owned, so a UI
 * resolves it to a session-authorized URL at render time; this model never parses
 * it nor derives a path from it.
 */
export interface ImageCardModel {
    /** Card label: the read path, shortened the way every other card's is. */
    label: string;
    /** The durable images this result returned, in result order. */
    images: readonly {
        readonly attachment: ImageAttachmentRef;
    }[];
    /**
     * The model-facing envelope text, for the line under the gallery.
     *
     * Taken from the result's own text block rather than the row's flattened
     * result text: an image read's content is `[text envelope, image block]`, and
     * flattening JSON.stringifies the image block, which would print the raw
     * attachment object under the picture — the symptom this card exists to remove.
     */
    text: string;
}
/**
 * Derive a settled image card after validating the call head, persisted
 * metadata (or its argument fallback), and the model-facing image envelope.
 *
 * The card is result-side only: a call carries no content until `execute`
 * returns, so a running `read_image` has none and this returns null for it.
 * Both root and nested calls settle as ToolResultNode; the nested one (a
 * read_image dispatched from inside run_code) persists no presentationMeta, so
 * its label falls back to the call's own `file_path` argument.
 * @param block - running or settled Tool block.
 * @param sessionCwd - the session workspace root; a workspace-rooted absolute
 *   path label displays relative to it. Absent leaves the path as authored.
 * @param home - host account home; a leftover POSIX home path displays as `~`.
 * @returns the image-card props, or null for the generic path.
 */
export declare function imageCardModel(block: ToolCallBlock, sessionCwd?: string, home?: string): ImageCardModel | null;
//# sourceMappingURL=image-card-model.d.ts.map
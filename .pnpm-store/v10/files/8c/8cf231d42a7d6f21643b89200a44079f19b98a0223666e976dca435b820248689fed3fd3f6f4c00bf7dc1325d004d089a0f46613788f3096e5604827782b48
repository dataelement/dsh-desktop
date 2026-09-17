/** Attachment error and limit copy owned by the conversation input flow. */
import type { ImageAttachmentLimits } from '@deepseek-ai/dsh-attachment';
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots';
import type { ConversationKey } from './locales.ts';
/**
 * Byte count as user-facing megabytes (`10MB`, `2.5MB`).
 * @param bytes - the byte count.
 * @returns the rounded megabyte text.
 */
export declare function imageSizeText(bytes: number): string;
/**
 * Product copy for a host attachment rejection (the `details.reason` of
 * `session/attachment-invalid` or `subagent/attachment-invalid`).
 * User-solvable reasons name the limit and the way out;
 * reasons the user cannot act on fold into one send-failed line carrying the
 * reason code for a bug report.
 * @param t - the conversation-namespace translate.
 * @param reason - the wire `details.reason` code.
 * @param limits - projected limits interpolated into count/size copy, when known.
 * @returns the banner text.
 */
export declare function attachmentErrorText(t: Translate<ConversationKey>, reason: string, limits?: ImageAttachmentLimits): string;
//# sourceMappingURL=image-labels.d.ts.map
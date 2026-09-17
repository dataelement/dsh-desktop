import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { ImageLightboxLabels } from './ImageLightbox.tsx';
/** Loads a session-authorized durable image URL and may expose a cached URL synchronously. */
export type ImageLoader = ((attachment: ImageAttachmentRef) => Promise<string>) & {
    peek?: (attachment: ImageAttachmentRef) => string | undefined;
};
/** One gallery entry: a durable admitted reference, or a submission echo's local preview. */
export type MessageImageSpec = {
    readonly attachment: ImageAttachmentRef;
} | {
    readonly preview: {
        readonly url: string;
        readonly name?: string;
        readonly width?: number;
        readonly height?: number;
    };
};
/** Message-image strings the owner resolves from its own locale namespace. */
export interface MessageImageLabels {
    /** Fallback display name for an unnamed image. */
    image: string;
    /** Thumbnail tooltip inviting the original-image preview. */
    open: string;
    /** Accessible thumbnail label; receives the image's display name. */
    openNamed: (label: string) => string;
    /** Loading placeholder shown until bytes resolve. */
    loading: string;
    /** Retry-control label shown when the load fails. */
    loadFailed: string;
    /** Lightbox strings forwarded to the opened preview. */
    lightbox: ImageLightboxLabels;
}
/**
 * Compact history renderer with retryable loading and click-to-open original
 * preview. A lone image renders at its `singleFit` size; an image among
 * several renders as a fixed 64px square tile. The preview arm displays its
 * local URL directly — no loader round-trip, no failure/retry surface.
 *
 * @param props.image - the durable reference to load, or the local preview to display.
 * @param props.load - session-authorized URL loader for the durable arm.
 * @param props.variant - `single` for a message's lone image, `tile` otherwise.
 * @param props.labels - resolved strings (tooltip, loading, retry, lightbox).
 * @returns the bounded thumbnail button, or the retry control on failure.
 */
export declare function MessageImage({ image, load, variant, labels }: {
    image: MessageImageSpec;
    load: ImageLoader;
    variant: 'single' | 'tile';
    labels: MessageImageLabels;
}): import("react").JSX.Element;
/** Wrapping image group shared by user and assistant history: a lone image
 * renders large unless its owning mixed-attachment row requests compact tiles. */
export declare function ImageGallery({ images, load, align, compact, labels }: {
    images: readonly MessageImageSpec[];
    load: ImageLoader;
    align: 'start' | 'end';
    compact?: boolean;
    labels: MessageImageLabels;
}): import("react").JSX.Element | null;
//# sourceMappingURL=MessageImage.d.ts.map
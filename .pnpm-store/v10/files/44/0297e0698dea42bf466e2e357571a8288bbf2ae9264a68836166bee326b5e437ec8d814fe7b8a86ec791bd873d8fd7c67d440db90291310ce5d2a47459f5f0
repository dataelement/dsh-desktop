/** Complete image bytes rendered at their intrinsic CSS-pixel dimensions. */
import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { DocumentPreviewProps } from '../document/contract.ts';
declare const IMAGE_MEDIA_TYPES: {
    readonly png: "image/png";
    readonly jpg: "image/jpeg";
    readonly jpeg: "image/jpeg";
    readonly gif: "image/gif";
    readonly webp: "image/webp";
    readonly bmp: "image/bmp";
    readonly ico: "image/x-icon";
    readonly svg: "image/svg+xml";
};
type ImageMediaType = typeof IMAGE_MEDIA_TYPES[keyof typeof IMAGE_MEDIA_TYPES];
/** Standard document props plus the image renderer's dictionary. */
export type ImageBodyProps = DocumentPreviewProps & PropsLocale<'sidebarImage'>;
/**
 * Resolve a supported filename to the media type assigned to its Blob.
 * @param path - decoded workspace file path.
 * @returns the image media type, or undefined for an unregistered suffix.
 */
export declare function imageMediaType(path: string): ImageMediaType | undefined;
/**
 * Present complete image bytes without fitting or scaling them to the pane.
 * @param props - document bytes, resource identity, and locale.
 * @returns an intrinsic-size image whose containing document body provides scrolling.
 */
export declare function ImageBody({ content, resourceAddress, t }: ImageBodyProps): ReactNode;
export {};
//# sourceMappingURL=ImageBody.d.ts.map
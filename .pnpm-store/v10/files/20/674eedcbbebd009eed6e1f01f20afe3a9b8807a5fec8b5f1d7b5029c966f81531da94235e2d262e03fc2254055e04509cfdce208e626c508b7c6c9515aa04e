/** Builtin image metadata and keyed document-body registration. */
import type { Context } from '@deepseek-ai/cordis';
import type { DocumentPreviewDefinition } from '../document/registry.ts';
/** Image implementation identity, shared by metadata and the keyed slot. */
export declare const IMAGE_BODY_ID = "@deepseek-ai/dsh-client-ui-sidebar-documentpreview/image";
/** File suffixes rendered by the builtin image body. */
export declare const IMAGE_EXTENSIONS: readonly ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg"];
/**
 * Describe the builtin image renderer independently from its keyed body slot.
 * @param title - locale-owned implementation name.
 * @returns metadata for complete image files.
 */
export declare function imageBodyDefinition(title: () => string): DocumentPreviewDefinition;
/**
 * Register the image dictionary, metadata, and body with reversible effects.
 * @param ctx - owning plugin context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map
/**
 * Leading category glyph for clickable artifact links (anchors, file
 * mentions, produced-file chips). One component keyed by link category;
 * every glyph renders fill="currentColor" and so rides the link's own
 * color. Glyphs stay private to this module: the public surface is the
 * category vocabulary, not the individual glyph components, so consumers
 * cannot compose a glyph outside a link. Design sources:
 * ic_globe_language_outline_20, ic_code_outline_20, ic_folder_outline_20,
 * ic_photo_outline_20, ic_paper_doc_outline_20, ic_paper_outline_20.
 */
import type { ReactNode } from 'react';
import type { IconProps } from './icons/props.ts';
/**
 * Link categories with distinct leading glyphs. `url` and `folder` are
 * destination categories the consumer states directly; the rest are file
 * categories `classifyLinkPath` derives from a path. Code, web, and data
 * files share the `code` glyph by design.
 */
export type LinkIconKind = 'url' | 'folder' | 'code' | 'image' | 'document' | 'other';
/** Props for {@link LinkIcon}: the category plus the shared icon sizing seat. */
export interface LinkIconProps extends IconProps {
    kind: LinkIconKind;
}
/**
 * Derive a file path's link-icon category from its extension. Unknown and
 * missing extensions fall to `other` (the plain-paper glyph).
 * @param path - File path as the producing tool spelled it (either separator).
 * @returns The file's glyph category; never `url` or `folder`.
 */
export declare function classifyLinkPath(path: string): LinkIconKind;
/**
 * Render the leading glyph for one clickable artifact link.
 * @param props - The link category, optional size (default 14px — the inline
 * link text size these glyphs sit beside), and optional CSS class.
 * @returns The category's SVG glyph, riding currentColor.
 */
export declare function LinkIcon({ kind, size, className }: LinkIconProps): ReactNode;
//# sourceMappingURL=LinkIcon.d.ts.map
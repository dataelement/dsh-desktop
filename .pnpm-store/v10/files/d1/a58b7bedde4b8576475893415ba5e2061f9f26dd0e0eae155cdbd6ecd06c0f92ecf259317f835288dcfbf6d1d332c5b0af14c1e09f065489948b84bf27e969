import type { ReactNode } from 'react';
import { type CodeFileType, type FileTypeProjectContext } from './code-file-types.ts';
import type { IconProps } from './icons/props.ts';
/** File categories with distinct 28px glyphs. */
export type FileType = CodeFileType | 'code' | 'excel' | 'folder' | 'html' | 'image' | 'markdown' | 'other' | 'pdf' | 'ppt' | 'video' | 'word';
/** Compatibility name for consumers that pass an already resolved category. */
export type FileTypeKind = FileType;
type ClassifiedFileType = Exclude<FileType, 'folder'>;
export type { CodeFileType, FileTypeProjectContext } from './code-file-types.ts';
/** Props for {@link FileTypeIcon}: either a path to classify or an already resolved kind. */
export type FileTypeIconProps = IconProps & ({
    /** File path or name to classify. */
    readonly path: string;
    /** Optional project-file snapshot for context-sensitive code icons such as Flutter. */
    readonly context?: FileTypeProjectContext | undefined;
} | {
    /** Explicit category for callers that already resolved the file type. */
    readonly kind: FileTypeKind;
});
/**
 * Extract the final suffix from a file path without changing its case.
 * A leading dot starts a suffix, while a missing or trailing dot returns an empty string.
 * @param path - File path or basename using either path separator.
 * @returns The characters after the basename's final dot.
 */
export declare function fileExtension(path: string): string;
/**
 * Classify a file path or name for file-card presentation.
 * Matching is case-insensitive and applies code filename rules before extension rules;
 * unknown names fall back to `other`.
 * @param path - File path or basename using either path separator.
 * @param context - Optional project files used by context-sensitive code mappings.
 * @returns The file's closed presentation category.
 */
export declare function classifyFileType(path: string, context?: FileTypeProjectContext): ClassifiedFileType;
/**
 * Render a decorative file-type glyph for a path or an explicitly resolved kind.
 * @param props - Path or kind selection, optional project context, size, and CSS class.
 * @returns The category-colored SVG; the caller owns the accessible name and may override
 * the color through `--dsh-file-type-icon-color`.
 */
export declare function FileTypeIcon(props: FileTypeIconProps): ReactNode;
//# sourceMappingURL=FileTypeIcon.d.ts.map
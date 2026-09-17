/**
 * PPTX zip archive parser.
 * Extracts and categorizes all files from a .pptx (which is a zip archive).
 */
import type { MediaResolver } from '../utils/media';
export interface PptxFiles {
    contentTypes: string;
    presentation: string;
    presentationRels: string;
    slides: Map<string, string>;
    slideRels: Map<string, string>;
    slideLayouts: Map<string, string>;
    slideLayoutRels: Map<string, string>;
    slideMasters: Map<string, string>;
    slideMasterRels: Map<string, string>;
    themes: Map<string, string>;
    themeOverrides?: Map<string, string>;
    media: Map<string, Uint8Array>;
    mediaResolver?: MediaResolver;
    tableStyles?: string;
    charts: Map<string, string>;
    chartRels?: Map<string, string>;
    chartStyles: Map<string, string>;
    chartColors: Map<string, string>;
    diagramDrawings: Map<string, string>;
}
export interface ZipParseLimits {
    /** Maximum number of non-directory entries in the zip archive. */
    maxEntries?: number;
    /** Maximum uncompressed size for any single entry (bytes). */
    maxEntryUncompressedBytes?: number;
    /** Maximum total uncompressed size across all entries (bytes). */
    maxTotalUncompressedBytes?: number;
    /** Maximum uncompressed size across media entries under `ppt/media/` (bytes). */
    maxMediaBytes?: number;
    /** Maximum concurrent zip entry reads during parsing. */
    maxConcurrency?: number;
}
export declare const RECOMMENDED_ZIP_LIMITS: Readonly<{
    maxEntries: 4000;
    maxEntryUncompressedBytes: number;
    maxTotalUncompressedBytes: number;
    maxMediaBytes: number;
    maxConcurrency: 8;
}>;
/**
 * Parse a .pptx file buffer and extract all relevant files, categorized by type.
 */
export declare function parseZip(buffer: ArrayBuffer, limits?: ZipParseLimits): Promise<PptxFiles>;
/**
 * Parse a .pptx file while indexing media entries for on-demand decoding.
 *
 * This preserves the same XML categorisation as parseZip(), but leaves
 * PptxFiles.media empty until mediaResolver.resolve(target) is called.
 */
export declare function parseZipLazyMedia(buffer: ArrayBuffer, limits?: ZipParseLimits): Promise<PptxFiles>;

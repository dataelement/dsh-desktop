/**
 * Media utilities — MIME type detection, path resolution, and blob URL management.
 */
export interface ResolvedMedia {
    mediaPath: string;
    data: Uint8Array;
}
export interface MediaResolver {
    resolve(target: string): Promise<ResolvedMedia | undefined>;
    readonly loadedBytes?: number;
    readonly loadedCount?: number;
    readonly totalBytes?: number;
    readonly totalCount?: number;
}
/**
 * Determine MIME type from file extension.
 * Covers images, video, and audio formats used in PPTX files.
 */
export declare function getMimeType(path: string): string;
/**
 * Resolve a relative media path (from rels) to its canonical path in PptxFiles.media.
 * Rels targets are relative like "../media/image1.png".
 * Media paths in PptxFiles are like "ppt/media/image1.png".
 */
export declare function resolveMediaPath(target: string): string;
/**
 * Return canonical media-path candidates for a relationship target.
 *
 * OOXML relationship targets are URI references, so `%20` normally means a
 * literal space in the part name. Some producers/tests, however, keep the
 * percent-encoded bytes in the ZIP entry name. Prefer the decoded OPC form but
 * keep the raw basename as a compatibility fallback.
 */
export declare function resolveMediaPathCandidates(target: string): string[];
export declare function findMediaByTarget(target: string, media: Map<string, Uint8Array>): ResolvedMedia | undefined;
export declare function findMediaByTargetAsync(target: string, media: Map<string, Uint8Array>, resolver?: MediaResolver): Promise<ResolvedMedia | undefined>;
/**
 * Get or create a blob URL for a media file, using a cache to avoid duplicates.
 *
 * @param mediaPath - Canonical path (e.g. "ppt/media/image1.png")
 * @param data - Raw media data (Uint8Array or ArrayBuffer)
 * @param cache - Map to store/retrieve cached blob URLs
 * @returns The blob URL string
 */
export declare function getOrCreateBlobUrl(mediaPath: string, data: Uint8Array | ArrayBuffer, cache: Map<string, string>): string;

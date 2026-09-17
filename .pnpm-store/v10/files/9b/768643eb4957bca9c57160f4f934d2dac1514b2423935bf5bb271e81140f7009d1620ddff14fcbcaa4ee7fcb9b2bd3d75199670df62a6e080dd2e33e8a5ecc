import { BlockMapDataHolder } from "builder-util-runtime";
export type CompressionFormat = "deflate" | "gzip";
/**
 * Build a content-defined block map for `inFile` using Rabin fingerprinting.
 *
 * Files are processed via streaming (peak memory ≈ RABIN_MAX = 32 KB per chunk,
 * not the full file size), making this safe for large installers.
 *
 * - If `outFile` is omitted: compressed blockmap is appended to `inFile`
 *   (used for NSIS web installer / AppImage embed); `blockMapSize` is returned.
 * - If `outFile` is provided: compressed blockmap is written to that file;
 *   `blockMapSize` is not included in the result.
 *
 * Returned `sha512` is SHA-512 of the full file as it exists after the call.
 */
export declare function buildBlockMap(inFile: string, compressionFormat: CompressionFormat, outFile?: string): Promise<BlockMapDataHolder>;

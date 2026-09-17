/**
 * UUID minting that works in every JavaScript context this repository ships
 * to. `crypto.randomUUID` is a secure-context Web API — a page or worker
 * served over plain HTTP on a LAN address has no such method — while
 * `crypto.getRandomValues` is unrestricted everywhere (browsers, workers,
 * Node ≥ 19). One implementation here replaces per-caller polyfills; the
 * `no-restricted-properties` lint rule points `crypto.randomUUID` callers at
 * this module.
 * @module @deepseek-ai/dsh-util-crypto
 */
/** RFC 9562 UUID string, the shape `crypto.randomUUID` declares. */
export type Uuid = `${string}-${string}-${string}-${string}-${string}`;
/**
 * Encode bytes as canonical base64 without overflowing function argument limits.
 * @param data - Bytes to encode.
 * @returns base64 text.
 */
export declare function bytesToBase64(data: Uint8Array): string;
/**
 * Random v4 UUID, minted from `crypto.getRandomValues`.
 * @returns the UUID string.
 */
export declare function randomUUID(): Uuid;
//# sourceMappingURL=index.d.ts.map
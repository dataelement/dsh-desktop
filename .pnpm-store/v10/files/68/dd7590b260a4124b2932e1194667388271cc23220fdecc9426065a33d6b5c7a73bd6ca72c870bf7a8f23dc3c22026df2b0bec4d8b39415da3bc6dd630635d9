/**
 * DeepSeek v4 vision-token accounting: the provider's published image-token
 * calculator (api-docs.deepseek.com, Token & Token Usage) ported verbatim.
 * The provider resizes every request image onto a 14px-patch grid, downsamples
 * 3:1 per axis, and caps one image at 384 tokens; the port prices the
 * pad-to-4 alignment at its 3-token upper bound because request pricing has
 * no preceding-token position. Actual usage remains authoritative.
 *
 * @module dsh-llm-deepseek/image-tokens
 */
/**
 * Vision tokens DeepSeek v4 charges for one request image of the given
 * dimensions, at the worst-case alignment pad.
 * @param width - positive integer request-image width in pixels.
 * @param height - positive integer request-image height in pixels.
 * @returns the provider vision-token price, at most 384.
 */
export declare function deepSeekImageTokens(width: number, height: number): number;
//# sourceMappingURL=image-tokens.d.ts.map
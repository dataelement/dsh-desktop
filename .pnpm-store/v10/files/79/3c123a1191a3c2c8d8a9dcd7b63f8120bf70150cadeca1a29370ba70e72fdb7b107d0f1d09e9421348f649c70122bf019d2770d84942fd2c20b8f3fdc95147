import type { ChatViewSlotProps } from '../contract/slots.ts';
/**
 * Compact token count: 517 / 12.2K / 517K / 1.2M.
 * @param value - non-negative token count.
 * @param t - Chat locale seat.
 * @returns locale-owned compact display string.
 */
export declare function formatTokens(value: number, t: ChatViewSlotProps['t']): string;
/**
 * Exact integer token count with locale-owned digit grouping.
 * @param value - non-negative safe integer token count.
 * @param t - Chat locale seat.
 * @returns an unrounded display string.
 */
export declare function formatExactTokens(value: number, t: ChatViewSlotProps['t']): string;
/**
 * Display-ready cache-hit share without rounding a partial hit to 100%.
 * @param cacheReadTokens - exact prompt tokens served from cache.
 * @param promptTokens - exact aggregate prompt tokens.
 * @param decimalPlaces - ordinary-ratio precision; partial hits that would
 * round to 100 automatically use enough additional precision to stay honest.
 * @returns percentage text, or null when there was no prompt input.
 */
export declare function formatCacheHitPercent(cacheReadTokens: number, promptTokens: number, decimalPlaces?: 0 | 1): string | null;
//# sourceMappingURL=token-format.d.ts.map
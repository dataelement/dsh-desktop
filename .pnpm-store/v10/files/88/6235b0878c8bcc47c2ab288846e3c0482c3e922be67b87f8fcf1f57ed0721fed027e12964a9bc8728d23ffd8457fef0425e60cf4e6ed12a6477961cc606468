/** Pure search-card derivation from raw grep/glob result metadata. @module */
import type { SearchBlockProps } from '@deepseek-ai/dsh-client-ui-primitives';
import type { ToolCallBlock } from './tool-call-model.ts';
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
/** The {@link SearchBlockProps} union minus each render site's own fields. */
type SearchBlockModelProps = DistributiveOmit<SearchBlockProps, 'labels' | 'maxLines' | 'className'>;
/** Result rows retained in a Chat card before its middle collapses. */
export declare const CHAT_SEARCH_MAX_LINES = 8;
/** Search-card props plus an optional locator for a capped full result. */
export interface SearchCardModel {
    /** Props consumed by {@link SearchBlock}. */
    card: SearchBlockModelProps;
    /** Raw result text containing the full-result locator for a capped search. */
    recovery: string | undefined;
}
/**
 * Derive a settled root grep/glob card from persisted metadata.
 * @param block - running or settled Tool block.
 * @returns search-card props, or null for the generic path.
 */
export declare function searchCardModel(block: ToolCallBlock): SearchCardModel | null;
export {};
//# sourceMappingURL=search-card-model.d.ts.map
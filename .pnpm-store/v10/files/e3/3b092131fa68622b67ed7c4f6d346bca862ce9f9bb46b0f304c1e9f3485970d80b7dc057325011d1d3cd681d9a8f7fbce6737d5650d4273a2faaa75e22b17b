/** Browser-zone derivation and model-facing policy text for one open request turn. */
import type { UserMessage } from '@deepseek-ai/dsh-llm';
/** Browser-zone facts derived from user-rpc messages in one open turn. */
export type BrowserTimeZoneContext = {
    readonly kind: 'resolved';
    readonly timeZone: string;
} | {
    readonly kind: 'mixed';
    readonly timeZones: readonly string[];
} | {
    readonly kind: 'missing';
};
/**
 * Derive the unique, mixed, or missing browser zone for one open turn.
 * @param messages - Entered and proposed user messages belonging to the turn.
 * @returns Sorted, duplicate-free browser-zone facts.
 * @throws TypeError when a user-rpc source carries an invalid or noncanonical zone.
 */
export declare function deriveBrowserTimeZoneContext(messages: readonly UserMessage[]): BrowserTimeZoneContext;
/**
 * Render the model instruction for one browser-zone context.
 * @param context - Browser-zone facts for the open turn.
 * @returns One durable policy line.
 */
export declare function renderBrowserTimeZoneContext(context: BrowserTimeZoneContext): string;
//# sourceMappingURL=request-zone.d.ts.map
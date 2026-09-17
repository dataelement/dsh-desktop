/** Safari-specific textarea layout recovery for the conversation composer. */
/** Browser identity fields needed to distinguish Safari from other WebKit-based browsers. */
export interface BrowserIdentity {
    readonly userAgent: string;
    readonly vendor: string;
}
/**
 * Detect Safari's `Version/... Safari/...` form while excluding known alternate iOS browser tokens.
 * @param identity - Browser user-agent and vendor values.
 * @returns Whether the identity should use the Safari-specific recovery.
 */
export declare function isSafariBrowser(identity: BrowserIdentity): boolean;
/**
 * Repair Safari's stale native textarea layout and the scrollport auto height it can contaminate.
 * @param input - Composer textarea whose own scrollable overflow must stay zero.
 */
export declare function repairSafariTextareaLayout(input: HTMLTextAreaElement | null): void;
//# sourceMappingURL=safari.d.ts.map
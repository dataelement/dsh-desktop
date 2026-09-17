/** Streaming terminal-control sanitizer for the line-oriented first release. */
/** OSC marker emitted by the controlled bash before each prompt. */
export declare const PROMPT_MARKER_PREFIX = "133;D;";
/** Exact printable prompt emitted after the private marker. */
export declare const CONTROLLED_PROMPT = "dsh> ";
/** One sanitized chunk plus whether it contained the owned prompt marker. */
export interface SanitizedChunk {
    text: string;
    prompt: boolean;
    /** Printable text after the latest owned marker in this chunk. */
    promptTail?: string;
}
/**
 * Remove CSI/OSC/short escape sequences while preserving split-sequence carry.
 * Full terminal emulation is deliberately deferred; ordinary line output and
 * the private prompt marker are the supported contract.
 */
export declare class TerminalSanitizer {
    private readonly maxPendingBytes;
    private pending;
    private discardMode;
    private discardOscEscape;
    private trailingCarriageReturn;
    private trackingPromptTail;
    constructor(maxPendingBytes: number);
    /**
     * Consume one decoded `node-pty` data chunk.
     * @param chunk - decoded terminal data.
     * @returns Printable text and whether the private prompt marker completed.
     */
    push(chunk: string): SanitizedChunk;
    /**
     * Flush a trailing printable fragment when the PTY exits.
     * @returns Remaining printable text; incomplete escapes are discarded.
     */
    flush(): string;
    private normalizeText;
    private enforcePendingBound;
    private discardPrefix;
}
/**
 * Normalize CRLF and standalone carriage returns for line-oriented rendering.
 * @param text - sanitized terminal text.
 * @returns Line-normalized text with BEL removed.
 */
export declare function normalizeTerminalText(text: string): string;
//# sourceMappingURL=sanitize.d.ts.map
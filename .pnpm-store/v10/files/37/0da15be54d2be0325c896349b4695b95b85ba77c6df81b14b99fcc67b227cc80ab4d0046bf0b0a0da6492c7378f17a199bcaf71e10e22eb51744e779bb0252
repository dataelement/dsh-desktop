/** Browser-safe formatting and recognition of persisted spill-policy notices. */
import { type Omitted } from '@deepseek-ai/dsh-output-retention';
import type { SpillRef } from '@deepseek-ai/dsh-spill';
/**
 * Format the notice appended to a retained preview, preserving its persisted spelling.
 * @param omitted - bytes omitted by the retention policy.
 * @param ref - saved text locator and retrieval guidance.
 * @returns the complete notice without a leading preview separator.
 */
export declare function formatSpillNotice(omitted: Omitted, ref: Pick<SpillRef, 'locator' | 'retrievalHint'>): string;
/**
 * Recognize a final spill-policy notice in persisted text, including notice-only output.
 * This identifies the text convention, not authenticated provenance of tool output.
 * @param text - complete recorded text result.
 * @returns whether a complete notice occupies the end of the result.
 */
export declare function hasSpillNotice(text: string): boolean;
//# sourceMappingURL=notice.d.ts.map
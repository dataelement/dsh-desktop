import type { DetectTrigger } from './contract.ts';
/**
 * Detect a trigger token at the caret. `@` first uses the shared grammar,
 * including an open quoted token that may span whitespace. Slash detection
 * scans left to the first whitespace; slashes failing the word boundary are
 * treated as ordinary token chars and the scan continues (URL slashes).
 * Guard tiers: plain = both chars live; claimed = '/' fully suppressed,
 * '@' live; frozen = none.
 *
 * @param draft - Full draft text.
 * @param caret - Caret offset into `draft`.
 * @param guard - Availability tier derived from the input phase.
 * @returns The hit with `query` = trigger-to-caret slice and `span` =
 * `{start: triggerIndex, end: caret}`; `span.draftRev` is a placeholder `0`
 * — the calling shell stamps the real revision. Null when no trigger is
 * live at the caret.
 */
export declare const detectTrigger: DetectTrigger;
//# sourceMappingURL=detect.d.ts.map
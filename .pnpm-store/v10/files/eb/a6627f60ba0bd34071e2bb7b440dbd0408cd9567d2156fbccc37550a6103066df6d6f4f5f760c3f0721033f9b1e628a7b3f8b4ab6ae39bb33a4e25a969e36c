/**
 * Compact relative-time bucketing shared by every surface that dates a
 * session. Bucketing is here so two surfaces naming the same session agree;
 * the words stay in each plugin's own dictionary, per locale-owned copy.
 *
 * @module @deepseek-ai/dsh-client-ui-primitives/relative-time
 */
/** Relative-time bucket of a dated row's trailing label. */
export type RelativeTimeUnit = 'now' | 'minutes' | 'hours' | 'days' | 'months' | 'years';
/** Structured relative time: the bucket plus its magnitude (0 for 'now'). */
export interface RelativeTime {
    unit: RelativeTimeUnit;
    n: number;
}
/**
 * Compact relative time, as a structured bucket the renderer localizes
 * ("now"/"5min"/"3h"/"2d"/"4mo"/"1y" in en).
 * @param at - epoch ms of the dated moment.
 * @param now - current epoch ms (injected for pure rendering).
 * @returns the row's trailing time bucket and magnitude.
 */
export declare function relativeTime(at: number, now: number): RelativeTime;
//# sourceMappingURL=relative-time.d.ts.map
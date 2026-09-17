/** ISO-shaped time-context timestamp formatting shared by production and replay validation. */
/**
 * Create the exact formatter used by durable time-context readings.
 * @param timeZone - Explicit display zone, or `undefined` for the process fallback.
 * @returns A formatter with stable numeric local fields and long numeric offset.
 */
export declare function createTimestampFormatter(timeZone?: string): Intl.DateTimeFormat;
/**
 * Format an epoch millisecond value as an ISO-shaped timestamp with offset and IANA zone.
 * @param now - Epoch milliseconds to display.
 * @param formatter - Formatter created for `timeZone`.
 * @param timeZone - Canonical zone label carried in brackets.
 * @returns The durable timestamp text.
 */
export declare function formatTimestamp(now: number, formatter: Intl.DateTimeFormat, timeZone: string): string;
//# sourceMappingURL=timestamp.d.ts.map
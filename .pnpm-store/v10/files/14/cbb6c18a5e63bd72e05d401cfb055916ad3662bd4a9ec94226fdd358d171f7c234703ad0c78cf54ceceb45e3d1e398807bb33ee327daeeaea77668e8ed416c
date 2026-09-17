/**
 * Repairs malformed JSON string literals by:
 * - escaping raw control characters inside strings
 * - doubling backslashes before invalid escape characters
 */
export declare function repairJson(json: string): string;
export declare function parseJsonWithRepair<T>(json: string): T;
/**
 * Attempts to parse potentially incomplete JSON during streaming.
 * Always returns a valid object, even if the JSON is incomplete.
 *
 * @param partialJson The partial JSON string from streaming
 * @returns Parsed object or empty object if parsing fails
 */
export declare function parseStreamingJson<T = Record<string, unknown>>(partialJson: string | undefined): T;
//# sourceMappingURL=json-parse.d.ts.map
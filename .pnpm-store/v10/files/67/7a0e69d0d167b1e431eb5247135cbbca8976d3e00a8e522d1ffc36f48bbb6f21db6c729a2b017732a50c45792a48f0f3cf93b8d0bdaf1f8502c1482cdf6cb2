/**
 * Time vocabulary shared by the wire boundaries that accept a caller's zone.
 * Validation and canonicalization only: this library formats nothing and owns
 * no failure vocabulary — each boundary declares and throws its own refusal.
 * @module @deepseek-ai/dsh-util-time
 */
/**
 * Validate and canonicalize one caller-supplied IANA zone at a wire boundary.
 *
 * The canonical name is what a later reader needs: a zone identity is stored on
 * durable records and resolved again by another process, so an alias accepted
 * here would not compare equal to the zone a reader derives.
 * @param value - the caller's reported zone name.
 * @returns the canonical zone, or `undefined` when the name is unusable.
 */
export declare function canonicalClientTimeZone(value: string): string | undefined;
//# sourceMappingURL=index.d.ts.map
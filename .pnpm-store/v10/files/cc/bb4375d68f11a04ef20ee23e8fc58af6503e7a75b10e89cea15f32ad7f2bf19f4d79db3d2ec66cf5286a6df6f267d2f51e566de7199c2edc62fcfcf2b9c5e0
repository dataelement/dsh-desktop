//#region lib/types/index.js
/**
* Duplicate-install-safe nominal primitive helpers.
*
* A brand makes structurally identical strings or numbers non-interchangeable
* at the type level: a `SessionId` cannot be passed where a `ToolCallId` is
* expected, and an event sequence cannot be passed as a log offset. Comparison,
* logging, and serialization retain the underlying primitive behavior.
*
* This package owns no concrete domain value and keeps no runtime identity or mutable
* state, so independently installed copies produce interchangeable values.
*
* @module @deepseek-ai/dsh-brand
*/
/**
* Apply a compile-time string brand without changing the value.
* @param value - string admitted by the domain that owns the target brand.
* @returns the same string with the requested compile-time brand.
*/
function brandString(value) {
	return value;
}
/**
* Apply a compile-time number brand without changing the value.
* @param value - number admitted by the domain that owns the target brand.
* @returns the same number with the requested compile-time brand.
*/
function brandNumber(value) {
	return value;
}
//#endregion
export { brandNumber, brandString };

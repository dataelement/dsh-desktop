//#region lib/types/index.js
/**
* UUID minting that works in every JavaScript context this repository ships
* to. `crypto.randomUUID` is a secure-context Web API — a page or worker
* served over plain HTTP on a LAN address has no such method — while
* `crypto.getRandomValues` is unrestricted everywhere (browsers, workers,
* Node ≥ 19). One implementation here replaces per-caller polyfills; the
* `no-restricted-properties` lint rule points `crypto.randomUUID` callers at
* this module.
* @module @deepseek-ai/dsh-util-crypto
*/
/**
* Encode bytes as canonical base64 without overflowing function argument limits.
* @param data - Bytes to encode.
* @returns base64 text.
*/
function bytesToBase64(data) {
	let binary = "";
	const chunk = 32768;
	for (let offset = 0; offset < data.length; offset += chunk) binary += String.fromCharCode(...data.subarray(offset, offset + chunk));
	return btoa(binary);
}
/**
* Random v4 UUID, minted from `crypto.getRandomValues`.
* @returns the UUID string.
*/
function randomUUID() {
	const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
	const hex = Array.from(bytes, (byte, index) => {
		return (index === 6 ? byte & 15 | 64 : index === 8 ? byte & 63 | 128 : byte).toString(16).padStart(2, "0");
	}).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
//#endregion
export { bytesToBase64, randomUUID };

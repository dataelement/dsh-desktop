import type { SessionFormatHeader, SessionFormatJsonValue } from './types.ts';
/**
 * Test whether a value is a non-null, non-array object.
 * @param value - candidate value.
 * @returns whether the value is an object record.
 */
export declare function isSessionFormatJsonObject(value: unknown): value is Record<string, unknown>;
/**
 * Require a non-negative safe integer without the JSON-unstable negative zero.
 * @param value - candidate count.
 * @param label - diagnostic subject.
 * @returns validated count.
 */
export declare function sessionFormatCount(value: unknown, label: string): number;
/**
 * Require a safe integer without the JSON-unstable negative zero.
 * @param value - candidate integer.
 * @param label - diagnostic subject.
 * @returns validated integer.
 */
export declare function sessionFormatSafeInteger(value: unknown, label: string): number;
/**
 * Require a non-negative integral format version.
 * @param value - candidate version.
 * @param label - diagnostic subject.
 * @returns validated version.
 */
export declare function sessionFormatVersion(value: unknown, label?: string): number;
/**
 * Read only the version required for directional dispatch.
 * @param headerValue - untrusted physical header value.
 * @returns validated stored version.
 */
export declare function inspectSessionFormatVersion(headerValue: unknown): number;
/**
 * Detach and deeply freeze a caller-supplied lossless JSON value.
 * @param value - borrowed candidate.
 * @param label - diagnostic subject.
 * @returns an immutable detached JSON snapshot.
 */
export declare function snapshotSessionFormatJson(value: unknown, label?: string): SessionFormatJsonValue;
/**
 * Snapshot one logical header without inspecting an event body.
 * @param header - borrowed logical header.
 * @param label - diagnostic subject.
 * @returns immutable detached header.
 */
export declare function snapshotSessionFormatHeader(header: SessionFormatHeader, label?: string): SessionFormatHeader;
//# sourceMappingURL=json.d.ts.map
/** Audited V2 migration admission and V3 payload validation, independent of installed core Session types. */
import type { SessionFormatEvent, SessionFormatJsonObject, SessionFormatJsonValue } from '@deepseek-ai/dsh-session-format';
/** Audited surface event names; all other admitted events are log-only. */
export declare const SURFACE_TYPES: ReadonlySet<string>;
/**
 * Require a JSON object at the durable input boundary.
 * @param value - decoded value.
 * @param label - diagnostic subject.
 * @returns the narrowed object.
 */
export declare function record(value: SessionFormatJsonValue | undefined, label: string): SessionFormatJsonObject;
/**
 * Reject missing and unaudited members rather than guessing whether they contain coordinates.
 * @param value - decoded record.
 * @param required - required member names.
 * @param optional - additional admitted names.
 * @param label - diagnostic subject.
 */
export declare function keys(value: SessionFormatJsonObject, required: readonly string[], optional: readonly string[], label: string): void;
/**
 * Validate classified payloads before migration, or native V3 system/header payloads.
 * @param event - decoded logical event.
 * @param version - source or target generation.
 */
export declare function assertEvent(event: SessionFormatEvent, version: 2 | 3): void;
/**
 * Recognize stable generated repair IDs without interpreting their historical suffix as a current coordinate.
 * @param id - durable message identity.
 * @param callId - advertised tool identity.
 * @returns whether the identity has the canonical historical repair form.
 */
export declare function isRepairIdentity(id: SessionFormatJsonValue | undefined, callId: SessionFormatJsonValue | undefined): callId is string;
/**
 * Reject V3 structural payload violations even beyond a recoverable physical-row failure.
 * @param value - raw physical row; ordinary rows retain the frozen decoder's recovery policy.
 */
export declare function assertV3StructuralRow(value: unknown): void;
/**
 * Validate one canonical V3 event without interpreting plugin-owned payloads or log relationships.
 * Unclassified metadata is deferred to vocabulary-aware restoration; unknown required types must not become recoverable corruption.
 * @param event - decoded logical event.
 * @param knownEventTypes - additional installed event types whose envelopes are interpreted.
 */
export declare function assertV3Event(event: SessionFormatEvent, knownEventTypes?: ReadonlySet<string>): void;
/**
 * Canonicalize structurally transformed events without changing their target coordinates.
 * @param event - transformed event using released replacement names and target coordinates.
 * @returns a V3 event sharing all unchanged payloads and reference values.
 */
export declare function canonicalizeTransformedEvent(event: SessionFormatEvent): SessionFormatEvent;
//# sourceMappingURL=payload.d.ts.map
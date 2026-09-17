/**
 * Backend-shared storage validation: the version gate, the fail-closed event
 * vocabulary, append-batch materialization, and contiguity — one place so
 * every backend refuses the same inputs identically.
 * @module @deepseek-ai/dsh-session-persistence/storage-contract
 */
import type { SessionEvent, SessionHeader, SessionId } from '@deepseek-ai/dsh-session';
import { type SessionLocation } from './errors.ts';
/**
 * Refuse stored metadata that is not bound to the requested session id.
 * @param id - the requested session id.
 * @param meta - the stored header.
 */
export declare function assertStoredId(id: SessionId, meta: SessionHeader): void;
/**
 * Refuse a header that has not been restored to the current logical format.
 * @param meta - the stored header.
 * @param location - the backend's artifact location for the refusal, when one exists.
 */
export declare function assertVersion(meta: {
    readonly id: SessionId;
    readonly version: number;
}, location?: SessionLocation): void;
/**
 * Validate one exclusively owned stored event array in place: adopt each
 * record (validating and freezing it) and refuse any event type this build
 * does not know, unless its writer marked it `ignorable: true` — silently
 * skipping an unknown required event could reconstruct a wrong session (the
 * envelope contract on `SessionEvent.ignorable`). Unknown required types and
 * retired pre-release shapes refuse here; this validator performs no migration.
 * @param meta - the stored header the events belong to.
 * @param events - exclusively owned decoded events; validated in place.
 * @param location - the backend's artifact location for refusals, when one exists.
 * @returns the same array, validated and frozen.
 * @throws {SessionFormatUnsupportedError} for unknown event types.
 * @throws {SessionPersistenceCorruptionError} for records that fail validation.
 */
export declare function validateStoredEvents(meta: SessionHeader, events: SessionEvent[], location?: SessionLocation): SessionEvent[];
/**
 * Validate and deep-snapshot a header passed to `create` in one traversal.
 * @param header - the caller's header.
 * @returns the detached lossless-JSON header.
 * @throws {TypeError} for non-JSON metadata or an invalid `createdAt`.
 */
export declare function materializeCreateHeader(header: SessionHeader): SessionHeader;
/**
 * Validate and deep-snapshot one append batch in a single traversal, so the
 * checked value is exactly the value persisted (a check followed by a copy
 * could reread accessors into a different record).
 * @param events - the caller's batch.
 * @returns the detached lossless-JSON batch.
 * @throws {TypeError} when any event data is not losslessly JSON-serializable.
 */
export declare function materializeAppendBatch(events: readonly SessionEvent[]): readonly SessionEvent[];
/**
 * Refuse a batch that does not contiguously continue the stored log.
 * @param id - the session the batch belongs to.
 * @param events - the batch, in seq order.
 * @param cursor - the stored next-seq.
 */
export declare function assertContiguous(id: SessionId, events: readonly SessionEvent[], cursor: number): void;
//# sourceMappingURL=storage-contract.d.ts.map
import { Service } from "@deepseek-ai/cordis";
import { KNOWN_SESSION_EVENT_TYPES, SESSION_FORMAT_VERSION, adoptSessionEvent } from "@deepseek-ai/dsh-session";
import { snapshotJsonValue } from "@deepseek-ai/dsh-util-values";
//#region lib/types/revision.js
/** Opaque revision identity for lightweight persistence observations. */
/**
* Brand a backend revision for the provider-neutral persistence contract.
* @param value - backend-owned opaque revision representation.
* @returns the same runtime string with persistence-revision identity.
*/
function SessionPersistenceRevision(value) {
	return value;
}
//#endregion
//#region lib/types/errors.js
/**
* Stable failures exposed by the session-persistence service and its handles,
* including the format refusals shared by every backend: a stored log this
* build cannot faithfully interpret is refused, never misread, and the
* refusal points at the raw artifact when the backend keeps one per session.
* @module @deepseek-ai/dsh-session-persistence/errors
*/
/** The requested Session identity has no durable log visible to this caller. */
var SessionPersistenceNotFoundError = class extends Error {
	sessionId;
	/** @param sessionId - absent durable Session identity. */
	constructor(sessionId) {
		super(`session "${sessionId}" not found`);
		this.sessionId = sessionId;
		this.name = "SessionPersistenceNotFoundError";
	}
};
/** `create` targeted a Session identity that already exists in this backend. */
var SessionAlreadyExistsError = class extends Error {
	sessionId;
	/** @param sessionId - the occupied durable Session identity. */
	constructor(sessionId) {
		super(`session "${sessionId}" already exists`);
		this.sessionId = sessionId;
		this.name = "SessionAlreadyExistsError";
	}
};
/** A write open found the session already bound to an active write handle. */
var SessionAlreadyOwnedError = class extends Error {
	sessionId;
	/** @param sessionId - the session whose write ownership is taken. */
	constructor(sessionId) {
		super(`session "${sessionId}" is already owned by an active write handle`);
		this.sessionId = sessionId;
		this.name = "SessionAlreadyOwnedError";
	}
};
/** A mutation (`append`/`flush`) was called on a read handle. */
var SessionReadOnlyError = class extends Error {
	sessionId;
	/**
	* @param sessionId - the session the read handle observes.
	* @param operation - the refused mutating operation name.
	*/
	constructor(sessionId, operation) {
		super(`session "${sessionId}": ${operation} is not available on a read handle`);
		this.sessionId = sessionId;
		this.name = "SessionReadOnlyError";
	}
};
/**
* A write handle's ownership is permanently gone: its lease expired, a renewal
* failed, or the durable ownership record no longer names this handle. The
* handle never re-acquires ownership — close it and reopen for write.
*
* Declared for the cross-process lease layer; the shipped in-process backends
* never throw it yet.
*/
var SessionOwnershipLostError = class extends Error {
	sessionId;
	/** @param sessionId - the session whose write ownership this handle lost. */
	constructor(sessionId) {
		super(`session "${sessionId}": write ownership was lost; close this handle and reopen`);
		this.sessionId = sessionId;
		this.name = "SessionOwnershipLostError";
	}
};
/** An operation was called on a handle after `close()` was called. */
var SessionHandleClosedError = class extends Error {
	sessionId;
	/**
	* @param sessionId - the session the closed handle addressed.
	* @param operation - the refused operation name.
	*/
	constructor(sessionId, operation) {
		super(`session "${sessionId}": ${operation} on a closed handle`);
		this.sessionId = sessionId;
		this.name = "SessionHandleClosedError";
	}
};
/** Durable session contents failed validation after a successful backend read. */
var SessionPersistenceCorruptionError = class extends Error {
	/**
	* @param message - stable corruption context.
	* @param options - original validation failure.
	*/
	constructor(message, options) {
		super(message, options);
		this.name = "SessionPersistenceCorruptionError";
	}
};
/**
* The stored log is intact but this runtime cannot faithfully interpret it:
* the header carries an unsupported format version, or an event's type is
* unknown to this build. Distinct from {@link SessionPersistenceCorruptionError}
* — nothing is damaged; the raw log remains readable at {@link location} when
* the backend keeps one artifact per session.
*/
var SessionFormatUnsupportedError = class extends Error {
	location;
	/**
	* @param message - stable reason the log cannot be interpreted, already
	*   including the raw-log path when one exists.
	* @param location - the backend's artifact location, when one exists.
	*/
	constructor(message, location) {
		super(message);
		this.location = location;
		this.name = "SessionFormatUnsupportedError";
	}
};
/**
* Direction-aware refusal text for a stored session whose format version this
* build does not read. Shared by load-time checks and by backends that must
* refuse BEFORE decoding version-dependent structure (a future format may not
* satisfy this build's structural checks at all, and the user must see
* "upgrade the harness", never "corrupt").
* @param id - the stored session id, for message context.
* @param version - the stored format version.
* @returns the stable refusal text, without a raw-log path suffix.
*/
function sessionFormatVersionRefusal(id, version) {
	return version > SESSION_FORMAT_VERSION ? `session "${id}" uses log format v${version}, but this harness reads only v${SESSION_FORMAT_VERSION}: the log was written by a newer harness — upgrade the harness to open it` : `session "${id}" uses log format v${version}, older than the supported v${SESSION_FORMAT_VERSION}, and this build ships no upgrade path for it`;
}
//#endregion
//#region lib/types/storage-contract.js
/**
* Backend-shared storage validation: the version gate, the fail-closed event
* vocabulary, append-batch materialization, and contiguity — one place so
* every backend refuses the same inputs identically.
* @module @deepseek-ai/dsh-session-persistence/storage-contract
*/
/** Build a format refusal that points at the raw artifact when the backend has one. */
function unsupported(reason, location) {
	return new SessionFormatUnsupportedError(location === void 0 ? reason : `${reason} (raw log: ${location.path})`, location);
}
/**
* Refuse stored metadata that is not bound to the requested session id.
* @param id - the requested session id.
* @param meta - the stored header.
*/
function assertStoredId(id, meta) {
	if (meta.id !== id) throw new Error(`stored session identity mismatch: requested "${id}", header contains "${meta.id}"`);
}
/**
* Refuse a header that has not been restored to the current logical format.
* @param meta - the stored header.
* @param location - the backend's artifact location for the refusal, when one exists.
*/
function assertVersion(meta, location) {
	if (meta.version !== SESSION_FORMAT_VERSION) throw unsupported(sessionFormatVersionRefusal(meta.id, meta.version), location);
}
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
function validateStoredEvents(meta, events, location) {
	for (const event of events) {
		if (!KNOWN_SESSION_EVENT_TYPES.has(event.type) && event.ignorable !== true) throw unsupported(`session "${meta.id}" contains event type "${event.type}" (seq ${event.seq}) unknown to this harness and not marked ignorable; refusing to interpret the log — it was likely written by a newer harness`, location);
		if (event.type === "request/header") {
			const data = event.data;
			if (typeof data === "object" && data !== null && data["reason"] === "fallback") throw unsupported(`session "${meta.id}" contains a request/header event (seq ${event.seq}) with the unsupported legacy reason "fallback"; refusing to interpret the log — it was written by a retired pre-release harness`, location);
		}
	}
	try {
		for (const [index, event] of events.entries()) events[index] = adoptSessionEvent(event);
	} catch (error) {
		if (error instanceof SessionFormatUnsupportedError) throw error;
		throw new SessionPersistenceCorruptionError(`stored session "${meta.id}" failed validation: ${String(error)}`, { cause: error });
	}
	return events;
}
/**
* Validate and deep-snapshot a header passed to `create` in one traversal.
* @param header - the caller's header.
* @returns the detached lossless-JSON header.
* @throws {TypeError} for non-JSON metadata or an invalid `createdAt`.
*/
function materializeCreateHeader(header) {
	const snapshot = snapshotJsonValue(header);
	if (snapshot === void 0) throw new TypeError("session metadata must be losslessly JSON-serializable");
	if (!Number.isSafeInteger(snapshot.createdAt) || snapshot.createdAt < 0) throw new TypeError("session metadata createdAt must be a non-negative safe integer");
	return snapshot;
}
/**
* Validate and deep-snapshot one append batch in a single traversal, so the
* checked value is exactly the value persisted (a check followed by a copy
* could reread accessors into a different record).
* @param events - the caller's batch.
* @returns the detached lossless-JSON batch.
* @throws {TypeError} when any event data is not losslessly JSON-serializable.
*/
function materializeAppendBatch(events) {
	const batch = snapshotJsonValue(events);
	if (batch === void 0) throw new TypeError("session event batch is not losslessly JSON-serializable because it contains non-JSON-serializable data");
	return batch;
}
/**
* Refuse a batch that does not contiguously continue the stored log.
* @param id - the session the batch belongs to.
* @param events - the batch, in seq order.
* @param cursor - the stored next-seq.
*/
function assertContiguous(id, events, cursor) {
	for (const [index, event] of events.entries()) if (event.seq !== cursor + index) throw new Error(`append seq mismatch for "${id}": expected ${cursor + index} at index ${index}, got ${event.seq}`);
}
//#endregion
//#region lib/types/index.js
/**
* Durable session-persistence Service Definition (`ctx.sessionPersistence`). Backends store
* {@link SessionEvent}s as the event-sourced log and carry non-replayable
* {@link SessionHeader} metadata separately; callers address one stored
* session through a {@link SessionHandle} obtained from `create`/`open`.
* @module @deepseek-ai/dsh-session-persistence
*/
/**
* Durable append-only session storage addressed through per-session handles.
*
* Storage semantics shared by every backend: events are contiguous from seq 0
* and never rewritten; a torn physical tail is never returned to a reader and
* is truncated by the write path before its first append; reads validate
* current-format records only and refuse unknown vocabulary fail-closed.
* `append` persists best-effort; `flush` — per handle or service-wide — is
* the durability barrier.
*
* Visibility: a created session is observable through `stat`/`list`/`open`
* in this process from the moment `create` resolves, even while a backend
* defers physical materialization (a pure optimization); other processes see
* the session only once it materializes, and a session that never
* materialized before a crash never existed. `SessionHandle.flush` forces
* materialization.
*
* Freshness: once an `append` or `flush` resolves, reads started afterwards
* on this backend instance observe at least that prefix.
*/
var SessionPersistence = class extends Service {
	constructor(ctx) {
		super(ctx, "sessionPersistence");
	}
};
//#endregion
export { SessionAlreadyExistsError, SessionAlreadyOwnedError, SessionFormatUnsupportedError, SessionHandleClosedError, SessionOwnershipLostError, SessionPersistence, SessionPersistence as default, SessionPersistenceCorruptionError, SessionPersistenceNotFoundError, SessionPersistenceRevision, SessionReadOnlyError, assertContiguous, assertStoredId, assertVersion, materializeAppendBatch, materializeCreateHeader, sessionFormatVersionRefusal, validateStoredEvents };

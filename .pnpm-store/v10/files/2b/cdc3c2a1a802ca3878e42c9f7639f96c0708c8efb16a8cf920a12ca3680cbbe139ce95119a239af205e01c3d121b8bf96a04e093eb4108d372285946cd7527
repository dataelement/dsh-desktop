import { brandNumber, brandString } from '@deepseek-ai/dsh-brand';
/**
 * Brand a string as a {@link SessionId}.
 * @param id - the raw session id string.
 * @returns the same string with the session-id brand.
 */
export function SessionId(id) {
    return brandString(id);
}
/**
 * Admit a numeric value as an existing Session event position.
 * @param value - non-negative safe integer admitted by the owning log operation.
 * @returns the same number with the Session-sequence brand.
 */
export function SessionSeq(value) {
    if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
        throw new TypeError(`SessionSeq must be a non-negative safe integer, got ${String(value)}`);
    }
    return brandNumber(value);
}
/**
 * Admit a numeric value as a Session log offset.
 * @param value - non-negative safe integer used as a gap or prefix length.
 * @returns the same number with the Session-log-offset brand.
 */
export function SessionLogOffset(value) {
    if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
        throw new TypeError(`SessionLogOffset must be a non-negative safe integer, got ${String(value)}`);
    }
    return brandNumber(value);
}
/**
 * Current logical Session format version, stamped into every newly written
 * {@link SessionHeader}. Current Session and persistence code accept only this
 * value; header-only readers classify supported historical formats, while an
 * event-body read composes the build-static adjacent chain and publishes only
 * this final generation before constructing a Session.
 *
 * The version is a single monotonic integer with no major/minor split. Whether
 * a bump is needed is decided by what the WRITER emits, never by what a newer
 * reader can accept: bump exactly when an older runtime could no longer handle
 * a new log with full semantic correctness ("parses without error" is not
 * correctness — silently skipping content that shapes reconstruction is a
 * wrong read). Only structural changes reach that bar: the header shape, the
 * {@link SessionEvent} envelope, core event semantics, or the surface
 * mechanism (the {@link SurfaceEventType} set and {@link SurfaceOp} variants).
 * Adding an ordinary event type does not bump — the per-event
 * {@link SessionEvent.ignorable} guard covers vocabulary growth instead. When
 * in doubt, bump: a near-identity upgrade step is almost free, a missed bump
 * makes older runtimes read new logs wrong silently. The released migration,
 * immutable prior-generation, and current fast-path rules are recorded in
 * `.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md`.
 */
export const SESSION_FORMAT_VERSION = 3;
//# sourceMappingURL=types.js.map
/** One-shot cold session read through the handle-based persistence seam. */
import type { SessionEvent, SessionHeader, SessionId, SessionLogOffset, SessionSeedEventState } from '@deepseek-ai/dsh-session';
import type SessionPersistence from '@deepseek-ai/dsh-session-persistence';
/** A stored session log balanced for read-only viewing. */
export interface ColdSessionLog {
    /** Aliasing state of the persisted events; synthetic closers are locally owned. */
    readonly eventState: SessionSeedEventState;
    /** The stored header, fixed when the read handle opened. */
    readonly header: SessionHeader;
    /** Exact fork-inherited event count paired with {@link header}. */
    readonly inheritedEventCount: SessionLogOffset;
    /** Stored events plus deterministic in-memory closers for an interrupted final turn; nothing is written back. */
    readonly events: SessionEvent[];
}
/**
 * Read one complete stored session log without taking ownership or mutating
 * storage: open a read handle, read the validated contiguous log, close the
 * handle, and append `interruptedTurnClosers` so a log whose writer crashed
 * mid-turn folds as a balanced transcript. Backend failures propagate
 * unmapped — each caller owns its error taxonomy.
 * @param persistence - the mounted persistence service.
 * @param sessionId - the stored session to read.
 * @param signal - optional cancellation for the open and read work.
 * @returns an adoptable seed in a caller-owned outer array, ready for in-place Session restoration.
 */
export declare function readColdSessionLog(persistence: SessionPersistence, sessionId: SessionId, signal?: AbortSignal): Promise<ColdSessionLog>;
//# sourceMappingURL=cold-read.d.ts.map
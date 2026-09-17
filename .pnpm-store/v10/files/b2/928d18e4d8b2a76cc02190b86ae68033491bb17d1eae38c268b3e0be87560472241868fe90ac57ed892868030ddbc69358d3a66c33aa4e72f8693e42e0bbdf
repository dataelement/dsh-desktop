/** Schedule-owned use of the shared session durability barrier. */
import type { Context } from '@deepseek-ai/cordis';
import type { Session } from '@deepseek-ai/dsh-session';
/** Failure to prove that the current live prefix reached a persistence listener. */
export declare class SchedulePersistenceError extends Error {
    /**
     * Construct a contained persistence failure.
     * @param cause - Rejection returned by the shared barrier, when present.
     */
    constructor(cause?: unknown);
}
/**
 * Require one successful shared persistence checkpoint.
 * @param ctx - Context carrying the live session store.
 * @param session - Exact live session to checkpoint.
 * @returns After at least one listener explicitly acknowledges completed durability work.
 */
export declare function flushSchedulePersistence(ctx: Context, session: Session): Promise<void>;
//# sourceMappingURL=persistence.d.ts.map
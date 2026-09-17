/**
 * Tool-pairing balance over a session surface. Compaction changes surface
 * positions, so safe cuts are derived from tool-call/result content in current
 * surface order rather than step markers.
 * @module @deepseek-ai/dsh-compaction/tool-pairing
 */
import type { Session, SessionSeq } from '@deepseek-ai/dsh-session';
/**
 * Whether the cut immediately before a current surface sequence is tool-pairing balanced.
 * @param session - session whose surface is checked.
 * @param seq - event sequence whose leading cut is checked.
 * @returns true when no unanswered tool call crosses the cut.
 * @throws when the seq is absent from the current surface, a surface sequence has no
 * matching log event, or a tool result has no preceding open call.
 */
export declare function toolPairingBalancedBefore(session: Session, seq: SessionSeq): boolean;
/**
 * Whether the cut immediately after a current surface sequence is tool-pairing balanced.
 * @param session - session whose surface is checked.
 * @param seq - event sequence whose trailing cut is checked.
 * @returns true when no unanswered tool call crosses the cut.
 * @throws when the seq is absent from the current surface, a surface sequence has no
 * matching log event, or a tool result has no preceding open call.
 */
export declare function toolPairingBalancedAfter(session: Session, seq: SessionSeq): boolean;
//# sourceMappingURL=tool-pairing.d.ts.map
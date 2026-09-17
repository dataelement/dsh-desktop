/** Current-surface projection and byte-bounded rendering. */
import type { SessionSurfaceSnapshot } from '@deepseek-ai/dsh-session-query';
import type { OptionalSessionSeq, SessionId } from '@deepseek-ai/dsh-session';
import type { ReferencedConversationItem } from './types.ts';
/** Snapshot data serialized inside the untrusted prompt. */
export interface ReferencedSessionData {
    sessionId: SessionId;
    label: string;
    cwd: string | null;
    capturedThroughSeq: OptionalSessionSeq;
    conversation: ReferencedConversationItem[];
}
/** Retention facts stored beside the durable context. */
export interface ReferenceRetentionStats {
    compacted: boolean;
    originalMessages: number;
    retainedMessages: number;
    omittedMessages: number;
    omittedBytes: number;
    truncated: boolean;
}
/**
 * Fit one projected snapshot into an exact rendered JSON-object byte cap.
 * @param snapshot - current-surface source observation.
 * @param label - host-provided display label serialized with the source.
 * @param maxBytes - maximum UTF-8 bytes for the serialized data object.
 * @returns full projected data, retained preview and stats, or `undefined` when fixed data cannot fit.
 */
export declare function retainReferencedSession(snapshot: SessionSurfaceSnapshot, label: string, maxBytes: number): {
    data: ReferencedSessionData;
    fullData: ReferencedSessionData;
    stats: ReferenceRetentionStats;
} | undefined;
//# sourceMappingURL=projection.d.ts.map
/**
 * Cross-session snapshot preparation. Hosts adapt mentions into structured
 * references; this service owns exact reads, projection, budgets, and durable context.
 *
 * @module @deepseek-ai/dsh-session-reference
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
import { type Config } from './config.ts';
import type { PreparedReferencedMessage, SessionReferenceCandidate, SessionReferenceInput, SessionReferenceMentionCandidate } from './types.ts';
export type * from './types.ts';
export type { Config, SessionReferenceErrorCode } from './config.ts';
export { DEFAULT_CANDIDATE_LIMIT, DEFAULT_MAX_REFERENCE_BYTES, MAX_REFERENCES, SessionReferenceError, } from './config.ts';
export { SESSION_REFERENCE_SCHEME, decodeSessionReferenceUri, encodeSessionReferenceUri, formatSessionReferenceMention, parseSessionReferenceText, } from './uri.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        sessionReferenceResolver: SessionReferenceResolver;
    }
}
/** Exact-read consumer that prepares immutable cross-session message context. */
export declare class SessionReferenceResolver extends TypertRemoteService {
    static inject: string[];
    static Config: z<Config>;
    private readonly config;
    private readonly assembledRoutes;
    constructor(ctx: Context, config?: Config);
    /**
     * Replace canonical mentions in direct user messages and place each prepared
     * snapshot immediately after the message that cited it.
     * @param agent - agent entering the model step.
     * @param messages - messages accepted by downstream pre-step listeners.
     * @param signal - active turn cancellation.
     * @returns direct messages followed by their session-reference context in citation order.
     */
    private prepareDirectMessages;
    /**
     * List reference candidates, ranked by working-directory affinity.
     *
     * Discovery runs at keystroke rate, so a title only ever comes from a
     * projection read: see {@link SessionReferenceResolver.projectedTitle} for
     * which sessions can answer one and which fall back to their id.
     * @param agent - target agent; self is excluded and its cwd drives ranking.
     * @param query - optional case-insensitive session-id/cwd/title substring.
     * @param limit - optional positive result cap.
     * @param signal - optional cancellation boundary for host autocomplete teardown.
     * @returns candidates labeled by latest title or, when absent, session id.
     */
    listCandidates(agent: Agent, query?: string, limit?: number, signal?: AbortSignal): Promise<SessionReferenceCandidate[]>;
    /**
     * The title a session's projections can answer without reading its log.
     *
     * Attachment is decided by the store at read time, not by the listing:
     * a session that attached in between would otherwise be answered from a
     * checkpoint its live log has already moved past.
     *
     * An attached session answers from its live registry cut, which advances
     * with every committed event, so a rename or a just-generated title is
     * visible immediately; its events are already in memory, so the lazy fold
     * costs no I/O. A cold session answers from the durable checkpoint the
     * projection cache wrote when it went cold.
     *
     * Nothing else is attempted. Folding a title from a log costs the whole
     * log, and this call sits under every keystroke of `@` completion. A
     * session that no projection can answer for — one persisted before the
     * cache was composed, or seeded straight to disk — is labeled by its id
     * and cannot be found by its title until it is opened once, which
     * checkpoints it.
     * @param record - the listed session, live or cold.
     * @returns the projected title, or undefined when no projection holds one.
     */
    private projectedTitle;
    /**
     * Remote face of {@link listCandidates}: the configured candidate limit
     * applies, and every candidate carries the canonical mention a host inserts
     * into the prompt draft.
     * @param agent - target agent; self is excluded and its cwd drives ranking.
     * @param query - optional case-insensitive session-id/cwd/title substring.
     * @param signal - caller cancellation.
     * @returns mention-carrying candidates in rank order.
     */
    remoteExportCandidates(agent: Agent, query: string, signal: AbortSignal): Promise<SessionReferenceMentionCandidate[]>;
    /**
     * Snapshot all references for one accepted direct message and return one aggregated durable context.
     * Automatic budgets use the last assembled route, or agent options before any assembly.
     * Missing model capacity or adapter uses 64 KiB; other metadata lookup failures and cancellation reject preparation.
     * Truncated previews include omission facts and a full-snapshot spill locator, or an explicit unavailable notice.
     * Cancellation prevents context publication, including when storage completes after cancellation.
     * @param agent - target agent; references to it are rejected.
     * @param content - already host-normalized readable message content.
     * @param references - structured source sessions in mention order.
     * @param signal - optional cancellation boundary for the active turn.
     * @returns detached content and optional referenced-session context.
     */
    prepare(agent: Agent, content: ContentBlock[], references: SessionReferenceInput[], signal?: AbortSignal): Promise<PreparedReferencedMessage>;
    private referenceBudget;
    private renderSources;
}
export default SessionReferenceResolver;
//# sourceMappingURL=index.d.ts.map
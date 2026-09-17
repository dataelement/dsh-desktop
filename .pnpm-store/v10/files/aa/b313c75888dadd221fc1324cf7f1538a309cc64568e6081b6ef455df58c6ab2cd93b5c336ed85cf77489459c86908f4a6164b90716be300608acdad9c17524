/** Agent activation, composition, and model-selection policy owned by API Session. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent, AgentSetup, ModelSelection as AgentModelSelection, ModelSelectionRef } from '@deepseek-ai/dsh-agent';
import type { Session, SessionId } from '@deepseek-ai/dsh-session';
import type { SessionInspection } from '@deepseek-ai/dsh-session-persistence';
import { type SessionObservation } from '@deepseek-ai/dsh-session-query';
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
/** Cold Session identity absent from persistence. */
export declare class ApiSessionNotFound extends Error {
}
/** Session identity whose lifecycle belongs to subagent routing. */
export declare class ApiSessionSubagentOwnership extends Error {
    readonly sessionId: SessionId;
    /** @param sessionId - identity reserved to subagent routing. */
    constructor(sessionId: SessionId);
}
/** Explicit-id creation attempted to adopt a Session under another cwd. */
export declare class ApiSessionCwdConflict extends Error {
    readonly sessionId: SessionId;
    readonly requestedCwd: string;
    readonly existingCwd: string | undefined;
    constructor(sessionId: SessionId, requestedCwd: string, existingCwd: string | undefined);
}
/** Explicit-id creation attempted to adopt a Session under another preset. */
export declare class ApiSessionPresetConflict extends Error {
    readonly sessionId: SessionId;
    readonly requestedPreset: string;
    readonly existingPreset: string | undefined;
    constructor(sessionId: SessionId, requestedPreset: string, existingPreset: string | undefined);
}
/** Failures produced while resolving one ordinary Session identity to its live Agent. */
export type ApiSessionAgentError = RemoteError<'session/not-found' | 'session/agent-busy' | 'gateway/internal'>;
/** Result of resolving one ordinary Session identity to its live Agent. */
export type ApiSessionAgentResult = {
    readonly agent: Agent;
} | {
    readonly error: ApiSessionAgentError;
};
type InstalledSelection = ModelSelectionRef & {
    current: AgentModelSelection;
    consume(provider: string, model: string, reasoningEffort: string | undefined): boolean;
};
/**
 * Test whether generic Session routing must leave an identity to subagent routing.
 * @param ctx - Host context carrying the Agent ownership registry.
 * @param session - attached or live Session whose ownership is tested.
 * @param agent - live Agent when one exists for the Session.
 * @returns whether subagent routing owns the Session identity.
 */
export declare function hasApiSessionSubagentOwner(ctx: Context, session: Pick<Session, 'header'>, agent: Agent | undefined): boolean;
/**
 * Build the stable caller-facing subagent ownership rejection.
 * @param sessionId - Session identity owned by subagent routing.
 * @returns a stable Session-domain failure.
 */
export declare function apiSessionSubagentOwnershipError(sessionId: SessionId): ApiSessionAgentError;
/**
 * Inspect one cold Session without repairing, resuming, or publishing it.
 * @param ctx - Host context carrying Session persistence.
 * @param sessionId - durable Session identity.
 * @param signal - optional cancellation for persistence reads.
 * @returns the persisted header and complete event prefix.
 */
export declare function inspectApiSession(ctx: Context, sessionId: SessionId, signal?: AbortSignal): Promise<SessionInspection>;
/** Owns every operation that may create, resume, or configure a Web Agent. */
export declare class ApiSessionAgentController {
    private readonly ctx;
    private readonly resumes;
    private readonly creations;
    private readonly selections;
    private readonly imageAdmissionChains;
    /** @param ctx - Host context carrying Agent, model, persistence, and Typert services. */
    constructor(ctx: Context);
    /**
     * Resolve or resume one ordinary Session, deduplicating concurrent resumes.
     * @param sessionId - ordinary Session identity.
     * @returns the live Agent or a stable Session-domain failure.
     */
    resolveAgent(sessionId: SessionId): Promise<ApiSessionAgentResult>;
    /**
     * Resolve one ordinary Session from an already-retained exact observation.
     * @param observation - Host-owned observation whose preparation stays pinned through setup.
     * @returns the live Agent or a stable Session-domain failure.
     */
    resolveObservedAgent(observation: SessionObservation): Promise<ApiSessionAgentResult>;
    private resolve;
    /**
     * Resolve one requested identity, creating or resuming it once.
     * @param sessionId - requested Session identity.
     * @param cwd - directory the Session must own.
     * @param checkPersistedIdentity - whether to inspect a cold identity before creation.
     * @param presetId - optional Agent preset the Session must own.
     * @returns the matching live ordinary Agent.
     */
    ensureSession(sessionId: SessionId, cwd: string, checkPersistedIdentity: boolean, presetId?: string): Promise<Agent>;
    /**
     * Install or return the Session-local model selection used by prompt assembly.
     * @param agent - live Agent that owns the selection.
     * @returns the installed mutable selection reference.
     */
    selectionFor(agent: Agent): InstalledSelection;
    /**
     * Commit and cache one validated selection for the next prompt assembly.
     * @param agent - live Agent that owns the selection.
     * @param selection - validated selection to record and apply.
     */
    selectForNextRequest(agent: Agent, selection: AgentModelSelection): void;
    /**
     * Let a matching durable request header retire the execution cache.
     * @param agent - live Agent whose request was recorded.
     * @param provider - provider route used by the request.
     * @param model - provider-owned model used by the request.
     * @param reasoningEffort - adapter-owned effort used by the request.
     * @returns whether the pending selection was consumed.
     */
    consumeSelection(agent: Agent, provider: string, model: string, reasoningEffort: string | undefined): boolean;
    /**
     * Read the current Agent preset from the Session projection.
     * @param session - live Session whose projection state is available.
     * @returns the current preset, or undefined when the capability is absent.
     */
    presetForSession(session: Session): string | undefined;
    /**
     * Serialize image admission and model selection for one Agent.
     * @param agent - live Agent that owns the serialization chain.
     * @param operation - asynchronous operation admitted after prior work settles.
     * @returns the operation result or rejection.
     */
    serializeImageAdmission<Value>(agent: Agent, operation: () => Promise<Value>): Promise<Value>;
    /**
     * Resolve the preset id and pre-publication Agent setup for a create or resume.
     * @param presetId - requested preset or the configured default when omitted.
     * @returns the resolved preset identity and Agent setup callback.
     */
    composeAgent(presetId: string | undefined): Promise<{
        readonly agentPreset?: string;
        readonly setup: AgentSetup;
    }>;
    private liveAgent;
    private resume;
    private resumeObserved;
    private createOrAdopt;
    private agentOptions;
    private installSelection;
    /**
     * Read the current Agent preset from an all-projections observation.
     * @param observation - exact Session observation carrying its projection snapshot.
     * @returns the current preset, or undefined when the capability is absent.
     */
    presetForObservation(observation: SessionObservation): string | undefined;
    private assertPresetUnchanged;
}
export {};
//# sourceMappingURL=agent.d.ts.map
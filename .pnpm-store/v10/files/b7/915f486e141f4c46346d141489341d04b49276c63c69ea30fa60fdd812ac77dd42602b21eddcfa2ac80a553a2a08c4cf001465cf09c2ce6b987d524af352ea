/**
 * Concrete agent-loop plugin: creates scoped ReactLoopAgents, publishes them
 * through the agent/session registries, and owns their ordered teardown.
 *
 * @module @deepseek-ai/dsh-agent-loop
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { z as zod } from 'zod';
import type { Agent, AgentFactory, AgentHandle, AgentOptions, CreateAgentOptions, ResumeAgentOptions, TurnBoundaryProjection } from '@deepseek-ai/dsh-agent';
import type { SessionHeader, SessionId } from '@deepseek-ai/dsh-session';
import { DEFAULT_MAX_PARALLEL_TOOL_CALLS } from './constants.ts';
/** Host projection of agent turn and step boundaries. */
export declare const turnBoundaryProjectionDefinition: {
    key: "turnBoundary";
    stateVersion: number;
    stateSchema: zod.ZodType<TurnBoundaryProjection, unknown, zod.core.$ZodTypeInternals<TurnBoundaryProjection, unknown>>;
    init: () => {
        openTurnStartSeq: null;
        lastStepStartSeq: null;
        lastStepBoundary: null;
        lastTurn: number;
    };
    apply: (state: NoInfer<TurnBoundaryProjection>, event: import("@deepseek-ai/dsh-session").SessionEvent) => TurnBoundaryProjection;
};
declare module '@deepseek-ai/cordis' {
    interface Context {
        agentLoop: AgentLoop;
        /**
         * Launcher-owned exact session identities for configured agents, keyed by
         * the agent's config `id` and set with `ctx.provide()` before any Loader
         * entry mounts (see {@link CONFIGURED_AGENT_IDENTITIES_KEY}). A launcher
         * owns identity because only it knows whether the session already exists,
         * while the `cordis.yml` row keeps the model route as ordinary patchable
         * config. An entry with no matching key keeps its configured identity.
         */
        configuredAgentIdentities?: ConfiguredAgentIdentities;
    }
    interface Events {
        /**
         * A declarative agent entry failed before it could publish a live agent.
         * Consumers that buffer work for the configured identity use this
         * transient signal to reject that work instead of waiting forever. Normal
         * factory teardown suppresses failures from the cancelled startup attempt.
         * @param payload.sessionId - exact shared agent/session identity that failed startup.
         * @param payload.error - persistence, setup, or publication failure.
         * @mode emit
         */
        'agent-loop/config-start-failed'(payload: {
            sessionId: SessionId;
            error: unknown;
        }): void;
    }
}
export { DEFAULT_MAX_PARALLEL_TOOL_CALLS };
/**
 * One launcher-selected session identity for a configured agent. `resume`
 * distinguishes rehydrating existing persisted history from creating the
 * session fresh under that exact id, which the two config keys express as
 * `resumeSessionId` and `sessionId`.
 */
export interface LauncherAgentIdentity {
    /** Exact session id to create fresh or resume. */
    id: SessionId;
    /** Resume existing persisted history instead of creating the session fresh. */
    resume: boolean;
}
/** Launcher-selected identities keyed by the configured agent's `id`. */
export interface ConfiguredAgentIdentities extends Readonly<Record<string, LauncherAgentIdentity>> {
}
/**
 * Context key a launcher sets before any Loader entry mounts
 * (`ctx.provide(CONFIGURED_AGENT_IDENTITIES_KEY, identities)`) to fix
 * configured agents' session identities without a config key, so an overlay
 * repointing the row's model route cannot drop them.
 */
export declare const CONFIGURED_AGENT_IDENTITIES_KEY = "configuredAgentIdentities";
/** Settings namespace carrying the tool-call parallelism a user owns. */
export declare const AGENT_LOOP_SETTINGS_NAMESPACE = "agent-loop";
/**
 * The agent-loop fields a user owns. Deliberately a strict subset of
 * {@link Config}: `agents` is a boot-time composition array consumed once when
 * the service starts, so a stored change could only look like it had an effect.
 */
export interface AgentLoopSettings {
    /** Maximum parallel-safe calls in flight per agent step. */
    maxParallelToolCalls: number;
}
/** Schema of the agent-loop settings section. */
export declare const AGENT_LOOP_SETTINGS_SCHEMA: z<AgentLoopSettings>;
/** Agent-loop plugin configuration. */
export interface Config {
    /**
     * Maximum parallel-safe calls in flight per agent step. `1` is serial;
     * omission defaults to {@link DEFAULT_MAX_PARALLEL_TOOL_CALLS}.
     */
    maxParallelToolCalls?: number;
    /** Agents created or resumed at plugin startup. */
    agents: (AgentOptions & {
        /** Stable config label used in logs and as the fresh combined-id prefix. */
        id: string;
        /** Optional stable identity; remounts resume its materialized history, while first use creates it fresh. */
        sessionId?: SessionId;
        /** Optional workspace for a fresh session. */
        cwd?: string;
        /** Persisted session to resume instead of creating a fresh session. */
        resumeSessionId?: SessionId;
    })[];
}
/** Agent-loop configuration after defaults and load-time validation. */
type ResolvedConfig = Config & {
    maxParallelToolCalls: number;
};
/** Concrete agent factory and driver service. */
export declare class AgentLoop extends Service implements AgentFactory {
    static inject: string[];
    /** Runtime schema for declarative agents. */
    static Config: z<Config>;
    /** Validated configuration owned by the agent-loop service. */
    readonly config: ResolvedConfig;
    private readonly ownership;
    /** Plain holder prevents Cordis from re-tracing the factory's dependency context through a caller shadow. */
    private readonly runtime;
    constructor(ctx: Context, config: Config);
    /** Report a contained declarative-start failure to identity-bound consumers. */
    private reportConfiguredStartupFailure;
    /** Restore a materialized exact config identity on remount, or create it on first use. */
    private restoreOrCreateConfigured;
    /** Wait for a draining same-id lifecycle to finish registry teardown. */
    private waitForDrainingConfiguredIdentity;
    /**
     * Construct the driver, scope, and one memoized reverse teardown for a new
     * agent. The teardown is registered with the factory and the owner fiber
     * BEFORE publication, so a mid-setup unload rolls everything back; `signal`
     * fuses caller cancellation with lifecycle teardown for setup awaits.
     */
    private prepare;
    /**
     * Create an agent and session under one caller-supplied identity, owned by
     * the accessing fiber. Constructor-driven config calls mint a fresh combined
     * id before entering this boundary. When a persistence backend is mounted,
     * the session's durable identity and any seed are stored before publication.
     * @param id - shared agent/session identity.
     * @param options - concrete loop options.
     * @param meta - optional fresh-session workspace metadata.
     * @returns the published running agent.
     */
    create(id: SessionId, options?: AgentOptions, meta?: Pick<SessionHeader, 'cwd'>): Promise<Agent>;
    /**
     * Take a fresh session's write ownership when persistence is mounted.
     * Nothing is appended here: the constructor seed (which never re-emits
     * through `session/event`) is stored by `appendUnstoredSuffix` at the
     * publication commit point, so a failed or cancelled validation or setup
     * closes an unmaterialized handle and leaves no stored residue — the same
     * id can be created again.
     * @param session - the unpublished session to store.
     * @param signal - optional cancellation forwarded to the backend create.
     * @returns the owned handle and stored cursor, or `undefined` without a backend.
     */
    private createStoredSession;
    /**
     * Durably store the session events appended since the last stored cursor.
     * Pre-publication appends (constructor seed markers, setup-window events
     * such as delegation policy records) never re-emit through `session/event`,
     * so publication must flush them through the handle before live events
     * start routing into it.
     * @param stored - the session's owned handle and stored cursor, if any.
     * @param session - the unpublished session whose suffix is stored.
     */
    private appendUnstoredSuffix;
    /**
     * Create an owned agent on a caller-supplied session id.
     * @param ownerCtx - caller context that structurally owns the lifecycle.
     * @param options - identities, optional live parent, session seed/metadata, loop options, setup, and cancellation.
     * @returns the published handle.
     */
    createAgent(ownerCtx: Context, options: CreateAgentOptions): Promise<AgentHandle>;
    /** Prepare one Agent around an acquired Session, run setup, and publish it. */
    private setupAndPublish;
    /**
     * Resume an owned agent from the configured persistence service.
     * @param ownerCtx - caller context that owns load, setup, and the live lifecycle.
     * @param options - persisted identity, optional live parent, loop options, setup, and cancellation.
     * @returns the published handle.
     */
    resume(ownerCtx: Context, options: ResumeAgentOptions): Promise<AgentHandle>;
    /** Resume through an explicit persistence handle used by the deferred config path. */
    private resumeWith;
}
export default AgentLoop;
//# sourceMappingURL=index.d.ts.map
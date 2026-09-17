/**
 * Model-facing delegation through one configured `ctx.subagents` provider.
 * Provider lifecycle controls tool registration and context-sensitive schema
 * wording. Foreground calls always dispose the run after collection.
 * Background policy is selected by this plugin's configuration: one-shot
 * calls own a plain Task, while continuable calls use
 * `ctx.subagents.startContinuable()`.
 * @module @deepseek-ai/dsh-tool-subagent
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { AgentOptions } from '@deepseek-ai/dsh-agent';
import type { Session } from '@deepseek-ai/dsh-session';
export declare const name = "tool-subagent";
export declare const inject: string[];
/** Config: which registered provider this tool delegates to, plus child defaults. */
export interface Config {
    /** The `ctx.subagents` provider name to start runs on (e.g. `spawn`, `acp`). */
    provider: string;
    /**
     * Model-facing tool name (default `subagent`). Each loaded instance must use
     * a distinct name.
     */
    toolName?: string;
    /**
     * Sample the Host `subagent-model-selection` setting for each new top-level
     * Session and inherit that decision in its child Sessions.
     */
    modelSelectionSettings?: boolean;
    /**
     * Expose `run_in_background` (default true). Disabled instances omit the
     * parameter and reject forced background calls.
     */
    enableRunInBackground?: boolean;
    /**
     * Background execution policy (default `one-shot`). `one-shot` defaults calls
     * to foreground; `continuable` defaults them to background, requires a provider
     * with the `prepareContinuable` capability, and returns the durable child id.
     * Follow-up adapters remain independently optional.
     */
    backgroundMode?: 'one-shot' | 'continuable';
    /**
     * Agent options applied to every child; omitted fields use child-loop defaults.
     */
    agentOptions?: AgentOptions;
    /**
     * Per-child persona that shadows `deployment:persona-prefix`. Requires the
     * provider's `persona` capability; omission preserves the deployment persona.
     */
    persona?: string;
    /**
     * Tool filter applied to every child. Filtered tools disappear from its
     * prompt and reject execution. Requires the provider's `toolFilter`
     * capability; unknown names fail startup.
     */
    toolFilter?: {
        /** Global tool names the child keeps; everything else is removed. */
        allow?: string[];
        /** Global tool names removed from the child. */
        deny?: string[];
    };
    /**
     * Maximum child depth: a non-negative safe integer (default `3`; `0` forbids
     * delegation entirely), or `'provider-managed'` to send no cap. A numeric cap
     * requires the provider's `depthLimit` capability (mount fails loud
     * otherwise). The provider checks the calling agent's current depth at every
     * start; the tool remains model-visible so runtime policy owns rejection.
     * `'provider-managed'` is for an out-of-process provider whose recursion
     * budget belongs to the child runtime or its own deployment.
     */
    maxDepth?: number | 'provider-managed';
}
export declare const Config: z<Config>;
/**
 * Install one delegation-tool composition.
 * @param ctx - Context that owns the registrations.
 * @param config - delegation-tool configuration.
 * @param session - unpublished Session supplied by a direct Agent setup; omit for a standing composition.
 */
export declare function apply(ctx: Context, config: Config, session?: Session): void;
//# sourceMappingURL=index.d.ts.map
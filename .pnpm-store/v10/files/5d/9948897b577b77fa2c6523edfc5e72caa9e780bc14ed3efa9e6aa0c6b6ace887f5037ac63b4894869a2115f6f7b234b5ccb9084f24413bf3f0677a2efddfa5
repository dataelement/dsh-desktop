/**
 * Agent-plane presentation selector: the row an agent preset carries to say
 * which form of its tools the model sees.
 *
 * The tool registry itself stays on the host plane — the agent loop's
 * scheduler, the API proxy's presenters, and every tool plugin are all its
 * consumers, so it cannot move into a preset. What a preset CAN own is the
 * presentation: `ctx.tools.presentAs()` declares it for the mounting SCOPE,
 * which is the preset's standing mount, so the declaration covers every agent
 * joined to that preset and a PTC mode preset runs beside native ones in one
 * process. One row per composition, not one per session.
 *
 * A PTC mode needs a TypeScript code runtime, which is a host-plane service
 * ([`dsh-code-runtime-worker-thread`](../../code-runtime/code-runtime-worker/README.md)).
 * This row therefore waits for it rather than assuming it: a preset selecting
 * PTC mode against a deployment that composes no runtime fails at mount, named
 * in the preset's own activation audit, instead of at the first prompt.
 * @module @deepseek-ai/dsh-agent-tool-presentation
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { ToolPresentationMode } from '@deepseek-ai/dsh-tools';
/** Cordis plugin name. */
export declare const name = "tool-presentation";
/**
 * Required services. `codeRuntime` is NOT listed: a `native` row must mount in
 * a deployment that composes no runtime, and the mode-dependent wait is
 * declared inside {@link apply} instead.
 */
export declare const inject: string[];
/** Plugin config. */
export interface Config {
    /**
     * The form this agent's model sees. `native` sends every visible schema,
     * `ptc` sends only `run_code` plus a generated SDK, `both` sends both.
     * Required rather than defaulted: the deployment default is what a preset
     * without this row already gets, so an omitted value would mean the row was
     * composed for nothing.
     */
    mode: ToolPresentationMode;
}
/** Runtime schema. */
export declare const Config: z<Config>;
/**
 * Declare the tool presentation for every agent this composition covers.
 * @param ctx - the mounting composition's scope context (a preset's standing scope).
 * @param config - the selected presentation.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
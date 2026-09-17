/**
 * The registration boundary between a sandboxed host half and the real runtime: ParameterSchemaSpec
 * normalization + validation with teaching errors, the marker-guarded `harness.defineTool` /
 * `harness.registerTool` pair, the `harness.handle` invoke-handler normalizer, the SANDBOX CONTEXT
 * FAÇADE a running plugin's `apply` receives in place of the real `ctx`, and the plugin-shape
 * helpers the run lifecycle narrows sandbox return values with. The façade is a whitelist of
 * lifecycle-safe verbs and declared services; framework internals and context-valued service
 * returns are denied.
 *
 * VM-realm schemas and canonical values are rebuilt as host objects, while rendered content and
 * presentation metadata are shape-checked before entering the registry. Common JSON-Schema spellings are normalized when they
 * have one meaning; invalid vocabulary fails during registration with a teaching error.
 * @module @deepseek-ai/dsh-cordis-host-runner/guard
 */
import { Context } from '@deepseek-ai/cordis';
import type { Plugin } from '@deepseek-ai/cordis';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
/**
 * The `harness.defineTool` handed into the sandbox: the real DSL, with `parameters` normalized
 * into a fresh host-realm ParameterSchemaSpec (raw object wrappers unwrapped,
 * required arrays mapped, and explicit DSL object openness enforced) and the tool's `execute` return normalized into the host realm
 * via a JSON round-trip. Non-JSON or wrong-shape output fails that call instead of poisoning
 * the session log.
 * @param options - the standard `defineTool` options; `parameters` may be the ParameterSchemaSpec DSL or a JSON-Schema-style wrapper.
 * @returns the marker-tagged definition `harness.registerTool` (and the guarded `ctx.tools.register`) accepts.
 */
export declare function sandboxDefineTool(options: unknown): ToolDefinition;
/**
 * Normalize one `harness.handle` registration at the sandbox boundary: the
 * method name must be a non-empty string and the handler a function whose
 * result is host-materialized through the same cross-realm JSON clone as tool
 * `execute` returns (a VM-realm object would otherwise escape the wire's
 * plain-object contract).
 * @param method - handler name the package's browser half calls through `host.call`.
 * @param fn - sandbox handler receiving the wire-decoded JSON arguments.
 * @returns the validated name and the clone-wrapped handler.
 */
export declare function normalizeHandler(method: unknown, fn: unknown): {
    method: string;
    handler: (args: unknown) => Promise<unknown>;
};
/**
 * The `harness.registerTool` handed into the sandbox: registers a
 * marker-verified dynamic tool on the given context's registry.
 * @param ctx - the (guarded) context whose `tools` service receives the tool.
 * @param tool - a definition produced by {@link sandboxDefineTool}; anything else is rejected.
 * @returns the registry disposer for the registration.
 */
export declare function sandboxRegisterTool(ctx: Context, tool: unknown): () => void;
/**
 * Narrow an arbitrary sandbox return value to a runnable cordis plugin: a
 * function, or an object with an `apply` function. (A bare function passes the
 * first arm, so the object arm never sees `Function.prototype.apply`.)
 * @param value - whatever the host half returned.
 * @returns whether the value can be started via `ctx.plugin`.
 */
export declare function isPlugin(value: unknown): value is Plugin;
/**
 * Wrap a plugin so `apply` receives the sandbox context while preserving injection metadata.
 * @param plugin - the plugin the host half returned.
 * @param reportFailure - reports a guard rejection to the owning Agent.
 * @returns an equivalent plugin whose `apply` sees the sandbox context façade.
 */
export declare function guardedPlugin(plugin: Plugin, reportFailure: (error: Error) => void): Plugin;
/**
 * Display name for a running plugin: its `name` property, else anonymous.
 * @param plugin - the plugin the host half returned.
 * @returns the human-readable name used in run results and inspect output.
 */
export declare function pluginName(plugin: Plugin): string;
//# sourceMappingURL=guard.d.ts.map
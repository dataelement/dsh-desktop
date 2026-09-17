import z from "@deepseek-ai/schemastery";
//#region lib/types/index.js
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
/** Cordis plugin name. */
const name = "tool-presentation";
/**
* Required services. `codeRuntime` is NOT listed: a `native` row must mount in
* a deployment that composes no runtime, and the mode-dependent wait is
* declared inside {@link apply} instead.
*/
const inject = ["tools"];
/** Runtime schema. */
const Config = z.object({ mode: z.union([
	"native",
	"ptc",
	"both"
]).required() });
/**
* Declare the tool presentation for every agent this composition covers.
* @param ctx - the mounting composition's scope context (a preset's standing scope).
* @param config - the selected presentation.
*/
function apply(ctx, config) {
	if (config.mode === "native") {
		ctx.tools.presentAs("native");
		return;
	}
	ctx.inject(["codeRuntime"], (runtimeCtx) => {
		runtimeCtx.tools.presentAs(config.mode);
	});
}
//#endregion
export { Config, apply, inject, name };

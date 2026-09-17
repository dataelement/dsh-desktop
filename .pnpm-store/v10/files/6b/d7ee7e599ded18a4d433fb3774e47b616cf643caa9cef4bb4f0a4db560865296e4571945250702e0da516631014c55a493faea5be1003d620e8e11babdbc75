import z from "@deepseek-ai/schemastery";
import { startInProcessRun } from "@deepseek-ai/dsh-subagent-in-process-driver";
//#region lib/types/index.js
/**
* The in-process SPAWN subagent backend: registers a {@link SubagentProvider} on
* `ctx.subagents` that runs each child as a fresh child {@link Agent} on the same cordis
* context (its own session, own system prompt, zero parent context). The cheapest transport,
* reusing the agent factory's quiescent teardown.
* @module @deepseek-ai/dsh-subagent-spawn-in-process
*/
const name = "subagent-spawn-in-process";
const inject = ["subagents"];
const Config = z.object({ providerName: z.string().default("spawn") });
/**
* The spawn provider. Supports every start-time capability: `depthLimit` (it
* constructs the child, so it can enforce a recursion cap), `outputSchema`
* (the scoped structured runtime), `agentOptions` (merged over the parent
* route), and `toolFilter`/`persona` (scoped `restrict()` and a scoped
* shadowing persona section, applied in the child's creation window).
*/
var SpawnInProcessProvider = class {
	name;
	capabilities = {
		agentOptions: true,
		outputSchema: true,
		depthLimit: true,
		toolFilter: true,
		persona: true
	};
	inheritsParentContext = false;
	constructor(name) {
		this.name = name;
	}
	start(request) {
		return startInProcessRun(request, {});
	}
	prepareContinuable() {
		return Promise.resolve({});
	}
};
function apply(ctx, config) {
	ctx.subagents.registerProvider(new SpawnInProcessProvider(config.providerName));
}
//#endregion
export { Config, apply, inject, name };

import z from "@deepseek-ai/schemastery";
import { startInProcessRun } from "@deepseek-ai/dsh-subagent-in-process-driver";
//#region lib/types/index.js
/**
* The in-process FORK subagent backend: registers a {@link SubagentProvider} on
* `ctx.subagents` that runs each child as a child {@link Agent} SEEDED with a prefix of the
* parent's session log — so the child inherits the parent's conversation context instead of
* starting fresh. The seed ends at the last `turn/end`: the current tool-call turn is
* unbalanced and cannot be replayed as a valid child session.
* @module @deepseek-ai/dsh-subagent-fork-in-process
*/
const name = "subagent-fork-in-process";
const inject = ["subagents"];
const Config = z.object({ providerName: z.string().default("fork") });
/**
* The balanced completed-turn prefix of `parent`'s log: every event up to and including the
* last `turn/end`. The in-flight turn is excluded; before any completed turn the child starts
* fresh. Because live sequence numbers equal array indexes, the result remains a valid seed
* beginning at sequence zero.
* @param parent - the agent whose session log to slice.
* @returns the seed events, contiguous from seq 0; empty when no turn has completed.
*/
function completedTurnPrefix(parent) {
	const events = parent.session.snapshotEvents();
	const lastEnd = events.findLast((e) => e.type === "turn/end");
	if (lastEnd === void 0) return [];
	return events.slice(0, lastEnd.seq + 1);
}
/**
* The fork provider. Supports `depthLimit` and `outputSchema` (via the shared
* in-process structured runtime), `agentOptions` (merged over the parent
* route), and `toolFilter`/`persona` (scoped restrict() and a scoped shadowing
* persona section).
*/
var ForkInProcessProvider = class {
	name;
	capabilities = {
		agentOptions: true,
		outputSchema: true,
		depthLimit: true,
		toolFilter: true,
		persona: true
	};
	inheritsParentContext = true;
	constructor(name) {
		this.name = name;
	}
	start(request) {
		const seed = completedTurnPrefix(request.parent);
		return startInProcessRun(request, { ...seed.length > 0 ? { seed } : {} });
	}
	prepareContinuable(request) {
		const seed = completedTurnPrefix(request.parent);
		return Promise.resolve(seed.length > 0 ? { seed } : {});
	}
};
function apply(ctx, config) {
	ctx.subagents.registerProvider(new ForkInProcessProvider(config.providerName));
}
//#endregion
export { Config, apply, inject, name };

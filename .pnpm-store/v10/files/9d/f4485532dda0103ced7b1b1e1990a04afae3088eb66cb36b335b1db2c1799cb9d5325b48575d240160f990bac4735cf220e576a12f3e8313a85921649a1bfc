import { z } from "zod";
import "@deepseek-ai/dsh-llm";
import z$1 from "@deepseek-ai/schemastery";
z$1.object({
	provider: z$1.string().min(1).required(),
	model: z$1.string().min(1).required()
});
z.array(z.object({
	provider: z.string().min(1),
	model: z.string().min(1)
}).strict()).min(1).nullable();
/**
* Read the exact route list captured for a model-selectable definition.
* @param projections - registry that owns the policy projection.
* @param session - session whose durable decision is read.
* @returns a detached route list, or undefined for the fixed-route definition.
*/
function subagentModelSelectionPolicy(projections, session) {
	return projections.stateOf(session, "subagentModelSelectionPolicy")?.map((route) => ({ ...route }));
}
//#endregion
//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-tool-subagent`.
* @module @deepseek-ai/dsh-tool-subagent/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-tool-subagent";
/** Cordis companion plugin name. */
const name = "tool-subagent-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/** Assert that model-selectable definitions are complete and reconstructable. */
const install = Object.assign((ctx, fail) => {
	ctx.on("agent/pre-step", async ({ agent }, next) => {
		const schemas = ctx.tools.schemas(agent);
		const selectable = schemas.some((schema) => {
			const properties = schema.parameters.properties;
			return properties?.["provider"] !== void 0 && properties["model"] !== void 0 && properties["reasoning_effort"] !== void 0;
		});
		const discoverable = schemas.some((schema) => schema.name === "list_subagent_models");
		if ((selectable || discoverable) && (subagentModelSelectionPolicy(ctx.sessionProjections, agent.session) === void 0 || !selectable || !discoverable)) fail("model-selectable subagent definitions require a durable policy, route fields, and list_subagent_models");
		return next();
	}, { global: true });
}, { inject: ["tools", "sessionProjections"] });
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };

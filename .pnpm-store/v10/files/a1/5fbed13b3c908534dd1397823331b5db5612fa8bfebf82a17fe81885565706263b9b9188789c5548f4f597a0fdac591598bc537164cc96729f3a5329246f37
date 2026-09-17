//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-renderer`.
* @module @deepseek-ai/dsh-client-ui-renderer/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-client-ui-renderer";
/** Cordis companion plugin name. */
const name = "client-ui-renderer-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* Verify that each `slots/changed` dispatch observes its mutation already
* applied to the renderer-owned slot registry.
*/
const install = (ctx, fail) => {
	ctx.on("internal/dispatch", (_mode, eventName, args) => {
		if (eventName !== "slots/changed") return;
		const key = args[0];
		if (typeof key !== "string" || key === "") {
			fail("'slots/changed' dispatched without a slot key argument");
			return;
		}
		const slots = ctx.get("slots");
		if (slots !== void 0 && slots.getVersion(key) === 0) fail(`'slots/changed' fired for "${key}" before any mutation bumped its version — emission must follow the applied mutation`);
	}, { global: true });
};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };

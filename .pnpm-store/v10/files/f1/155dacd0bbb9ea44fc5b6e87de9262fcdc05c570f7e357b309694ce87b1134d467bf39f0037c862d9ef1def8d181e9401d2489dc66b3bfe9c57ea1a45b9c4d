//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-client-modules`.
* @module @deepseek-ai/dsh-client-modules/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-client-modules";
/** Cordis companion plugin name. */
const name = "client-modules-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* Owned relation: the node half's boot entry graph must stay self-consistent
* — every row must resolve a clientPath under the same id (the
* /plugins/<id>/client.js URL it advertises would otherwise 404 on a browser
* that just received the graph). Checked on every scan trigger (cordis
* 'internal/plugin'): graph() and clientPath() read the same table object,
* so the relation holds at any instant — no need to wait out the node half's
* own microtask-debounced flush.
*/
const install = (ctx, fail) => {
	ctx.on("internal/plugin", () => {
		const host = ctx.get("clientModules");
		if (host === void 0) return;
		for (const row of host.graph().entries) if (host.clientPath(row.id) === void 0) fail(`web plugin graph row "${row.id}" advertises ${row.url} but resolves no client bundle path — the served __DSH_BOOT__ would 404 on fetch`);
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

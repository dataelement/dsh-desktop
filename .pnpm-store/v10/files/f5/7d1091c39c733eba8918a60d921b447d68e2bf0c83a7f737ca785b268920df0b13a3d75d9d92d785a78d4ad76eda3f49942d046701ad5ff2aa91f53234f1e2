//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-client-hmr`.
* @module @deepseek-ai/dsh-client-hmr/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-client-hmr";
/** Cordis companion plugin name. */
const name = "client-hmr-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/** Live fs.watchFile pollers (this package is the composition's only stat-poll user). */
function statWatchers() {
	return process.getActiveResourcesInfo().filter((kind) => kind === "StatWatcher").length;
}
/**
* Owned relation: every bundle stat watcher the node half starts must die
* with its fiber — a surviving poller would keep re-hashing bundles for a
* torn-down dev chain forever. Checked as a baseline delta: the StatWatcher
* count observed at fiber creation must be restored once disposal has drained
* the fiber's effects (`internal/plugin` fires at dispose start; the microtask
* hop lets the disposer queue its unload before `fiber.await()` joins it).
* SSE-connection and listener teardown live inside the same ctx.effect
* disposers, so the watcher count is the relation's observable proxy.
*/
const install = (ctx, fail) => {
	const baselines = /* @__PURE__ */ new WeakMap();
	ctx.on("internal/plugin", async (fiber) => {
		if (fiber.name !== "client-hmr") return;
		if (fiber.uid !== null) {
			baselines.set(fiber, statWatchers());
			return;
		}
		const baseline = baselines.get(fiber);
		if (baseline === void 0) return;
		await Promise.resolve();
		await fiber.await();
		const remaining = statWatchers();
		if (remaining > baseline) fail(`client-hmr fiber disposed but ${remaining - baseline} bundle stat watcher(s) survived teardown`);
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

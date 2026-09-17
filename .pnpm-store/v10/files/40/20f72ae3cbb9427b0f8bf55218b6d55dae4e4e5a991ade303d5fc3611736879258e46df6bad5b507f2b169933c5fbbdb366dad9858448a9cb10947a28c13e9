//#region lib/types/session-mode.js
/**
* Per-session sandbox-mode override: the session log as the store. A runtime
* switch (a UI policy control or test scenario) is recorded as one
* `sandbox/mode` event on the session it applies to;
* `effective = projection state ?? the deployment default`, so an override
* survives restart by replay, two sessions can never see each other's state,
* and there is no external config store. The event is log-only (the
* `approval/*` precedent): the policy owner projects the fold into each model
* request, while enforcing tools report operation-specific boundary markers.
* EXECUTION honors the same fold through `ctx.sandboxPolicy.resolve()` — it
* stamps the mode together with the calling session's workspace root onto each
* capability call, weakest-precedence beneath an escalation grant.
*
* The override is policy state shared by every enforcing family (bash and
* filesystem alike), so it lives here in the policy package rather than in any
* one capability's seam.
*
* @module dsh-sandbox-policy/session-mode
*/
/** Every {@link SandboxMode}, for option advertisement and runtime validation of untrusted mode strings. */
const SANDBOX_MODES = [
	"read-only",
	"workspace-write",
	"danger-full-access"
];
//#endregion
//#region lib/types/invariant.js
/** Package-owned session-event invariants for sandbox policy. @module @deepseek-ai/dsh-sandbox-policy/invariant */
const PACKAGE_NAME = "@deepseek-ai/dsh-sandbox-policy";
/** Cordis companion plugin name. */
const name = "sandbox-policy-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/** Validate the package-owned event fields and ignore unrelated events. */
function validateEvent(event, fail) {
	if (event.type === "sandbox/mode" && !SANDBOX_MODES.includes(event.data.mode)) fail(`sandbox/mode carries unknown mode ${JSON.stringify(event.data.mode)}`);
}
/** Install validation for loaded and newly appended sandbox modes. */
const install = Object.assign((ctx, fail) => {
	for (const session of ctx.sessions.list()) for (const event of session.snapshotEvents()) validateEvent(event, fail);
	ctx.on("internal/dispatch", (_mode, eventName, args) => {
		if (eventName !== "session/event") return;
		const event = args[1];
		validateEvent(event, fail);
	}, { global: true });
}, { inject: ["sessions"] });
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };

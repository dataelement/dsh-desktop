import { Service } from "@deepseek-ai/cordis";
import { boundContextSummary, createUserMessage, errorChain } from "@deepseek-ai/dsh-llm";
import { deepFreeze, snapshotJsonValue } from "@deepseek-ai/dsh-util-values";
import { randomUUID } from "node:crypto";
import { isAbsolute } from "node:path";
import { brandString } from "@deepseek-ai/dsh-brand";
//#region lib/types/session.js
/** Workspace-backed Session creation for one settled webhook rule result. */
/** Require one non-empty string field from an untyped rule result. */
function requiredString(record, field) {
	const value = record[field];
	if (typeof value !== "string" || value.trim() === "") throw new TypeError(`webhook Session request ${field} must be a non-empty string`);
	return value;
}
/** Snapshot and validate a same-process rule result before crossing awaits. */
function resolveRequest(ctx, input) {
	const candidate = input;
	if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) throw new TypeError("webhook rule result must be null or a Session request object");
	const record = candidate;
	const workspacePath = requiredString(record, "workspacePath");
	if (!isAbsolute(workspacePath)) throw new TypeError(`webhook Session request workspacePath must be absolute, got ${JSON.stringify(workspacePath)}`);
	const title = requiredString(record, "title");
	const prompt = requiredString(record, "prompt");
	const agentPreset = requiredString(record, "agentPreset");
	const permissionPreset = requiredString(record, "permissionPreset");
	const model = record["model"];
	if (model !== void 0 && (model === null || typeof model !== "object" || Array.isArray(model))) throw new TypeError("webhook Session request model must be an object");
	let agentOptions;
	let modelSelection;
	if (model === void 0) {
		const selected = ctx.agentDefaultModel.currentSelection();
		agentOptions = {
			provider: selected.provider,
			model: selected.model
		};
		modelSelection = { ...selected };
	} else {
		const modelRecord = model;
		const provider = requiredString(modelRecord, "provider");
		const modelId = requiredString(modelRecord, "model");
		const maxTokens = modelRecord["maxTokens"];
		if (maxTokens !== void 0 && (typeof maxTokens !== "number" || !Number.isSafeInteger(maxTokens) || maxTokens <= 0)) throw new TypeError("webhook Session request model.maxTokens must be a positive safe integer");
		agentOptions = {
			provider,
			model: modelId,
			...maxTokens === void 0 ? {} : { maxTokens }
		};
		modelSelection = {
			provider,
			model: modelId
		};
	}
	return {
		workspacePath,
		title,
		prompt,
		agentPreset,
		permissionPreset,
		modelSelection,
		agentOptions
	};
}
/** Log a rollback failure without replacing the operation's original failure. */
function reportRollbackFailure(ctx, subject, error) {
	ctx.logger.warn(`webhook: ${subject} rollback failed: ${errorChain(error)}`);
}
/** Apply the creation-time selection until its first durable request header exists. */
function installInitialModelSelection(agentCtx, selection) {
	agentCtx.on("agent/request", async ({ agent }, next) => {
		const resolved = await next();
		if (agent.session.requestHeader() !== void 0 || resolved.provider !== selection.provider || resolved.model !== selection.model) return resolved;
		const { reasoningEffort: _inheritedEffort, ...withoutInheritedEffort } = resolved;
		return {
			...withoutInheritedEffort,
			...selection.reasoningEffort === void 0 ? {} : { reasoningEffort: selection.reasoningEffort }
		};
	});
}
/**
* Create, attach, title, configure, and prompt one ordinary root Session.
* Successful prompt admission ends webhook ownership of the operation; the
* Agent remains lifecycle-owned by `ctx` and follows normal Session behavior.
*
* @param ctx - untraced runtime context that owns the resulting Agent.
* @param delivery - exact verified provider delivery used for provenance.
* @param ruleId - rule that returned the request.
* @param request - same-process rule result.
* @param signal - registration lifetime cancellation through publication.
*/
async function createWebhookSession(ctx, delivery, ruleId, request, signal) {
	const resolved = resolveRequest(ctx, request);
	ctx.permissionPresets.resolve(resolved.permissionPreset);
	const preset = await ctx.agentPresets.resolve(resolved.agentPreset);
	await ctx.agentPresets.standingKeyFor(preset.id);
	signal.throwIfAborted();
	const workspace = await ctx.workspaceRegistry.create(resolved.workspacePath);
	signal.throwIfAborted();
	const sessionId = brandString(`webhook-${randomUUID()}`);
	const handle = await ctx.agents.create({
		sessionId,
		signal,
		meta: {
			cwd: workspace.path,
			agentPreset: preset.id
		},
		agentOptions: resolved.agentOptions,
		setup: async (agentCtx) => {
			await ctx.agentPresets.mount(agentCtx, preset.id);
			installInitialModelSelection(agentCtx, resolved.modelSelection);
		}
	});
	let attached = false;
	try {
		signal.throwIfAborted();
		await workspace.attachSession(sessionId);
		attached = true;
		signal.throwIfAborted();
		ctx.permissionPresets.set(handle.agent.session, resolved.permissionPreset);
		ctx.sessionTitle.rename(handle.agent.session, resolved.title);
		handle.agent.followup(createUserMessage({
			content: [{
				type: "text",
				text: resolved.prompt
			}],
			source: {
				kind: "webhook",
				provider: delivery.kind,
				source: delivery.source,
				deliveryId: delivery.deliveryId,
				ruleId,
				form: "notice",
				summary: boundContextSummary(`${delivery.kind} webhook handled by ${ruleId}`)
			}
		}));
	} catch (error) {
		if (attached) try {
			await workspace.detachSession(sessionId);
		} catch (rollbackError) {
			reportRollbackFailure(ctx, `Workspace detach for Session "${sessionId}"`, rollbackError);
		}
		try {
			await handle.dispose();
		} catch (rollbackError) {
			reportRollbackFailure(ctx, `Agent disposal for Session "${sessionId}"`, rollbackError);
		}
		throw error;
	}
}
//#endregion
//#region lib/types/brand.js
/** Opaque webhook identities shared by adapters, rules, and Session provenance. */
/**
* Brand a webhook rule id.
* @param value - non-empty rule identifier validated at registration.
* @returns the same string with its compile-time brand.
*/
function WebhookRuleId(value) {
	return value;
}
/**
* Brand a configured webhook source id.
* @param value - non-empty adapter instance identifier validated by its adapter.
* @returns the same string with its compile-time brand.
*/
function WebhookSourceId(value) {
	return value;
}
/**
* Brand a provider delivery id.
* @param value - non-empty provider identity validated by its adapter.
* @returns the same string with its compile-time brand.
*/
function WebhookDeliveryId(value) {
	return value;
}
//#endregion
//#region lib/types/index.js
/** Fire-and-forget webhook rule registry and Workspace-backed Session runtime. */
/** Validate and detach one delivery before sharing it across arbitrary rules. */
function snapshotDelivery(delivery) {
	if (typeof delivery.kind !== "string" || delivery.kind.trim() === "") throw new TypeError("webhook delivery kind must be a non-empty string");
	if (typeof delivery.source !== "string" || delivery.source.trim() === "") throw new TypeError("webhook delivery source must be a non-empty string");
	if (typeof delivery.deliveryId !== "string" || delivery.deliveryId.trim() === "") throw new TypeError("webhook delivery id must be a non-empty string");
	if (!Number.isSafeInteger(delivery.receivedAt) || delivery.receivedAt < 0) throw new TypeError("webhook delivery receivedAt must be a non-negative safe integer");
	const snapshot = snapshotJsonValue(delivery);
	if (snapshot === void 0) throw new TypeError("webhook delivery must be lossless JSON");
	return deepFreeze(snapshot);
}
/** Fire-and-forget rule runtime. Session creation is the only built-in action. */
var WebhookRuntime = class extends Service {
	static inject = [
		"agents",
		"agentDefaultModel",
		"agentPresets",
		"permissionPresets",
		"sessionTitle",
		"workspaceRegistry"
	];
	rules = /* @__PURE__ */ new Map();
	selfCtx;
	closing = false;
	constructor(ctx) {
		super(ctx, "webhookRuntime");
		this.selfCtx = ctx;
		ctx.effect(() => async () => {
			this.closing = true;
			/* v8 ignore next -- caller-owned registration effects normally dispose first; this covers provider-first unload. */
			await Promise.all([...this.rules.values()].map((rule) => this.disposeRegistration(rule)));
		}, "webhookRuntime.lifecycle()");
	}
	/**
	* Register one trusted programmatic rule.
	* @param rule - unique id, provider kind, and arbitrary callback.
	* @returns awaitable effect disposer that aborts and drains this rule's active callbacks.
	*/
	register(rule) {
		if (this.closing) throw new Error("webhook runtime is closing");
		if (typeof rule.id !== "string" || rule.id.trim() === "") throw new TypeError("webhook rule id must be a non-empty string");
		if (typeof rule.kind !== "string" || rule.kind.trim() === "") throw new TypeError(`webhook rule "${String(rule.id)}" kind must be a non-empty string`);
		if (typeof rule.run !== "function") throw new TypeError(`webhook rule "${String(rule.id)}" requires run()`);
		const erased = rule;
		let registration;
		const disposeEffect = this.ctx.effect(() => {
			/* v8 ignore next -- no await separates the public liveness check from this initializer. */
			if (this.closing) throw new Error("webhook runtime is closing");
			if (this.rules.has(rule.id)) throw new Error(`webhook rule "${rule.id}" is already registered`);
			registration = {
				rule: erased,
				controller: new AbortController(),
				active: /* @__PURE__ */ new Set(),
				closing: false
			};
			this.rules.set(rule.id, registration);
			return () => this.disposeRegistration(registration);
		}, `webhookRuntime.register(${rule.id})`);
		return async () => {
			await disposeEffect();
		};
	}
	/**
	* Start every currently matching rule and return before any callback settles.
	* @param delivery - authenticated provider data; snapshotted before dispatch.
	* @throws synchronously when the runtime is closing or the delivery is malformed.
	*/
	dispatch(delivery) {
		if (this.closing) throw new Error("webhook runtime is closing");
		const snapshot = snapshotDelivery(delivery);
		for (const registration of [...this.rules.values()]) {
			if (registration.closing || registration.rule.kind !== snapshot.kind) continue;
			this.startInvocation(registration, snapshot);
		}
	}
	/** Start one contained invocation and attach it to registration teardown. */
	startInvocation(registration, delivery) {
		const tracked = Promise.resolve().then(async () => {
			registration.controller.signal.throwIfAborted();
			const request = await registration.rule.run(delivery, registration.controller.signal);
			registration.controller.signal.throwIfAborted();
			if (request !== null) await createWebhookSession(this.selfCtx, delivery, registration.rule.id, request, registration.controller.signal);
		}).catch((error) => {
			const invocation = `webhook: provider=${JSON.stringify(delivery.kind)} source=${JSON.stringify(delivery.source)} delivery=${JSON.stringify(delivery.deliveryId)} rule=${JSON.stringify(registration.rule.id)}`;
			if (registration.controller.signal.aborted) this.selfCtx.logger.debug(`${invocation} stopped after disposal: ${errorChain(error)}`);
			else this.selfCtx.logger.warn(`${invocation} failed: ${errorChain(error)}`);
		}).finally(() => {
			registration.active.delete(tracked);
		});
		registration.active.add(tracked);
	}
	/** Memoized registration teardown: hide, abort, then drain. */
	disposeRegistration(registration) {
		registration.disposal ??= (async () => {
			registration.closing = true;
			this.rules.delete(registration.rule.id);
			registration.controller.abort(/* @__PURE__ */ new Error(`webhook rule "${registration.rule.id}" was disposed`));
			while (registration.active.size > 0) await Promise.allSettled([...registration.active]);
		})();
		return registration.disposal;
	}
};
//#endregion
export { WebhookDeliveryId, WebhookRuleId, WebhookRuntime, WebhookRuntime as default, WebhookSourceId };

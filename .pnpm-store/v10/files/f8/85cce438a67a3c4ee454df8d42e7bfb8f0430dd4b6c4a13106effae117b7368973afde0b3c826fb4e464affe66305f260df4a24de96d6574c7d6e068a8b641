import Schema from "@deepseek-ai/schemastery";
import { JsonRpcLineTransport } from "@deepseek-ai/dsh-sdk-protocol";
import { resolve } from "node:path";
import { brandString } from "@deepseek-ai/dsh-brand";
import { admitEncodedImages } from "@deepseek-ai/dsh-attachment";
import { ReasoningEffortId, createUserMessage } from "@deepseek-ai/dsh-llm";
import { carrierKeyOf } from "@deepseek-ai/dsh-scope";
import * as LlmDeepSeek from "@deepseek-ai/dsh-llm-deepseek";
//#region lib/types/server.js
/**
* JSON-RPC methods and notifications for out-of-process harness SDKs.
* The surrounding context owns plugins, persistence, and configured adapters.
*
* @module @deepseek-ai/dsh-sdk-jsonrpc-server/server
*/
function encodedImage(block) {
	return block.type === "image" && "data" in block;
}
async function durablePromptContent(ctx, blocks) {
	const images = blocks.filter(encodedImage);
	if (images.length === 0) return blocks;
	const attachments = ctx.get("attachments");
	if (attachments === void 0) throw new Error("SDK image prompt requires an attachment store");
	const refs = await admitEncodedImages(attachments, images.map((image) => ({
		data: image.data,
		mediaType: image.mimeType
	})));
	let next = 0;
	return blocks.map((block) => encodedImage(block) ? {
		type: "image",
		attachment: refs[next++]
	} : block);
}
/** Recover the delegating parent from the service-owned scoped carrier. */
function subagentParentOf(carrier) {
	return carrierKeyOf(carrier);
}
function successStatus(reason, options) {
	if (reason === "completed") return "ok";
	return reason === "max-tokens" && options.maxTokensAsSuccess === true ? "ok" : "error";
}
/**
* SDK server over one booted harness context and transport peer. Construction
* subscribes to session, agent, and subagent lifecycle events until shutdown;
* reinitialization is unsupported.
*/
var HarnessSdkJsonRpcServer = class {
	ctx;
	transport;
	options;
	cwd = process.cwd();
	provider = "deepseek-official";
	model = "deepseek-official";
	reasoningEffort;
	maxTokens;
	llmFiber;
	sessions = /* @__PURE__ */ new Map();
	sessionCreations = /* @__PURE__ */ new Map();
	disposers = [];
	shutdownTask;
	shuttingDown = false;
	initialized = false;
	constructor(ctx, transport, options = {}) {
		this.ctx = ctx;
		this.transport = transport;
		this.options = options;
		const serverOptions = this.options;
		this.disposers.push(ctx.on("session/event", (session, event) => {
			const payload = {
				sessionId: String(session.id),
				event
			};
			this.transport.notify("session.event", payload);
		}));
		this.disposers.push(ctx.on("agent/status", ({ agent, status }) => {
			this.transport.notify("session.status", {
				sessionId: String(agent.session.id),
				status
			});
		}));
		this.disposers.push(ctx.on("session/created", (session) => {
			const parentSession = session.header.parentSession;
			if (parentSession === void 0) return;
			const payload = {
				parentSessionId: String(parentSession),
				childSessionId: String(session.id)
			};
			this.transport.notify("subagent.started", payload);
		}));
		this.disposers.push(ctx.on("subagent/end", function(info) {
			const parent = subagentParentOf(this);
			if (!info.local) return;
			const payload = {
				provider: info.provider,
				agentId: String(info.id),
				parentSessionId: String(parent.session.id),
				childSessionId: String(info.id),
				status: successStatus(info.stopReason, serverOptions),
				stopReason: info.stopReason,
				...info.lastAssistantMessage === void 0 ? {} : { lastAssistantMessage: info.lastAssistantMessage }
			};
			transport.notify("subagent.finished", payload);
		}));
	}
	/**
	* Validate and configure the SDK route, mounting the DeepSeek fallback only when unowned.
	* @param params - SDK handshake parameters.
	* @returns server identity for the handshake.
	*/
	async initialize(params) {
		if (params.reasoningEffort !== void 0 && (typeof params.reasoningEffort !== "string" || params.reasoningEffort.length === 0)) throw new TypeError("initialize reasoningEffort must be a non-empty string");
		if (params.maxTokens !== void 0 && (!Number.isSafeInteger(params.maxTokens) || params.maxTokens <= 0)) throw new TypeError("initialize maxTokens must be a positive safe integer");
		const cwd = resolve(params.cwd);
		const provider = params.provider;
		const model = params.model;
		const reasoningEffort = params.reasoningEffort === void 0 ? void 0 : ReasoningEffortId(params.reasoningEffort);
		if (!this.hasAdapterFor(provider)) {
			if (provider !== "deepseek-official") throw new Error(`no adapter registered for provider "${provider}"`);
			this.llmFiber = await this.ctx.plugin(LlmDeepSeek, {});
		}
		await this.ctx.get("llm").resolveCallConfig({
			provider,
			model,
			...reasoningEffort === void 0 ? {} : { reasoningEffort },
			...params.maxTokens === void 0 ? {} : { maxTokens: params.maxTokens }
		});
		this.cwd = cwd;
		this.provider = provider;
		this.model = model;
		this.reasoningEffort = reasoningEffort;
		this.maxTokens = params.maxTokens;
		this.initialized = true;
		return { serverInfo: {
			name: "deepseek-harness-sdk-runtime",
			version: "0.0.1"
		} };
	}
	/**
	* Queue one identified prompt without assigning later activity to it.
	* @param params - target session and user content.
	* @returns the durable message identity.
	*/
	async prompt(params) {
		if (!this.initialized) throw new Error("SDK server is not initialized");
		const rec = await this.getOrCreateSession(params.sessionId);
		this.assertLiveAgent(rec, params.sessionId);
		const content = await durablePromptContent(this.ctx, params.contentBlocks);
		this.assertLiveAgent(rec, params.sessionId);
		const message = createUserMessage({
			content,
			source: { kind: "user" }
		});
		rec.handle.agent.followup(message);
		return { messageId: message.id };
	}
	assertLiveAgent(rec, sessionId) {
		if (this.ctx.agents.get(rec.handle.agent.id) !== rec.handle.agent) throw new Error(`session agent was disposed outside the server: ${sessionId}`);
	}
	/**
	* Dispose server-owned agents, adapter, and subscriptions to quiescence.
	* The surrounding context remains running.
	* @returns empty JSON-RPC result.
	*/
	shutdown() {
		this.shutdownTask ??= this.performShutdown();
		return this.shutdownTask;
	}
	async performShutdown() {
		this.shuttingDown = true;
		const pendingCreations = [...this.sessionCreations.values()];
		await Promise.allSettled(pendingCreations);
		this.sessionCreations.clear();
		const records = [...this.sessions.values()];
		this.sessions.clear();
		const failures = [];
		while (this.disposers.length > 0) try {
			this.disposers.pop()?.();
		} catch (error) {
			failures.push(error);
		}
		const teardownResults = await Promise.allSettled([...records.map((rec) => Promise.resolve().then(() => rec.handle.dispose())), ...this.llmFiber === void 0 ? [] : [Promise.resolve().then(() => this.llmFiber?.dispose())]]);
		this.llmFiber = void 0;
		failures.push(...teardownResults.filter((result) => result.status === "rejected").map((result) => result.reason));
		if (failures.length === 1) throw failures[0];
		if (failures.length > 1) throw new AggregateError(failures, "SDK server teardown failed");
		return {};
	}
	/**
	* Dispatch one incoming JSON-RPC request to its typed handler. Throws (→ a
	* JSON-RPC error response) on an unknown method.
	* @param method - the JSON-RPC method name.
	* @param params - the raw params object from the wire.
	* @returns the handler's result, to be serialized as the response.
	*/
	async handleRequest(method, params) {
		switch (method) {
			case "initialize": return this.initialize(params);
			case "session/prompt": return this.prompt(params);
			case "shutdown": return this.shutdown();
			default: throw new Error(`unknown DeepSeek Harness SDK runtime method: ${method}`);
		}
	}
	async getOrCreateSession(sessionId) {
		if (this.shuttingDown) throw new Error("SDK server is shutting down");
		const existing = this.sessions.get(sessionId);
		if (existing) return existing;
		const pending = this.sessionCreations.get(sessionId);
		if (pending) return pending;
		const creation = this.createSession(sessionId);
		this.sessionCreations.set(sessionId, creation);
		creation.then(() => {
			this.sessionCreations.delete(sessionId);
		}, () => {
			this.sessionCreations.delete(sessionId);
		});
		return creation;
	}
	async createSession(sessionId) {
		const rec = { handle: await this.ctx.agents.create({
			sessionId: brandString(sessionId),
			meta: { cwd: this.cwd },
			agentOptions: {
				provider: this.provider,
				model: this.model,
				...this.reasoningEffort === void 0 ? {} : { reasoningEffort: this.reasoningEffort },
				...this.maxTokens === void 0 ? {} : { maxTokens: this.maxTokens }
			}
		}) };
		this.sessions.set(sessionId, rec);
		return rec;
	}
	hasAdapterFor(provider) {
		return this.ctx.get("llm")?.listProviders().some((entry) => entry.id === provider) ?? false;
	}
};
//#endregion
//#region lib/types/index.js
/**
* SDK-facing JSON-RPC plugin over stdio. The selected dsh profile decides
* whether to load it; see the single-launch Agent Note and package README.
* Stdout is reserved for protocol frames, so the tree must not load a stdout logger.
* This plugin answers `shutdown`, disposes the complete root runtime, and exits 0; the app bin
* owns EOF and signal exits. Keep named plugin exports with no default export so
* Loader `unwrapExports` preserves `name`, `inject`, `Config`, and `apply`.
*
* @module @deepseek-ai/dsh-sdk-jsonrpc-server
*/
const name = "sdk-jsonrpc-server";
const inject = ["agents"];
const Config = Schema.object({ maxTokensAsSuccess: Schema.boolean().default(false) });
/**
* Serve SDK requests over the configured streams. Effect disposal shuts down
* SDK-created agents and closes the transport. A `shutdown` response is flushed
* before the root runtime is disposed and the process exits 0; the app bin
* owns root-context disposal for EOF and signals.
*/
function apply(ctx, config) {
	const resolvedConfig = config;
	const rootFiber = ctx.root.fiber;
	/* v8 ignore next -- production stdio wiring; tests always inject the runtime hooks */
	const input = config.input ?? process.stdin;
	/* v8 ignore next -- production stdio wiring; tests always inject the runtime hooks */
	const output = config.output ?? process.stdout;
	/* v8 ignore next -- production exit wiring; tests always inject the runtime hooks */
	const exit = config.exit ?? ((code) => {
		process.exit(code);
	});
	const transport = new JsonRpcLineTransport(input, output);
	const server = new HarnessSdkJsonRpcServer(ctx, transport, { maxTokensAsSuccess: resolvedConfig.maxTokensAsSuccess });
	let exitTask;
	const disposeAndExit = () => {
		exitTask ??= (async () => {
			await Promise.allSettled([Promise.resolve().then(() => transport.flush())]);
			await Promise.allSettled([Promise.resolve().then(() => rootFiber.dispose())]);
			exit(0);
		})();
		return exitTask;
	};
	transport.onRequest(async (method, params) => {
		if (method === "initialize") await ctx.get("loader")?.await();
		const result = await server.handleRequest(method, params);
		if (method === "shutdown") setImmediate(() => {
			disposeAndExit();
		});
		return result;
	});
	ctx.effect(() => {
		transport.start();
		return async () => {
			await server.shutdown();
			transport.close();
		};
	}, "jsonrpc.serve");
}
//#endregion
export { Config, HarnessSdkJsonRpcServer, apply, inject, name };

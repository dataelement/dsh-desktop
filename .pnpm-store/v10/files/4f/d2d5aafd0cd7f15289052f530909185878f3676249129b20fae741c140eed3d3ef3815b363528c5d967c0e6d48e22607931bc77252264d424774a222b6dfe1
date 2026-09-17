import { Buffer as Buffer$1 } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { Readable, Writable } from "node:stream";
import Schema from "@deepseek-ai/schemastery";
import { brandString } from "@deepseek-ai/dsh-brand";
import { ReasoningEffortId, createUserMessage, errorChain } from "@deepseek-ai/dsh-llm";
import { PROTOCOL_VERSION, RequestError, agent, methods, ndJsonStream } from "@agentclientprotocol/sdk";
import { isImageAdmissionError } from "@deepseek-ai/dsh-attachment";
import { validateHeaderName, validateHeaderValue } from "node:http";
import * as McpClient from "@deepseek-ai/dsh-mcp-client";
import { installModelSelection } from "@deepseek-ai/dsh-agent";
//#region lib/types/content.js
/** ACP wire-content admission and projection owned by the ACP adapter. @module */
/** Raster formats shared by ACP image blocks and the core attachment vocabulary. */
const IMAGE_MEDIA_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif"
];
/** Canonical RFC 4648 base64, excluding whitespace and URL-safe aliases. */
const CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
/** Error with a stable ACP request-failure category and no raw binary payload. */
var AcpContentError = class extends Error {
	/** Whether the bridge should report invalid params or an internal failure. */
	kind;
	/**
	* @param message - safe protocol-facing detail without inline binary data.
	* @param kind - request-failure category.
	* @param options - optional causal chain for diagnostics.
	*/
	constructor(message, kind, options) {
		super(message, options);
		this.name = "AcpContentError";
		this.kind = kind;
	}
};
/** Narrow a wire MIME string to the durable raster vocabulary. */
function imageMediaType(value) {
	return IMAGE_MEDIA_TYPES.includes(value) ? value : void 0;
}
/** Strictly decode one ACP inline image without accepting base64 aliases. */
function decodeImage(block) {
	const mediaType = imageMediaType(block.mimeType);
	if (mediaType === void 0) throw new AcpContentError("image mimeType must be image/png, image/jpeg, image/webp, or image/gif", "invalid");
	if (!CANONICAL_BASE64.test(block.data)) throw new AcpContentError("image data must be canonical base64", "invalid");
	const data = Buffer.from(block.data, "base64");
	if (data.toString("base64") !== block.data) throw new AcpContentError("image data must be canonical base64", "invalid");
	return {
		data,
		mediaType
	};
}
/** Resolve the exact current route and require explicit image input support. */
async function assertImageRoute(ctx, route, signal) {
	const provider = route?.provider;
	const model = route?.model;
	const llm = ctx.get("llm");
	if (provider === void 0 || model === void 0 || llm === void 0) throw new AcpContentError("the current model route could not be resolved for image input", "invalid");
	let info;
	try {
		info = await llm.resolveModelInfo(provider, model, signal);
	} catch (error) {
		throw new AcpContentError("the current model route could not be verified for image input", "internal", { cause: error });
	}
	if (info.inputModalities === void 0 || !info.inputModalities.includes("image")) throw new AcpContentError(`model "${model}" does not declare image input`, "invalid");
}
/**
* Determine whether initialization may truthfully advertise inline image prompts.
* Unknown service, route, capability, or deployment media support is negative.
* @param ctx - bridge context carrying optional attachment and model services.
* @param provider - configured provider route used for newly created sessions.
* @param model - configured exact model id used for newly created sessions.
* @returns whether this bridge can admit images at initialization time.
*/
async function supportsAcpImagePrompts(ctx, provider, model) {
	const attachments = ctx.get("attachments");
	const llm = ctx.get("llm");
	if (attachments === void 0 || llm === void 0 || provider === void 0 || model === void 0) return false;
	if (!attachments.imageLimits.mediaTypes.some((mediaType) => IMAGE_MEDIA_TYPES.includes(mediaType))) return false;
	try {
		return (await llm.resolveModelInfo(provider, model)).inputModalities?.includes("image") === true;
	} catch {
		return false;
	}
}
/** Render one baseline resource link into the core's current text vocabulary. */
function resourceLinkText(block) {
	return `\n[resource_link name=${JSON.stringify(block.name)} uri=${JSON.stringify(block.uri)}]\n`;
}
/**
* Admit one ACP prompt into ordered durable core content.
* Every wire block and image is validated before the ordered image batch starts
* writing; cancellation after a successful content-addressed write may leave an
* unreachable object but never queues a late user message.
* @param ctx - bridge context carrying attachment and model services.
* @param route - selection pinned to the accepted prompt.
* @param prompt - untrusted ACP prompt blocks in wire order.
* @param imageEnabled - capability result advertised during initialization.
* @param signal - admission cancellation signal.
* @returns core content with durable image references in wire order.
*/
async function admitAcpPrompt(ctx, route, prompt, imageEnabled, signal) {
	const images = [];
	for (const block of prompt) switch (block.type) {
		case "text":
		case "resource_link": break;
		case "image":
			if (!imageEnabled) throw new AcpContentError("inline image prompts were not advertised by this connection", "invalid");
			images.push(decodeImage(block));
			break;
		case "audio": throw new AcpContentError("audio prompt content is not supported", "invalid");
		case "resource": throw new AcpContentError("embedded resource prompt content is not supported", "invalid");
		/* v8 ignore next 2 -- ACP ContentBlock is a closed generated union. */
		default: throw new AcpContentError("unsupported ACP prompt content", "invalid");
	}
	let refs = [];
	if (images.length > 0) {
		const attachments = ctx.get("attachments");
		if (attachments === void 0) throw new AcpContentError("no attachment store is mounted", "invalid");
		await assertImageRoute(ctx, route, signal);
		signal.throwIfAborted();
		try {
			refs = await attachments.saveImages(images);
		} catch (error) {
			if (isImageAdmissionError(error)) throw new AcpContentError(error.message, "invalid", { cause: error });
			throw new AcpContentError("unable to persist the prompt image batch", "internal", { cause: error });
		}
		signal.throwIfAborted();
	}
	const content = [];
	let pendingText = "";
	let imageIndex = 0;
	const flushText = () => {
		if (pendingText.length === 0) return;
		content.push({
			type: "text",
			text: pendingText
		});
		pendingText = "";
	};
	for (const block of prompt) switch (block.type) {
		case "text":
			pendingText += block.text;
			break;
		case "resource_link":
			pendingText += resourceLinkText(block);
			break;
		case "image": {
			flushText();
			const ref = refs[imageIndex++];
			content.push({
				type: "image",
				attachment: ref
			});
			break;
		}
		/* v8 ignore start -- the validation pass above rejects both tags before reconstruction. */
		case "audio":
		case "resource": break;
		/* v8 ignore stop */
		/* v8 ignore next 2 -- validated by the first closed-union switch. */
		default: break;
	}
	flushText();
	if (!content.some((block) => block.type === "image" || block.type === "text" && block.text.trim().length > 0)) throw new AcpContentError("empty prompt", "invalid");
	return content;
}
/**
* Translate one committed assistant block to ACP wire content.
* Images are re-read and integrity-verified before inline base64 delivery;
* unsupported core output blocks stay off the automation wire.
* @param ctx - bridge context carrying the authoritative attachment store.
* @param block - committed core assistant block.
* @returns ACP text/image content, or undefined for non-output blocks.
*/
async function assistantBlockToAcp(ctx, block) {
	if (block.type === "text") return block.text.length === 0 ? void 0 : {
		type: "text",
		text: block.text
	};
	if (block.type !== "image") return void 0;
	const attachments = ctx.get("attachments");
	if (attachments === void 0) throw new AcpContentError("cannot deliver assistant image: no attachment store is mounted", "internal");
	let stored;
	try {
		stored = await attachments.readImage(block.attachment);
	} catch (error) {
		throw new AcpContentError("cannot deliver assistant image: the attachment is unavailable or corrupt", "internal", { cause: error });
	}
	return {
		type: "image",
		data: Buffer.from(stored.data).toString("base64"),
		mimeType: stored.ref.mediaType
	};
}
//#endregion
//#region lib/types/mcp.js
/** Standard ACP MCP-server declarations translated into Agent-scoped DSH MCP clients. */
const VALID_SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/;
/** Caller-correctable MCP declaration failure. */
var AcpMcpConfigError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "AcpMcpConfigError";
	}
};
/**
* Validate and mount one session's complete standard MCP server list before Agent publication.
* @param agentCtx - unpublished Agent scope that owns the MCP clients and tools.
* @param servers - stable ACP stdio or HTTP server declarations.
* @param sessionCwd - canonical primary workspace used by stdio servers.
*/
async function mountAcpMcpServers(agentCtx, servers, sessionCwd) {
	const configs = resolveMcpConfigs(servers, sessionCwd);
	for (const config of configs) await agentCtx.plugin(McpClient, config);
}
/** Convert the stable stdio/HTTP ACP transports and reject every other transport. */
function resolveMcpConfigs(servers, sessionCwd) {
	const names = /* @__PURE__ */ new Set();
	return servers.map((server, index) => {
		const serverName = normalizeServerName(server.name);
		if (names.has(serverName)) throw new AcpMcpConfigError(`mcpServers contains duplicate normalized name: ${serverName}`);
		names.add(serverName);
		if (!("type" in server)) {
			if (!isAbsolute(server.command)) throw new AcpMcpConfigError(`mcpServers[${index}].command must be an absolute path`);
			const env = entriesToRecord(server.env, `mcpServers[${index}].env`, "environment");
			return {
				...validateClientConfig(index, () => McpClient.Config({
					transport: "stdio",
					serverName,
					command: server.command,
					args: server.args,
					env,
					cwd: sessionCwd,
					failOnStartupError: true
				})),
				env
			};
		}
		if (server.type === "http") {
			assertHttpUrl(server.url, `mcpServers[${index}].url`);
			const headers = entriesToRecord(server.headers, `mcpServers[${index}].headers`, "header");
			return {
				...validateClientConfig(index, () => McpClient.Config({
					transport: "streamable-http",
					serverName,
					url: server.url,
					headers,
					failOnStartupError: true
				})),
				headers
			};
		}
		throw new AcpMcpConfigError(`mcpServers[${index}] transport ${server.type} is not supported`);
	});
}
/** Convert ordered ACP name/value entries without silently accepting duplicate keys. */
function entriesToRecord(entries, field, kind) {
	const result = Object.create(null);
	const names = /* @__PURE__ */ new Set();
	for (const entry of entries) {
		if (kind === "header") try {
			validateHeaderName(entry.name);
			validateHeaderValue(entry.name, entry.value);
		} catch (_invalidHeader) {
			throw new AcpMcpConfigError(`${field} contains an invalid header entry`);
		}
		else if (entry.name.length === 0 || entry.name.includes("=") || entry.name.includes("\0") || entry.value.includes("\0")) throw new AcpMcpConfigError(`${field} contains an invalid environment entry`);
		const identity = kind === "header" ? entry.name.toLowerCase() : entry.name;
		if (names.has(identity)) throw new AcpMcpConfigError(`${field} contains duplicate name: ${entry.name}`);
		names.add(identity);
		result[entry.name] = entry.value;
	}
	return result;
}
/** Produce a stable DSH tool namespace from ACP's human-readable server name. */
function normalizeServerName(name) {
	if (name.trim().length === 0 || /[\u0000-\u001f\u007f]/.test(name)) throw new AcpMcpConfigError("mcpServers contains an invalid server name");
	if (VALID_SERVER_NAME.test(name)) return name;
	return `${name.normalize("NFKD").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 20) || "server"}_${createHash("sha256").update(name).digest("hex").slice(0, 8)}`.slice(0, 32);
}
/** Require the stable Streamable HTTP transport URL schemes. */
function assertHttpUrl(value, field) {
	try {
		const url = new URL(value);
		if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
	} catch (_invalidUrl) {
		throw new AcpMcpConfigError(`${field} must be an absolute HTTP(S) URL`);
	}
}
/** Map the existing MCP provider's schema error into ACP invalid params. */
function validateClientConfig(index, parse) {
	try {
		return parse();
	} catch (error) {
		throw new AcpMcpConfigError(`mcpServers[${index}] is invalid: ${error instanceof Error ? error.message : String(error)}`);
	}
}
//#endregion
//#region lib/types/model-control.js
/** Standard ACP session configuration over one Agent's model selection. */
const MODEL_CONFIG_ID = "model";
const REASONING_CONFIG_ID = "reasoning_effort";
const PROVIDER_DEFAULT_REASONING_VALUE = "";
/** Caller-correctable session configuration failure. */
var AcpModelConfigError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "AcpModelConfigError";
	}
};
/** Project and mutate one Agent's provider/model/reasoning selection through ACP config options. */
var AcpModelControl = class {
	llm;
	/** Scoped selection reference consumed by Agent request assembly. */
	selection;
	tail = Promise.resolve();
	selected;
	turnSelection;
	hasResolvedState = false;
	constructor(llm, initial) {
		this.llm = llm;
		this.selected = initial;
		const getCurrent = () => this.turnSelection?.selection ?? this.selected;
		const setCurrent = (value) => {
			this.selected = value;
		};
		this.selection = {
			get current() {
				return getCurrent();
			},
			set current(value) {
				setCurrent(value);
			},
			assembled: void 0
		};
	}
	/**
	* Install request/prompt consistency listeners in the unpublished Agent scope.
	* @param agentCtx - Agent scope that consumes this selection.
	*/
	install(agentCtx) {
		installModelSelection(agentCtx, this.selection);
	}
	/**
	* Snapshot the selection attached to the next accepted ACP prompt.
	* @returns a detached future selection, or undefined when listeners supply the route.
	*/
	snapshot() {
		return this.selected === void 0 ? void 0 : { ...this.selected };
	}
	/**
	* Pin one admitted ACP message's selection for every step in its turn.
	* @param turn - admitted Agent turn.
	* @param selection - exact prompt-admission selection.
	*/
	pinTurn(turn, selection) {
		this.turnSelection = {
			turn,
			selection: { ...selection }
		};
	}
	/**
	* Release only the exact completed turn's routing override.
	* @param turn - completed Agent turn.
	*/
	releaseTurn(turn) {
		if (this.turnSelection?.turn === turn) this.turnSelection = void 0;
	}
	/**
	* Return the complete standard config-option state after prior mutations settle.
	* @param signal - optional catalog and exact-model cancellation.
	* @returns all current standard configuration options.
	*/
	options(signal) {
		return this.serialize(async () => (await this.state(signal)).options);
	}
	/**
	* Set one advertised option and return the complete resulting option state.
	* @param configId - standard option id.
	* @param value - opaque selected value returned by a previous option state.
	* @param signal - optional catalog and exact-model cancellation.
	* @returns all standard options after the serialized mutation.
	*/
	set(configId, value, signal) {
		return this.serialize(async () => {
			if (typeof value !== "string") throw new AcpModelConfigError(`${configId} requires a select value`);
			const current = this.selected;
			if (current === void 0) throw new AcpModelConfigError("this session has no model selection");
			if (configId === MODEL_CONFIG_ID) {
				const selected = (await this.state(signal)).choices.get(value);
				if (selected === void 0) throw new AcpModelConfigError(`unknown model option: ${value}`);
				await this.resolveSelection(selected, signal);
				this.selected = selected;
			} else if (configId === REASONING_CONFIG_ID) {
				const info = await this.llm.resolveModelInfo(current.provider, current.model, signal);
				const providerDefault = value === PROVIDER_DEFAULT_REASONING_VALUE && info.reasoning?.defaultEffort === void 0;
				if (info.reasoning === void 0 || !providerDefault && !info.reasoning.efforts.some((effort) => effort.id === value)) throw new AcpModelConfigError(`unknown reasoning effort for ${current.provider}/${current.model}: ${value}`);
				this.selected = await this.resolveSelection({
					provider: current.provider,
					model: current.model,
					...providerDefault ? {} : { reasoningEffort: ReasoningEffortId(value) }
				}, signal);
			} else throw new AcpModelConfigError(`unknown session config option: ${configId}`);
			return (await this.state(signal)).options;
		});
	}
	/** Keep concurrent client mutations in receive order without wedging after rejection. */
	serialize(operation) {
		const result = this.tail.then(operation);
		this.tail = result.then(() => void 0, () => void 0);
		return result;
	}
	/** Build detached model choices and the dependent reasoning option. */
	async state(signal) {
		const selected = this.selected;
		if (selected === void 0) return {
			choices: /* @__PURE__ */ new Map(),
			options: []
		};
		let resolved;
		let routeAvailable = true;
		try {
			resolved = await this.resolveSelection(selected, signal);
			this.hasResolvedState = true;
		} catch (error) {
			if (!this.hasResolvedState) throw error;
			resolved = selected;
			routeAvailable = false;
		}
		const choices = /* @__PURE__ */ new Map();
		const groups = await Promise.all(this.llm.listProviders().map(async (provider) => {
			try {
				const entries = (await this.llm.listModels(provider.id)).map((model) => {
					const choice = {
						value: modelValue(provider.id, model.id),
						selection: {
							provider: provider.id,
							model: model.id
						}
					};
					choices.set(choice.value, choice.selection);
					return {
						value: choice.value,
						name: model.name,
						...model.description === void 0 ? {} : { description: model.description }
					};
				});
				return {
					group: provider.id,
					name: provider.name,
					options: entries
				};
			} catch (_providerCatalogUnavailable) {
				return {
					group: provider.id,
					name: provider.name,
					options: []
				};
			}
		}));
		const currentValue = modelValue(resolved.provider, resolved.model);
		if (!choices.has(currentValue)) {
			choices.set(currentValue, {
				provider: resolved.provider,
				model: resolved.model
			});
			let group = groups.find((item) => item.group === resolved.provider);
			if (group === void 0) {
				group = {
					group: resolved.provider,
					name: resolved.provider,
					options: []
				};
				groups.push(group);
			}
			group.options.unshift({
				value: currentValue,
				name: resolved.model
			});
		}
		const options = [{
			id: MODEL_CONFIG_ID,
			name: "Model",
			category: "model",
			type: "select",
			currentValue,
			options: groups.filter((group) => group.options.length > 0)
		}];
		const info = routeAvailable ? await this.llm.resolveModelInfo(resolved.provider, resolved.model, signal) : void 0;
		if (info?.reasoning !== void 0) options.push({
			id: REASONING_CONFIG_ID,
			name: "Reasoning effort",
			category: "thought_level",
			type: "select",
			currentValue: resolved.reasoningEffort === void 0 ? PROVIDER_DEFAULT_REASONING_VALUE : String(resolved.reasoningEffort),
			options: [...info.reasoning.defaultEffort === void 0 ? [{
				value: PROVIDER_DEFAULT_REASONING_VALUE,
				name: "Provider default"
			}] : [], ...info.reasoning.efforts.map((effort) => ({
				value: String(effort.id),
				name: effort.name,
				...effort.description === void 0 ? {} : { description: effort.description }
			}))]
		});
		return {
			choices,
			options
		};
	}
	/** Validate an exact route and retain only Agent-owned selection fields. */
	async resolveSelection(selection, signal) {
		const resolved = await this.llm.resolveCallConfig(selection, signal);
		return {
			provider: resolved.provider,
			model: resolved.model,
			...resolved.reasoningEffort === void 0 ? {} : { reasoningEffort: resolved.reasoningEffort }
		};
	}
};
/** Opaque ACP selector value carrying the full route identity. */
function modelValue(provider, model) {
	return JSON.stringify([provider, model]);
}
//#endregion
//#region lib/types/codec.js
/**
* Pure translation between the harness lifecycle and the automation-only ACP wire.
* @module @deepseek-ai/dsh-acp/codec
*/
/**
* Map a harness turn ending to ACP's terminal reason vocabulary.
* @param reason - harness turn outcome.
* @returns the closest legal ACP stop reason.
*/
function turnEndToStopReason(reason) {
	switch (reason.kind) {
		case "completed": return "end_turn";
		case "max-tokens": return "max_tokens";
		case "aborted": return "end_turn";
		case "interrupted": return "cancelled";
		case "blocked":
		case "error": return "end_turn";
		/* v8 ignore next 2 -- TurnEndReason is closed and every member is handled above */
		default: return "end_turn";
	}
}
//#endregion
//#region lib/types/updates.js
/** Standard ACP updates derived from committed DSH session events. */
/**
* Convert one committed assistant message and its context usage in block order.
* @param ctx - bridge context carrying attachment and token-meter services.
* @param session - durable session used for context pressure.
* @param event - committed assistant message event.
* @returns ordered standard thought, message, and optional usage updates.
*/
async function assistantUpdates(ctx, session, event) {
	const updates = [];
	for (const block of event.data.message.content) {
		if (block.type === "reasoning") {
			if (block.text.length > 0) updates.push({
				sessionUpdate: "agent_thought_chunk",
				messageId: event.data.message.id,
				content: {
					type: "text",
					text: block.text
				}
			});
			continue;
		}
		const content = await assistantBlockToAcp(ctx, block);
		if (content !== void 0) updates.push({
			sessionUpdate: "agent_message_chunk",
			messageId: event.data.message.id,
			content
		});
	}
	const usage = usageUpdate(ctx, session, event);
	if (usage !== void 0) updates.push(usage);
	return updates;
}
/**
* Start one generic ACP tool lifecycle from the durable call fact.
* @param event - committed DSH tool-call event.
* @returns the standard generic tool-call update.
*/
function toolCallUpdate(event) {
	return {
		sessionUpdate: "tool_call",
		toolCallId: event.data.callId,
		title: event.data.name,
		kind: "other",
		status: "in_progress",
		rawInput: parseToolArguments(event.data.arguments)
	};
}
/**
* Finish one generic ACP tool lifecycle from its committed model-facing result.
* @param ctx - bridge context carrying the attachment store.
* @param event - committed DSH tool-result event.
* @returns the standard completed or failed tool-call update.
*/
async function toolResultUpdate(ctx, event) {
	const result = event.data.message.content[0];
	const content = [];
	for (const block of result.content) {
		const converted = await assistantBlockToAcp(ctx, block);
		if (converted !== void 0) content.push({
			type: "content",
			content: converted
		});
	}
	return {
		sessionUpdate: "tool_call_update",
		toolCallId: result.toolCallId,
		status: result.isError === true ? "failed" : "completed",
		content
	};
}
/** Report current context occupancy only when DSH has both usage and capacity facts. */
function usageUpdate(ctx, session, event) {
	if (event.data.usage === void 0) return void 0;
	const size = session.requestContext()?.contextWindow;
	const meter = ctx.get("tokenMeter");
	if (size === void 0 || meter === void 0) return void 0;
	return {
		sessionUpdate: "usage_update",
		used: meter.measure(session).totalTokens,
		size
	};
}
/** Preserve malformed model output as opaque input instead of dropping the call update. */
function parseToolArguments(value) {
	try {
		return JSON.parse(value);
	} catch (_invalidModelJson) {
		return value;
	}
}
//#endregion
//#region lib/types/session.js
/** One standard ACP session's Agent, configuration, prompt, update, and teardown lifecycle. */
/** Standard invalid-parameter failure with protocol-safe detail. */
function invalidParams$1(detail) {
	return RequestError.invalidParams(void 0, detail);
}
/** Standard internal failure with protocol-safe detail. */
function internalError$1(detail) {
	return RequestError.internalError(void 0, detail);
}
/** Restore the latest logged route before falling back to deployment config. */
function selectionFor(logged, fallback) {
	return logged === void 0 ? fallback : {
		provider: logged.config.provider,
		model: logged.config.model,
		...logged.config.reasoningEffort === void 0 || logged.adapterDefaults?.reasoningEffort === true ? {} : { reasoningEffort: logged.config.reasoningEffort }
	};
}
/**
* Per-session ACP module. It owns the unpublished Agent composition, selected
* route, one-prompt admission slot, ordered standard updates, and memoized
* quiescent teardown.
*/
var AcpSession = class AcpSession {
	ctx;
	notify;
	/** The exact top-level Agent owned by this ACP session. */
	agent;
	modelControl;
	outputTail = Promise.resolve();
	inflight;
	closing;
	pendingSelections = /* @__PURE__ */ new Map();
	constructor(ctx, handle, modelControl, notify) {
		this.ctx = ctx;
		this.notify = notify;
		this.agent = handle.agent;
		this.modelControl = modelControl;
		this.disposeAgent = () => handle.dispose();
	}
	disposeAgent;
	/**
	* Compose a fresh Agent and all requested MCP clients before publication.
	* @param ctx - ACP plugin context with Agent, LLM, and persistence services.
	* @param options - fresh session identity, workspace, route, MCP, and notifier.
	* @returns the fully composed per-session module.
	*/
	static async create(ctx, options) {
		const modelControl = new AcpModelControl(ctx.llm, options.fallbackSelection);
		return new AcpSession(ctx, await ctx.agents.create({
			sessionId: options.sessionId,
			meta: { cwd: options.cwd },
			agentOptions: options.agentOptions,
			signal: options.signal,
			setup: async (agentCtx) => {
				modelControl.install(agentCtx);
				await mountAcpMcpServers(agentCtx, options.mcpServers, options.cwd);
			}
		}), modelControl, options.notify);
	}
	/**
	* Restore a persisted Agent and compose the request's fresh MCP connections.
	* @param ctx - ACP plugin context with Agent, LLM, and persistence services.
	* @param options - persisted identity, workspace, fallback route, MCP, and notifier.
	* @returns the restored per-session module.
	*/
	static async resume(ctx, options) {
		let modelControl;
		const handle = await ctx.agents.resume({
			resumeSessionId: options.sessionId,
			agentOptions: options.agentOptions,
			signal: options.signal,
			setup: async (agentCtx, agent) => {
				modelControl = new AcpModelControl(ctx.llm, selectionFor(agent.session.requestHeader(), options.fallbackSelection));
				modelControl.install(agentCtx);
				await mountAcpMcpServers(agentCtx, options.mcpServers, options.cwd);
			}
		});
		/* v8 ignore start -- a fulfilled Agent resume necessarily ran setup to completion. */
		if (modelControl === void 0) {
			await handle.dispose();
			throw internalError$1("session/resume did not compose model selection");
		}
		/* v8 ignore stop */
		return new AcpSession(ctx, handle, modelControl, options.notify);
	}
	/**
	* Whether this module owns an exact Agent reference.
	* @param agent - Agent observed on a scoped runtime event.
	* @returns true only for this session's owned Agent.
	*/
	owns(agent) {
		return this.agent === agent;
	}
	/**
	* Whether this module owns an exact Session reference.
	* @param session - Session observed on a durable event.
	* @returns true only for this session's owned Session.
	*/
	ownsSession(session) {
		return this.agent.session === session;
	}
	/**
	* Return the complete standard model configuration state.
	* @param signal - optional request cancellation.
	* @returns provider-grouped model and exact-model reasoning options.
	*/
	configOptions(signal) {
		this.assertActive();
		return this.modelControl.options(signal);
	}
	/**
	* Apply one standard configuration option to later ACP turns.
	* @param configId - advertised standard option id.
	* @param value - selected standard option value.
	* @param signal - optional request cancellation.
	* @returns the complete resulting option state.
	*/
	setConfig(configId, value, signal) {
		this.assertActive();
		return this.modelControl.set(configId, value, signal);
	}
	/** Resolve topology state off-chain, then serialize its notification without blocking execution updates. */
	topologyChanged() {
		if (this.closing !== void 0) return;
		this.modelControl.options().then((configOptions) => {
			if (this.closing !== void 0) return;
			const previous = this.outputTail;
			this.outputTail = previous.then(() => this.notify({
				sessionId: this.agent.session.id,
				update: {
					sessionUpdate: "config_option_update",
					configOptions
				}
			})).catch((error) => {
				this.ctx.logger.warn(`acp: config-option update failed: ${errorChain(error)}`);
			});
			/* v8 ignore stop */
		}).catch((error) => {
			this.ctx.logger.warn(`acp: config-option update failed: ${errorChain(error)}`);
		});
		/* v8 ignore stop */
	}
	/**
	* Admit, enqueue, and settle one prompt at whole-Agent quiescence.
	* @param params - standard ACP prompt request for this session.
	* @param imageEnabled - connection capability advertised at initialization.
	* @param requestSignal - JSON-RPC request cancellation signal.
	* @returns the correlated standard stop reason after ordered updates drain.
	*/
	async prompt(params, imageEnabled, requestSignal) {
		this.assertActive();
		if (this.inflight !== void 0) throw invalidParams$1("a prompt is already in flight for this session");
		const completion = Promise.withResolvers();
		const admission = Promise.withResolvers();
		const admissionController = new AbortController();
		const inflight = {
			resolve: completion.resolve,
			reject: completion.reject,
			messageId: void 0,
			messageQueued: false,
			turn: void 0,
			endReason: void 0,
			admissionDone: admission.promise,
			finishAdmission: admission.resolve,
			admissionController,
			cancelRequested: false,
			settlementStarted: false,
			outputError: void 0,
			agentError: void 0
		};
		this.inflight = inflight;
		const onRequestAbort = () => {
			this.cancelPrompt("ACP prompt request cancelled");
		};
		requestSignal?.addEventListener("abort", onRequestAbort, { once: true });
		/* v8 ignore next -- the SDK dispatches a live signal, then notifies abort through its listener. */
		if (requestSignal?.aborted === true) onRequestAbort();
		try {
			let admissionFailure;
			const promptSelection = this.modelControl.snapshot();
			try {
				if (this.ctx.agents.get(this.agent.id) !== this.agent) throw internalError$1("prompt was not queued: the agent was disposed outside the bridge");
				const content = await admitAcpPrompt(this.ctx, promptSelection, params.prompt, imageEnabled, admissionController.signal);
				admissionController.signal.throwIfAborted();
				if (this.ctx.agents.get(this.agent.id) !== this.agent) throw internalError$1("prompt was not queued: the agent was disposed outside the bridge");
				const message = createUserMessage({
					content,
					source: { kind: "user" }
				});
				inflight.messageId = message.id;
				inflight.messageQueued = true;
				if (promptSelection !== void 0) this.pendingSelections.set(message.id, promptSelection);
				try {
					this.agent.followup(message);
				} catch (error) {
					inflight.messageQueued = false;
					this.pendingSelections.delete(message.id);
					throw error;
				}
			} catch (error) {
				admissionFailure = error;
			} finally {
				inflight.finishAdmission();
			}
			if (inflight.cancelRequested) {
				this.settleAfterQuiescence(inflight);
				return { stopReason: await completion.promise };
			}
			if (admissionFailure !== void 0) {
				this.inflight = void 0;
				if (admissionFailure instanceof AcpContentError) throw admissionFailure.kind === "invalid" ? invalidParams$1(admissionFailure.message) : internalError$1(admissionFailure.message);
				if (admissionFailure instanceof RequestError) throw admissionFailure;
				throw internalError$1(`prompt was not queued: ${admissionFailure.message}`);
			}
			this.settleAfterQuiescence(inflight);
			return { stopReason: await completion.promise };
		} finally {
			requestSignal?.removeEventListener("abort", onRequestAbort);
		}
	}
	/** Cancel the active prompt, or autonomous work when no ACP prompt exists. */
	cancel() {
		const inflight = this.inflight;
		this.cancelPrompt("ACP prompt cancelled");
		if (inflight === void 0) this.agent.cancel({ kind: "user" });
	}
	/**
	* Process one durable event and enqueue its standard ACP projections.
	* @param session - exact event-owning Session.
	* @param event - committed durable event.
	*/
	onSessionEvent(session, event) {
		try {
			if (event.type === "assistant/message") {
				const inflight = this.inflight?.turn === event.data.turn ? this.inflight : void 0;
				const delivery = this.outputTail.then(async () => {
					for (const update of await assistantUpdates(this.ctx, session, event)) await this.notify({
						sessionId: this.agent.session.id,
						update
					});
				});
				this.outputTail = delivery.catch((error) => {
					const failure = error;
					if (inflight !== void 0) inflight.outputError ??= failure;
					this.ctx.logger.warn(`acp: assistant output conversion failed: ${errorChain(error)}`);
				});
			} else if (event.type === "tool/call") {
				const previous = this.outputTail;
				this.outputTail = previous.then(() => this.notify({
					sessionId: this.agent.session.id,
					update: toolCallUpdate(event)
				})).catch((error) => {
					this.ctx.logger.warn(`acp: tool-call update delivery failed: ${errorChain(error)}`);
				});
			} else if (event.type === "tool/result") {
				const previous = this.outputTail;
				this.outputTail = previous.then(async () => this.notify({
					sessionId: this.agent.session.id,
					update: await toolResultUpdate(this.ctx, event)
				})).catch((error) => {
					this.ctx.logger.warn(`acp: tool-result update delivery failed: ${errorChain(error)}`);
				});
			}
		} finally {
			const inflight = this.inflight;
			if (inflight !== void 0 && event.type === "turn/end" && inflight.turn === event.data.turn) inflight.endReason = event.data.reason;
			if (event.type === "turn/end") this.modelControl.releaseTurn(event.data.turn);
		}
	}
	/**
	* Correlate an accepted user message with its Agent turn and pinned route.
	* @param message - claimed durable inbox message.
	* @param turn - allocated Agent turn.
	*/
	onInboxClaimed(message, turn) {
		if (this.inflight !== void 0 && this.inflight.messageId === message.id) this.inflight.turn = turn;
		const selection = this.pendingSelections.get(message.id);
		this.pendingSelections.delete(message.id);
		if (selection !== void 0) this.modelControl.pinTurn(turn, selection);
	}
	/**
	* Correlate an Agent interval failure with the active ACP prompt.
	* @param turn - failed turn number.
	* @param error - original same-process failure.
	*/
	onAgentError(turn, error) {
		const inflight = this.inflight;
		if (inflight === void 0 || !inflight.messageQueued) return;
		if (inflight.turn === turn) return;
		inflight.agentError = new Error(errorChain(error));
		this.settleAfterQuiescence(inflight);
	}
	/** Await every update queued before this call. */
	drainUpdates() {
		return this.outputTail;
	}
	/**
	* Cancel, drain, flush, and dispose this session once.
	* @param detail - cancellation detail for any prompt still in admission.
	* @returns the shared quiescent teardown promise.
	*/
	close(detail) {
		if (this.closing !== void 0) return this.closing;
		this.closing = (async () => {
			const failures = [];
			const inflight = this.inflight;
			this.cancelPrompt(detail);
			if (inflight === void 0 || !inflight.messageQueued) this.agent.cancel({ kind: "user" });
			try {
				await inflight?.admissionDone;
				await this.agent.whenIdle();
				await this.outputTail;
			} catch (error) {
				failures.push(new Error("ACP session activity drain failed", { cause: error }));
			}
			const subagents = this.ctx.get("subagents");
			try {
				await subagents?.drainContinuableDescendants([this.agent]);
			} catch (error) {
				this.ctx.logger.warn(`acp: continuable subagent teardown failed: ${errorChain(error)}`);
				failures.push(new Error("continuable subagent teardown failed", { cause: error }));
			}
			try {
				await this.ctx.sessions.flush(this.agent.session);
			} catch (error) {
				failures.push(new Error("ACP session persistence flush failed", { cause: error }));
			}
			try {
				await this.disposeAgent();
			} catch (error) {
				failures.push(error);
			}
			this.pendingSelections.clear();
			if (failures.length === 1) throw failures[0];
			/* v8 ignore start -- independent teardown failures can aggregate only under multiple simultaneous provider faults. */
			if (failures.length > 1) throw new AggregateError(failures, `ACP session teardown failed: ${failures.map(errorChain).join("; ")}`);
			/* v8 ignore stop */
		})();
		return this.closing;
	}
	assertActive() {
		if (this.closing !== void 0) throw invalidParams$1(`session is closing: ${this.agent.session.id}`);
	}
	cancelPrompt(detail) {
		const inflight = this.inflight;
		if (inflight === void 0) return;
		inflight.cancelRequested = true;
		inflight.admissionController.abort(new Error(detail));
		this.settleAfterQuiescence(inflight);
		if (inflight.messageQueued) this.agent.cancel({ kind: "user" });
	}
	settleAfterQuiescence(inflight) {
		if (inflight.settlementStarted) return;
		inflight.settlementStarted = true;
		(async () => {
			await inflight.admissionDone;
			if (inflight.messageQueued) {
				await this.agent.whenIdle();
				await this.outputTail;
			}
			/* v8 ignore next -- this prompt owns the slot until this exact settlement clears it. */
			if (this.inflight !== inflight) return;
			this.inflight = void 0;
			if (inflight.cancelRequested) {
				inflight.resolve("cancelled");
				return;
			}
			if (inflight.outputError !== void 0) {
				inflight.reject(internalError$1(`assistant output delivery failed: ${inflight.outputError.message}`));
				return;
			}
			if (inflight.agentError !== void 0) {
				inflight.reject(internalError$1(`turn failed: ${inflight.agentError.message}`));
				return;
			}
			const end = inflight.endReason;
			if (end === void 0) inflight.resolve("cancelled");
			else if (end.kind === "error") inflight.reject(internalError$1(`turn failed: ${end.error.message}`));
			else inflight.resolve(turnEndToStopReason(end));
		})().catch((error) => {
			if (this.inflight !== inflight) return;
			this.inflight = void 0;
			inflight.reject(internalError$1(`prompt settlement failed: ${errorChain(error)}`));
		});
		/* v8 ignore stop */
	}
};
//#endregion
//#region lib/types/index.js
/**
* Automation-only Agent Client Protocol server over JSON-RPC stdio.
*
* The bridge exposes persistent harness sessions to trusted programmatic
* clients. It carries standard configuration, MCP mounts, prompt content,
* committed semantic updates, cancellation, and one-shot permission decisions;
* presentation and human-interaction features stay with the harness's UI modules.
*
* @module @deepseek-ai/dsh-acp
*/
const DEFAULT_SESSION_LIST_PAGE_SIZE = 100;
const name = "acp";
/** Core services required by the standard automation controls. */
const inject = [
	"agents",
	"llm",
	"sessionPersistence",
	"sessions"
];
/** Preserve invalid-parameter detail in the SDK wire error message. */
function invalidParams(detail) {
	return RequestError.invalidParams(void 0, detail);
}
/** Preserve failed-turn detail; plain handler errors become a generic wire internal error. */
function internalError(detail) {
	return RequestError.internalError(void 0, detail);
}
const Config = Schema.object({
	provider: Schema.string(),
	model: Schema.string(),
	sessionListPageSize: Schema.natural().min(1).default(DEFAULT_SESSION_LIST_PAGE_SIZE)
});
/**
* Mount the automation-only ACP server.
* @param ctx - Cordis context carrying the agent factory and session events.
* @param config - Initial provider/model selection and optional test transport.
*/
function apply(ctx, config) {
	const persistence = ctx.sessionPersistence;
	const logger = ctx.logger;
	const sessionListPageSize = resolveSessionListPageSize(config.sessionListPageSize);
	const sessions = /* @__PURE__ */ new Map();
	const activating = /* @__PURE__ */ new Set();
	let closed = false;
	let imagePromptEnabled = false;
	/** Return the bridge-owned record for an agent, rejecting same-id impostors. */
	const ownedRecord = (agent) => {
		const record = sessions.get(agent.session.id);
		return record?.owns(agent) === true ? record : void 0;
	};
	const assertOpen = () => {
		if (closed) throw internalError("the ACP bridge has been disposed");
	};
	const requireSession = (sessionId) => {
		const record = sessions.get(sessionId);
		if (record === void 0) throw invalidParams(`unknown session: ${sessionId}`);
		return record;
	};
	/** Send one ordered protocol update while containing transport-only failure. */
	const notify = async (notification) => {
		try {
			await conn.notify(methods.client.session.update, notification);
		} catch (error) {
			logger.warn(`acp: session/update failed: ${String(error)}`);
		}
		/* v8 ignore stop */
	};
	ctx.on("session/event", (session, event) => {
		const record = sessions.get(session.header.id);
		if (record?.ownsSession(session) === true) record.onSessionEvent(session, event);
	});
	ctx.on("agent/inbox/claimed", ({ agent, message, turn }) => {
		ownedRecord(agent)?.onInboxClaimed(message, turn);
	});
	ctx.on("agent/error", ({ agent, turn, error }) => {
		ownedRecord(agent)?.onAgentError(turn, error);
	});
	ctx.on("llm/adapters-updated", () => {
		for (const record of sessions.values()) record.topologyChanged();
	});
	ctx.on("approval/request", (request, next) => {
		const record = ownedRecord(request.agent);
		if (record === void 0 || request.callId === void 0) return next();
		const callId = request.callId;
		return record.drainUpdates().then(() => {
			const params = {
				sessionId: record.agent.session.id,
				toolCall: { toolCallId: callId },
				options: [{
					optionId: "allow-once",
					name: "Allow once",
					kind: "allow_once"
				}, {
					optionId: "reject-once",
					name: "Reject",
					kind: "reject_once"
				}]
			};
			return conn.request(methods.client.session.requestPermission, params);
		}).then(({ outcome }) => {
			if (outcome.outcome === "cancelled") return "cancelled";
			return outcome.optionId === "allow-once" ? "allowed-once" : "rejected";
		});
	});
	const implementation = {
		async initialize(_params) {
			imagePromptEnabled = await supportsAcpImagePrompts(ctx, config.provider, config.model);
			return {
				protocolVersion: PROTOCOL_VERSION,
				agentInfo: {
					name: "deepseek-harness-acp",
					version: "0.0.1"
				},
				agentCapabilities: {
					mcpCapabilities: { http: true },
					promptCapabilities: {
						image: imagePromptEnabled,
						audio: false,
						embeddedContext: false
					},
					sessionCapabilities: {
						close: {},
						list: {},
						resume: {}
					}
				},
				authMethods: []
			};
		},
		authenticate(_params) {
			return Promise.resolve();
		},
		async newSession(params, signal) {
			assertOpen();
			validateWorkspaceParams(params);
			const sessionId = brandString(randomUUID());
			let record;
			try {
				record = await AcpSession.create(ctx, {
					sessionId,
					cwd: params.cwd,
					mcpServers: params.mcpServers,
					agentOptions: agentOptions(config),
					fallbackSelection: initialSelection(config),
					signal,
					notify
				});
			} catch (error) {
				if (error instanceof AcpMcpConfigError) throw invalidParams(error.message);
				throw error;
			}
			/* v8 ignore next 4 -- a real stdio close can race an in-flight create. */
			if (closed) {
				await record.close("connection closed during session/new");
				throw internalError("connection closed during session/new");
			}
			sessions.set(sessionId, record);
			try {
				const configOptions = await record.configOptions(signal);
				assertOpen();
				await ctx.sessions.flush(record.agent.session);
				assertOpen();
				return {
					sessionId,
					configOptions
				};
			} catch (error) {
				sessions.delete(sessionId);
				await record.close("session/new activation failed");
				throw error;
			}
		},
		async resumeSession(params, signal) {
			assertOpen();
			validateWorkspaceParams(params);
			const sessionId = brandString(params.sessionId);
			if (sessions.has(sessionId) || activating.has(sessionId) || ctx.sessions.get(sessionId) !== void 0) throw invalidParams(`session is already active: ${sessionId}`);
			activating.add(sessionId);
			return (async () => {
				const persisted = (await persistence.stat(sessionId, { signal }))?.header;
				if (persisted === void 0 || persisted.origin === "subagent" || persisted.parentSession !== void 0) throw invalidParams(`session is not resumable: ${sessionId}`);
				if (!await sameDirectory(persisted.cwd, params.cwd)) throw invalidParams(`session cwd does not match: ${params.cwd}`);
				let record;
				try {
					record = await AcpSession.resume(ctx, {
						sessionId,
						cwd: params.cwd,
						mcpServers: params.mcpServers ?? [],
						agentOptions: agentOptions(config),
						fallbackSelection: initialSelection(config),
						signal,
						notify
					});
				} catch (error) {
					if (error instanceof AcpMcpConfigError) throw invalidParams(error.message);
					throw error;
				}
				/* v8 ignore start -- the persisted header was checked before resume; the factory restores that exact header. */
				if (!await sameDirectory(record.agent.session.header.cwd, params.cwd)) {
					await record.close("session/resume cwd mismatch");
					throw invalidParams(`session cwd does not match: ${params.cwd}`);
				}
				/* v8 ignore stop */
				/* v8 ignore next 4 -- a real stdio close can race an in-flight resume. */
				if (closed) {
					await record.close("connection closed during session/resume");
					throw internalError("connection closed during session/resume");
				}
				sessions.set(sessionId, record);
				try {
					return { configOptions: await record.configOptions(signal) };
				} catch (error) {
					sessions.delete(sessionId);
					await record.close("session/resume option discovery failed");
					throw error;
				}
			})().finally(() => {
				activating.delete(sessionId);
			});
		},
		async listSessions(params, signal) {
			assertOpen();
			if (params.cwd !== void 0 && params.cwd !== null && !isAbsolute(params.cwd)) throw invalidParams(`cwd must be an absolute path: ${params.cwd}`);
			let cursor;
			try {
				cursor = decodeSessionListCursor(params.cursor);
			} catch (error) {
				throw invalidParams(error.message);
			}
			const listed = await persistence.list({ signal });
			const entries = (await Promise.all(listed.map(async ({ header }) => {
				if (sessions.has(header.id) || activating.has(header.id) || ctx.sessions.get(header.id) !== void 0 || header.origin === "subagent" || header.parentSession !== void 0 || header.cwd === void 0 || !isAbsolute(header.cwd)) return void 0;
				if (params.cwd !== void 0 && params.cwd !== null && !await sameDirectory(header.cwd, params.cwd)) return;
				return {
					sessionId: header.id,
					cwd: header.cwd,
					createdAt: header.createdAt
				};
			}))).filter((entry) => entry !== void 0).sort((left, right) => right.createdAt - left.createdAt || compareSessionIds(left.sessionId, right.sessionId));
			const remaining = cursor === void 0 ? entries : entries.filter((entry) => isAfterSessionListCursor(entry, cursor));
			const page = remaining.slice(0, sessionListPageSize);
			const next = remaining.length > page.length ? page.at(-1) : void 0;
			return {
				sessions: page.map(({ sessionId, cwd }) => ({
					sessionId,
					cwd
				})),
				...next === void 0 ? {} : { nextCursor: encodeSessionListCursor(next) }
			};
		},
		async setSessionConfigOption(params, signal) {
			assertOpen();
			const record = requireSession(brandString(params.sessionId));
			try {
				return { configOptions: await record.setConfig(params.configId, params.value, signal) };
			} catch (error) {
				if (error instanceof AcpModelConfigError) throw invalidParams(error.message);
				throw error;
			}
		},
		async closeSession(params) {
			assertOpen();
			const sessionId = brandString(params.sessionId);
			const record = requireSession(sessionId);
			try {
				await record.close("ACP session closed");
			} catch (error) {
				throw internalError(`session close failed: ${errorChain(error)}`);
			} finally {
				if (sessions.get(sessionId) === record) sessions.delete(sessionId);
			}
			return {};
		},
		async prompt(params, requestSignal) {
			assertOpen();
			return requireSession(brandString(params.sessionId)).prompt(params, imagePromptEnabled, requestSignal);
		},
		cancel(params) {
			sessions.get(brandString(params.sessionId))?.cancel();
			return Promise.resolve();
		}
	};
	/* v8 ignore next 4 -- production stdio wiring; tests inject config.stream. */
	const stream = config.stream ?? ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin));
	const connection = agent({ name: "deepseek-harness-acp" }).onRequest(methods.agent.initialize, ({ params }) => implementation.initialize(params)).onRequest(methods.agent.authenticate, async ({ params }) => {
		await implementation.authenticate(params);
		return {};
	}).onRequest(methods.agent.session.new, ({ params, signal }) => implementation.newSession(params, signal)).onRequest(methods.agent.session.list, ({ params, signal }) => implementation.listSessions(params, signal)).onRequest(methods.agent.session.resume, ({ params, signal }) => implementation.resumeSession(params, signal)).onRequest(methods.agent.session.close, ({ params }) => implementation.closeSession(params)).onRequest(methods.agent.session.setConfigOption, ({ params, signal }) => implementation.setSessionConfigOption(params, signal)).onRequest(methods.agent.session.prompt, ({ params, signal }) => implementation.prompt(params, signal)).onNotification(methods.agent.session.cancel, ({ params }) => implementation.cancel(params)).connect(stream);
	const conn = connection.client;
	let quiescing;
	const quiesce = () => {
		if (quiescing !== void 0) return quiescing;
		closed = true;
		const records = [...sessions.values()];
		quiescing = (async () => {
			const disposals = await Promise.allSettled(records.map((record) => record.close("ACP bridge disposed")));
			for (const record of records)
 /* v8 ignore next -- closed blocks concurrent handlers; each captured record remains mapped until this loop. */
			if (sessions.get(record.agent.session.id) === record) sessions.delete(record.agent.session.id);
			const failures = [];
			for (const result of disposals) if (result.status === "rejected") failures.push(result.reason);
			if (failures.length > 0) {
				const detail = failures.map((failure) => errorChain(failure)).join("; ");
				throw new AggregateError(failures, `ACP agent teardown failed for ${failures.length} session(s): ${detail}`);
			}
		})();
		return quiescing;
	};
	/* v8 ignore start -- production transport rejection and teardown failure. */
	connection.closed.catch((error) => {
		logger.warn(`acp: connection closed with an error: ${String(error)}`);
	}).then(quiesce).catch((error) => {
		logger.warn(`acp: connection-close teardown failed: ${String(error)}`);
	});
	/* v8 ignore stop */
	ctx.effect(() => quiesce, "acp.connection");
}
/**
* Build per-agent options from plugin config without assigning absent optional fields.
* @param config - ACP provider/model configuration.
* @returns the configured fields only.
*/
function agentOptions(config) {
	return {
		...config.provider !== void 0 ? { provider: config.provider } : {},
		...config.model !== void 0 ? { model: config.model } : {}
	};
}
/** Initial session selection when both deployment fields are present. */
function initialSelection(config) {
	return config.provider === void 0 || config.model === void 0 ? void 0 : {
		provider: config.provider,
		model: config.model
	};
}
/** Resolve and validate the deployment-owned session page limit. */
function resolveSessionListPageSize(value) {
	const resolved = value ?? DEFAULT_SESSION_LIST_PAGE_SIZE;
	/* v8 ignore start -- Cordis applies the positive-integer Config schema; this protects direct apply callers. */
	if (!Number.isSafeInteger(resolved) || resolved < 1) throw new Error("acp: sessionListPageSize must be a positive safe integer");
	/* v8 ignore stop */
	return resolved;
}
/** Decode an opaque keyset cursor without assigning meaning to client metadata. */
function decodeSessionListCursor(value) {
	if (value === void 0 || value === null) return void 0;
	if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("session/list cursor is invalid");
	try {
		const decoded = JSON.parse(Buffer$1.from(value, "base64url").toString("utf8"));
		const createdAt = Array.isArray(decoded) ? decoded[0] : void 0;
		const sessionId = Array.isArray(decoded) ? decoded[1] : void 0;
		if (!Array.isArray(decoded) || decoded.length !== 2 || typeof createdAt !== "number" || !Number.isSafeInteger(createdAt) || createdAt < 0 || typeof sessionId !== "string" || sessionId.length === 0) throw new Error("invalid cursor fields");
		if (Buffer$1.from(JSON.stringify(decoded), "utf8").toString("base64url") !== value) throw new Error("non-canonical cursor");
		return {
			createdAt,
			sessionId
		};
	} catch (_invalidCursor) {
		throw new Error("session/list cursor is invalid");
	}
}
/** Encode the last returned ordering key as an opaque continuation token. */
function encodeSessionListCursor(entry) {
	return Buffer$1.from(JSON.stringify([entry.createdAt, entry.sessionId]), "utf8").toString("base64url");
}
/** Test whether an entry follows the cursor in newest-first list order. */
function isAfterSessionListCursor(entry, cursor) {
	return entry.createdAt < cursor.createdAt || entry.createdAt === cursor.createdAt && compareSessionIds(entry.sessionId, cursor.sessionId) > 0;
}
/** Compare opaque session ids by stable UTF-8 bytes, independent of process locale. */
function compareSessionIds(left, right) {
	return Buffer$1.compare(Buffer$1.from(left), Buffer$1.from(right));
}
/** Reject workspace features outside the automation contract. */
function validateWorkspaceParams(params) {
	if (!isAbsolute(params.cwd)) throw invalidParams(`cwd must be an absolute path: ${params.cwd}`);
	if (params.additionalDirectories !== void 0 && params.additionalDirectories !== null && params.additionalDirectories.length > 0) throw invalidParams("additionalDirectories is not supported");
}
/** Compare existing directories by physical identity and missing paths lexically. */
async function sameDirectory(left, right) {
	if (left === void 0) return false;
	try {
		const [realLeft, realRight] = await Promise.all([realpath(left), realpath(right)]);
		return realLeft === realRight;
	} catch (_unresolvablePath) {
		return resolve(left) === resolve(right);
	}
}
//#endregion
export { Config, apply, inject, name };

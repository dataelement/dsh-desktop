import { hostname } from "node:os";
import z from "@deepseek-ai/schemastery";
import { AssistantStreamAccumulator, ReasoningEffortId, assistantStreamChunks, createUserMessage, errorChain, freezeMessage } from "@deepseek-ai/dsh-llm";
import { canOpenNativePath, nativeFileManager, openNativePath, revealNativePath } from "@deepseek-ai/dsh-native-command";
import { Remote, RemoteError, TypertRemoteService, remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import { mkdir } from "node:fs/promises";
import { installModelSelection } from "@deepseek-ai/dsh-agent";
import { SessionQueryError } from "@deepseek-ai/dsh-session-query";
import { randomUUID } from "node:crypto";
import { brandString } from "@deepseek-ai/dsh-brand";
import { AttachmentError } from "@deepseek-ai/dsh-attachment";
import { SessionLogOffset, SessionSeq, isAppendSurfaceEvent } from "@deepseek-ai/dsh-session";
import { SessionTitleInvalidError } from "@deepseek-ai/dsh-session-title";
import { canonicalClientTimeZone } from "@deepseek-ai/dsh-util-time";
import { assertNever } from "@deepseek-ai/dsh-util-values";
import { Deque } from "@deepseek-ai/dsh-deque";
import { z as z$1 } from "zod";
import { isUserInvocable } from "@deepseek-ai/dsh-skill";
import { isAbsolute } from "node:path";
import { FsError } from "@deepseek-ai/dsh-fs";
import mime from "mime-types";
//#region lib/types/agent.js
/** Agent activation, composition, and model-selection policy owned by API Session. */
var __addDisposableResource$4 = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources$4 = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/** Cold Session identity absent from persistence. */
var ApiSessionNotFound = class extends Error {};
/** Session identity whose lifecycle belongs to subagent routing. */
var ApiSessionSubagentOwnership = class extends Error {
	sessionId;
	/** @param sessionId - identity reserved to subagent routing. */
	constructor(sessionId) {
		super(`session "${sessionId}" is a subagent session; use subagent delivery`);
		this.sessionId = sessionId;
	}
};
/** Explicit-id creation attempted to adopt a Session under another cwd. */
var ApiSessionCwdConflict = class extends Error {
	sessionId;
	requestedCwd;
	existingCwd;
	constructor(sessionId, requestedCwd, existingCwd) {
		super(existingCwd === void 0 ? `session "${sessionId}" records no cwd and cannot be adopted for "${requestedCwd}"` : `session "${sessionId}" belongs to "${existingCwd}", not "${requestedCwd}"`);
		this.sessionId = sessionId;
		this.requestedCwd = requestedCwd;
		this.existingCwd = existingCwd;
	}
};
/** Explicit-id creation attempted to adopt a Session under another preset. */
var ApiSessionPresetConflict = class extends Error {
	sessionId;
	requestedPreset;
	existingPreset;
	constructor(sessionId, requestedPreset, existingPreset) {
		super(existingPreset === void 0 ? `session "${sessionId}" records no agent preset and cannot be adopted under "${requestedPreset}"` : `session "${sessionId}" runs agent preset "${existingPreset}", not "${requestedPreset}"`);
		this.sessionId = sessionId;
		this.requestedPreset = requestedPreset;
		this.existingPreset = existingPreset;
	}
};
/**
* Test whether generic Session routing must leave an identity to subagent routing.
* @param ctx - Host context carrying the Agent ownership registry.
* @param session - attached or live Session whose ownership is tested.
* @param agent - live Agent when one exists for the Session.
* @returns whether subagent routing owns the Session identity.
*/
function hasApiSessionSubagentOwner(ctx, session, agent) {
	if (session.header.origin === "subagent") return true;
	const parentId = session.header.parentSession;
	if (parentId === void 0 || agent === void 0) return false;
	const parent = ctx.agents.get(parentId);
	return parent !== void 0 && ctx.agents.isOwnedBy(agent.id, parent);
}
/**
* Build the stable caller-facing subagent ownership rejection.
* @param sessionId - Session identity owned by subagent routing.
* @returns a stable Session-domain failure.
*/
function apiSessionSubagentOwnershipError(sessionId) {
	return new RemoteError("session/agent-busy", `session "${sessionId}" is owned by subagent routing`, { reason: "use subagent delivery for this child session" });
}
/**
* Inspect one cold Session without repairing, resuming, or publishing it.
* @param ctx - Host context carrying Session persistence.
* @param sessionId - durable Session identity.
* @param signal - optional cancellation for persistence reads.
* @returns the persisted header and complete event prefix.
*/
async function inspectApiSession(ctx, sessionId, signal) {
	try {
		const env_1 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			const observation = __addDisposableResource$4(env_1, await ctx.sessionQuery.observeSession(sessionId, {
				...signal === void 0 ? {} : { signal },
				projectionMode: "none"
			}), false);
			if (observation.header.cwd === void 0) throw new ApiSessionNotFound(`session "${sessionId}" not found`);
			return {
				meta: observation.header,
				inheritedEventCount: observation.inheritedEventCount,
				events: [...observation.events]
			};
		} catch (e_1) {
			env_1.error = e_1;
			env_1.hasError = true;
		} finally {
			__disposeResources$4(env_1);
		}
	} catch (error) {
		if (error instanceof SessionQueryError && error.code === "SESSION_QUERY_SESSION_NOT_FOUND") throw new ApiSessionNotFound(`session "${sessionId}" not found`);
		throw error;
	}
}
/** Owns every operation that may create, resume, or configure a Web Agent. */
var ApiSessionAgentController = class {
	ctx;
	resumes = /* @__PURE__ */ new Map();
	creations = /* @__PURE__ */ new Map();
	selections = /* @__PURE__ */ new WeakMap();
	imageAdmissionChains = /* @__PURE__ */ new WeakMap();
	/** @param ctx - Host context carrying Agent, model, persistence, and Typert services. */
	constructor(ctx) {
		this.ctx = ctx;
		ctx.typert.lookups.configure("agent", async (sessionId) => {
			const found = await this.resolveAgent(sessionId);
			if ("error" in found) throw found.error;
			return found.agent;
		});
		ctx.typert.lookups.configure("session", async (sessionId) => {
			const found = await this.resolveAgent(sessionId);
			if ("error" in found) throw found.error;
			return found.agent.session;
		});
		ctx.typert.contexts.configureHost("agent", async (sessionId) => {
			const found = await this.resolveAgent(sessionId);
			if ("error" in found) throw found.error;
			return found.agent.ctx;
		});
	}
	/**
	* Resolve or resume one ordinary Session, deduplicating concurrent resumes.
	* @param sessionId - ordinary Session identity.
	* @returns the live Agent or a stable Session-domain failure.
	*/
	async resolveAgent(sessionId) {
		return this.resolve(sessionId);
	}
	/**
	* Resolve one ordinary Session from an already-retained exact observation.
	* @param observation - Host-owned observation whose preparation stays pinned through setup.
	* @returns the live Agent or a stable Session-domain failure.
	*/
	async resolveObservedAgent(observation) {
		return this.resolve(observation.header.id, observation);
	}
	async resolve(sessionId, observation) {
		const live = this.liveAgent(sessionId);
		if (live !== void 0) return live;
		const attached = this.ctx.sessions.get(sessionId);
		if (attached !== void 0 && hasApiSessionSubagentOwner(this.ctx, attached, void 0)) return { error: apiSessionSubagentOwnershipError(sessionId) };
		let resume = this.resumes.get(sessionId);
		if (resume === void 0) {
			resume = this.resume(sessionId, observation).finally(() => {
				this.resumes.delete(sessionId);
			});
			this.resumes.set(sessionId, resume);
		}
		try {
			return { agent: await resume };
		} catch (error) {
			if (error instanceof ApiSessionNotFound) return { error: new RemoteError("session/not-found", error.message, { sessionId }) };
			if (error instanceof ApiSessionSubagentOwnership) return { error: apiSessionSubagentOwnershipError(error.sessionId) };
			const raced = this.liveAgent(sessionId);
			if (raced !== void 0) return raced;
			const racedSession = this.ctx.sessions.get(sessionId);
			if (racedSession !== void 0 && hasApiSessionSubagentOwner(this.ctx, racedSession, void 0)) return { error: apiSessionSubagentOwnershipError(sessionId) };
			return { error: new RemoteError("gateway/internal", `resume failed for session "${sessionId}": ${String(error)}`, {}) };
		}
	}
	/**
	* Resolve one requested identity, creating or resuming it once.
	* @param sessionId - requested Session identity.
	* @param cwd - directory the Session must own.
	* @param checkPersistedIdentity - whether to inspect a cold identity before creation.
	* @param presetId - optional Agent preset the Session must own.
	* @returns the matching live ordinary Agent.
	*/
	async ensureSession(sessionId, cwd, checkPersistedIdentity, presetId) {
		let creation = this.creations.get(sessionId);
		if (creation === void 0) {
			creation = this.createOrAdopt(sessionId, cwd, checkPersistedIdentity, presetId).catch((error) => {
				const live = this.ctx.agents.get(sessionId);
				if (live !== void 0) {
					if (hasApiSessionSubagentOwner(this.ctx, live.session, live)) throw new ApiSessionSubagentOwnership(sessionId);
					return live;
				}
				const attached = this.ctx.sessions.get(sessionId);
				if (attached !== void 0 && hasApiSessionSubagentOwner(this.ctx, attached, void 0)) throw new ApiSessionSubagentOwnership(sessionId);
				throw error;
			}).finally(() => {
				this.creations.delete(sessionId);
			});
			this.creations.set(sessionId, creation);
		}
		const agent = await creation;
		if (hasApiSessionSubagentOwner(this.ctx, agent.session, agent)) throw new ApiSessionSubagentOwnership(sessionId);
		if (presetId !== void 0) this.assertPresetUnchanged(sessionId, presetId, this.presetForSession(agent.session));
		if (agent.session.header.cwd !== cwd) throw new ApiSessionCwdConflict(sessionId, cwd, agent.session.header.cwd);
		return agent;
	}
	/**
	* Install or return the Session-local model selection used by prompt assembly.
	* @param agent - live Agent that owns the selection.
	* @returns the installed mutable selection reference.
	*/
	selectionFor(agent) {
		const installed = this.selections.get(agent);
		if (installed !== void 0) return installed;
		const projectionState = this.ctx.sessionProjections.stateOf(agent.session, "modelSelection");
		if (projectionState === void 0) throw new Error("api-session: required modelSelection projection is not registered");
		let picked = projectionState.pending === null ? void 0 : agentModelSelection(projectionState.pending);
		const defaultModel = this.ctx.agentDefaultModel;
		const selection = {
			get current() {
				if (picked !== void 0) return picked;
				const loggedHeader = agent.session.requestHeader();
				if (loggedHeader === void 0) return defaultModel.currentSelection();
				const logged = loggedHeader.config;
				return {
					provider: logged.provider,
					model: logged.model,
					...logged.reasoningEffort === void 0 || loggedHeader.adapterDefaults?.reasoningEffort === true ? {} : { reasoningEffort: logged.reasoningEffort }
				};
			},
			set current(next) {
				picked = next;
			},
			consume(provider, model, reasoningEffort) {
				if (picked?.provider !== provider || picked.model !== model || picked.reasoningEffort !== reasoningEffort) return false;
				picked = void 0;
				return true;
			},
			assembled: void 0
		};
		installModelSelection(agent.ctx, selection);
		this.selections.set(agent, selection);
		return selection;
	}
	/**
	* Commit and cache one validated selection for the next prompt assembly.
	* @param agent - live Agent that owns the selection.
	* @param selection - validated selection to record and apply.
	*/
	selectForNextRequest(agent, selection) {
		agent.session.append("model/selection", selection);
		this.selectionFor(agent).current = selection;
	}
	/**
	* Let a matching durable request header retire the execution cache.
	* @param agent - live Agent whose request was recorded.
	* @param provider - provider route used by the request.
	* @param model - provider-owned model used by the request.
	* @param reasoningEffort - adapter-owned effort used by the request.
	* @returns whether the pending selection was consumed.
	*/
	consumeSelection(agent, provider, model, reasoningEffort) {
		return this.selections.get(agent)?.consume(provider, model, reasoningEffort) ?? false;
	}
	/**
	* Read the current Agent preset from the Session projection.
	* @param session - live Session whose projection state is available.
	* @returns the current preset, or undefined when the capability is absent.
	*/
	presetForSession(session) {
		return this.ctx.sessionProjections.stateOf(session, "agentPreset") ?? void 0;
	}
	/**
	* Serialize image admission and model selection for one Agent.
	* @param agent - live Agent that owns the serialization chain.
	* @param operation - asynchronous operation admitted after prior work settles.
	* @returns the operation result or rejection.
	*/
	serializeImageAdmission(agent, operation) {
		const result = (this.imageAdmissionChains.get(agent) ?? Promise.resolve()).then(operation);
		this.imageAdmissionChains.set(agent, result.then(() => void 0, () => void 0));
		return result;
	}
	/**
	* Resolve the preset id and pre-publication Agent setup for a create or resume.
	* @param presetId - requested preset or the configured default when omitted.
	* @returns the resolved preset identity and Agent setup callback.
	*/
	async composeAgent(presetId) {
		const presets = this.ctx.get("agentPresets");
		if (presets === void 0) return { setup: (_agentCtx, agent) => {
			this.installSelection(agent);
		} };
		const resolvedId = (await presets.resolve(presetId)).id;
		return {
			agentPreset: resolvedId,
			setup: async (agentCtx, agent) => {
				this.installSelection(agent);
				await presets.mount(agentCtx, resolvedId);
			}
		};
	}
	liveAgent(sessionId) {
		const agent = this.ctx.agents.get(sessionId);
		if (agent === void 0) return void 0;
		return hasApiSessionSubagentOwner(this.ctx, agent.session, agent) ? { error: apiSessionSubagentOwnershipError(sessionId) } : { agent };
	}
	async resume(sessionId, supplied) {
		if (supplied !== void 0) return this.resumeObserved(sessionId, supplied);
		try {
			const env_2 = {
				stack: [],
				error: void 0,
				hasError: false
			};
			try {
				const observation = __addDisposableResource$4(env_2, await this.ctx.sessionQuery.observeSession(sessionId), false);
				return await this.resumeObserved(sessionId, observation);
			} catch (e_2) {
				env_2.error = e_2;
				env_2.hasError = true;
			} finally {
				__disposeResources$4(env_2);
			}
		} catch (error) {
			if (error instanceof SessionQueryError && error.code === "SESSION_QUERY_SESSION_NOT_FOUND") throw new ApiSessionNotFound(`session "${sessionId}" not found`);
			throw error;
		}
	}
	async resumeObserved(sessionId, observation) {
		if (observation.header.id !== sessionId || observation.header.cwd === void 0) throw new ApiSessionNotFound(`session "${sessionId}" not found`);
		if (hasApiSessionSubagentOwner(this.ctx, { header: observation.header }, void 0)) throw new ApiSessionSubagentOwnership(sessionId);
		const composition = await this.composeAgent(this.presetForObservation(observation));
		const published = this.ctx.sessions.get(sessionId);
		const live = this.ctx.agents.get(sessionId);
		if (published !== void 0 && hasApiSessionSubagentOwner(this.ctx, published, live)) throw new ApiSessionSubagentOwnership(sessionId);
		return (await this.ctx.agents.resume({
			resumeSessionId: sessionId,
			agentOptions: this.agentOptions(),
			setup: composition.setup
		})).agent;
	}
	async createOrAdopt(sessionId, cwd, checkPersistedIdentity, presetId) {
		const attached = this.ctx.sessions.get(sessionId);
		const live = this.ctx.agents.get(sessionId);
		if (attached !== void 0 && hasApiSessionSubagentOwner(this.ctx, attached, live)) throw new ApiSessionSubagentOwnership(sessionId);
		if (live !== void 0) return live;
		if (checkPersistedIdentity) try {
			const env_3 = {
				stack: [],
				error: void 0,
				hasError: false
			};
			try {
				const observation = __addDisposableResource$4(env_3, await this.ctx.sessionQuery.observeSession(sessionId), false);
				if (hasApiSessionSubagentOwner(this.ctx, { header: observation.header }, void 0)) throw new ApiSessionSubagentOwnership(sessionId);
				if (observation.header.cwd !== cwd) throw new ApiSessionCwdConflict(sessionId, cwd, observation.header.cwd);
				const storedPreset = this.presetForObservation(observation);
				this.assertPresetUnchanged(sessionId, presetId, storedPreset);
				const composition = await this.composeAgent(storedPreset);
				return (await this.ctx.agents.resume({
					resumeSessionId: sessionId,
					agentOptions: this.agentOptions(),
					setup: composition.setup
				})).agent;
			} catch (e_3) {
				env_3.error = e_3;
				env_3.hasError = true;
			} finally {
				__disposeResources$4(env_3);
			}
		} catch (error) {
			if (!(error instanceof SessionQueryError) || error.code !== "SESSION_QUERY_SESSION_NOT_FOUND") throw error;
		}
		try {
			await mkdir(cwd, { recursive: true });
		} catch (error) {
			throw new Error(`failed to ensure project directory "${cwd}": ${String(error)}`, { cause: error });
		}
		const composition = await this.composeAgent(presetId);
		return (await this.ctx.agents.create({
			sessionId,
			agentOptions: this.agentOptions(),
			meta: {
				cwd,
				...composition.agentPreset === void 0 ? {} : { agentPreset: composition.agentPreset }
			},
			setup: composition.setup
		})).agent;
	}
	agentOptions() {
		const { provider, model } = this.ctx.agentDefaultModel.currentSelection();
		return {
			provider,
			model
		};
	}
	installSelection(agent) {
		this.selectionFor(agent);
	}
	/**
	* Read the current Agent preset from an all-projections observation.
	* @param observation - exact Session observation carrying its projection snapshot.
	* @returns the current preset, or undefined when the capability is absent.
	*/
	presetForObservation(observation) {
		if (observation.projections === void 0) throw new Error("api-session: Agent activation requires a projected Session observation");
		return observation.projections.values.agentPreset ?? void 0;
	}
	assertPresetUnchanged(sessionId, requested, existing) {
		if (requested === void 0 || requested === existing) return;
		throw new ApiSessionPresetConflict(sessionId, requested, existing);
	}
};
function agentModelSelection(selection) {
	return {
		provider: selection.provider,
		model: selection.model,
		...selection.reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(selection.reasoningEffort) }
	};
}
//#endregion
//#region lib/types/commands.js
/** Session commands whose activation policy is explicit at each Remote method. */
var __addDisposableResource$3 = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources$3 = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
function hasPromptContent(content) {
	return content.some((part) => part.type !== "text" || part.text.trim().length > 0);
}
/** Implements Session business commands delegated by the Session Controller Remote service. */
var SessionCommandController = class {
	ctx;
	agents;
	defaultCwd;
	/**
	* @param ctx - Host context carrying Agent, model, attachment, title, and Workspace services.
	* @param agents - sole owner of create, resume, and Session-local model selection.
	* @param defaultCwd - project directory used when create names neither a Workspace nor a cwd.
	*/
	constructor(ctx, agents, defaultCwd) {
		this.ctx = ctx;
		this.agents = agents;
		this.defaultCwd = defaultCwd;
	}
	/**
	* Create or idempotently adopt one ordinary Session.
	* @param request - requested identity, location, and Agent preset.
	* @returns the Session identity and resolved preset when configured.
	*/
	async create(request) {
		if (request.workspaceId !== void 0 && request.cwd !== void 0) throw new RemoteError("gateway/bad-request", "session.create accepts workspaceId or cwd, not both", {});
		const sessionId = request.sessionId ?? brandString(`session-${randomUUID()}`);
		let workspace;
		if (request.workspaceId !== void 0) {
			workspace = this.ctx.workspaceRegistry.get(request.workspaceId);
			if (workspace === void 0) throw new RemoteError("workspace/not-found", `workspace "${request.workspaceId}" not found`, { workspaceId: request.workspaceId });
		}
		const cwd = workspace?.path ?? request.cwd ?? this.defaultCwd;
		let adopted;
		try {
			adopted = await this.agents.ensureSession(sessionId, cwd, request.sessionId !== void 0, request.agentPreset);
		} catch (error) {
			this.rejectCreation(sessionId, error);
		}
		if (workspace !== void 0) try {
			await workspace.attachSession(sessionId);
		} catch (error) {
			throw new RemoteError("session/workspace-attach-failed", `session "${sessionId}" was created but could not attach to workspace "${workspace.id}": ${String(error)}`, {
				sessionId,
				workspaceId: workspace.id
			});
		}
		const agentPreset = this.agents.presetForSession(adopted.session);
		return {
			sessionId,
			...agentPreset === void 0 ? {} : { agentPreset }
		};
	}
	/**
	* Validate and install one Session-local model selection.
	* @param request - Session identity and requested model selection.
	* @returns the normalized selection installed for the Session.
	*/
	async selectModel(request) {
		const agent = await this.resolveAgent(request.sessionId);
		return this.agents.serializeImageAdmission(agent, async () => {
			try {
				const resolved = await this.ctx.llm.resolveCallConfig({
					provider: request.provider,
					model: request.model,
					...request.reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(request.reasoningEffort) }
				});
				const selected = {
					provider: resolved.provider,
					model: resolved.model,
					...resolved.reasoningEffort === void 0 ? {} : { reasoningEffort: resolved.reasoningEffort }
				};
				this.agents.selectForNextRequest(agent, selected);
				try {
					await this.ctx.agentDefaultModel.saveSelection(selected);
				} catch (error) {
					this.ctx.logger.warn(`session-controller: model selection changed for the Session but the default was not saved: ${String(error)}`);
				}
				return { selected: { ...selected } };
			} catch (error) {
				if (remoteErrorOf(error) !== void 0) throw error;
				throw new RemoteError("session/model-unavailable", error instanceof Error ? error.message : String(error), {
					provider: request.provider,
					model: request.model
				});
			}
		});
	}
	/**
	* Normalize and append a user-owned Session title.
	* @param request - Session identity and proposed title.
	* @returns the accepted title and durable event sequence.
	*/
	async rename(request) {
		const agent = await this.resolveAgent(request.sessionId);
		const titles = this.ctx.get("sessionTitle");
		if (titles === void 0) throw new RemoteError("gateway/internal", "renaming is unavailable: this deployment mounts no session-title service", {});
		try {
			const accepted = titles.rename(agent.session, request.title);
			return {
				title: accepted.title,
				seq: accepted.eventSeq
			};
		} catch (error) {
			if (error instanceof SessionTitleInvalidError) throw new RemoteError("session/title-invalid", error.message, { sessionId: request.sessionId });
			throw new RemoteError("gateway/internal", `failed to rename session "${request.sessionId}": ${String(error)}`, {});
		}
	}
	/**
	* Create a new ordinary Session from one completed-turn prefix.
	* @param request - source Session and optional event anchor.
	* @returns the new Session identity.
	*/
	async fork(request) {
		const env_1 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			let atSeq;
			try {
				atSeq = request.atSeq === void 0 ? void 0 : SessionSeq(request.atSeq);
			} catch {
				throw new RemoteError("gateway/bad-request", "atSeq must be a non-negative safe integer", {});
			}
			let observed;
			try {
				observed = await this.ctx.sessionQuery.observeSession(request.sessionId);
			} catch (error) {
				if (error instanceof SessionQueryError && error.code === "SESSION_QUERY_SESSION_NOT_FOUND") throw new RemoteError("session/not-found", `session "${request.sessionId}" not found`, { sessionId: request.sessionId });
				throw new RemoteError("gateway/internal", `fork source unavailable for session "${request.sessionId}": ${String(error)}`, {});
			}
			const source = __addDisposableResource$3(env_1, observed, false);
			const lastSeq = source.events.at(-1)?.seq ?? -1;
			const boundary = (atSeq === void 0 ? void 0 : source.events.find((event) => event.type === "turn/end" && event.seq >= atSeq)) ?? (atSeq === void 0 || atSeq > lastSeq ? source.events.findLast((event) => event.type === "turn/end") : void 0);
			if (boundary === void 0) throw new RemoteError("session/fork-unavailable", atSeq !== void 0 && atSeq <= lastSeq ? `session "${request.sessionId}" has not completed the turn containing event ${String(atSeq)}` : `session "${request.sessionId}" has no completed turn to fork from`, { sessionId: request.sessionId });
			let cut = SessionLogOffset(boundary.seq + 1);
			while (cut < source.events.length && source.events[cut]?.type !== "turn/start") cut = SessionLogOffset(cut + 1);
			let workspace;
			try {
				workspace = await this.forkWorkspace(source.header);
			} catch (error) {
				throw new RemoteError("gateway/internal", `failed to resolve fork workspace for session "${request.sessionId}": ${String(error)}`, {});
			}
			const childId = brandString(`session-${randomUUID()}`);
			const composition = await this.agents.composeAgent(this.agents.presetForObservation(source));
			try {
				const { provider, model } = this.ctx.agentDefaultModel.currentSelection();
				await this.ctx.agents.create({
					sessionId: childId,
					seed: source.events.slice(0, cut),
					inheritedEventCount: cut,
					meta: {
						...source.header.cwd === void 0 ? {} : { cwd: source.header.cwd },
						parentSession: source.header.id,
						isSeeded: true,
						...composition.agentPreset === void 0 ? {} : { agentPreset: composition.agentPreset }
					},
					agentOptions: {
						provider,
						model
					},
					setup: composition.setup
				});
			} catch (error) {
				throw new RemoteError("gateway/internal", `failed to fork session "${request.sessionId}": ${String(error)}`, {});
			}
			if (workspace !== void 0) try {
				await workspace.attachSession(childId);
			} catch (error) {
				throw new RemoteError("session/workspace-attach-failed", `session "${childId}" was forked but could not attach to workspace "${workspace.id}": ${String(error)}`, {
					sessionId: childId,
					workspaceId: workspace.id
				});
			}
			return { sessionId: childId };
		} catch (e_1) {
			env_1.error = e_1;
			env_1.hasError = true;
		} finally {
			__disposeResources$3(env_1);
		}
	}
	/**
	* Reject empty content, then admit one prompt after Agent and attachment validation.
	* @param request - Session identity, prompt content, source metadata, and delivery mode.
	* @returns acknowledgement that the Agent accepted the prompt.
	*/
	async prompt(request) {
		if (!hasPromptContent(request.content)) throw new RemoteError("gateway/bad-request", "prompt content must include non-whitespace text or an attachment", {});
		const clientTimeZone = request.clientTimeZone === void 0 ? void 0 : canonicalClientTimeZone(request.clientTimeZone);
		if (request.clientTimeZone !== void 0 && clientTimeZone === void 0) throw new RemoteError("session/invalid-time-zone", "clientTimeZone must be UTC or a valid IANA Area/Location name", { value: request.clientTimeZone });
		const agent = await this.resolveAgent(request.sessionId);
		if (hasPromptRequest(agent, request.requestId)) return { accepted: true };
		const selection = this.agents.selectionFor(agent).current;
		if (!routeServed(this.ctx, selection.provider)) throw new RemoteError("session/model-unavailable", `no adapter serves provider "${selection.provider}"; select a model for this session`, {
			provider: selection.provider,
			model: selection.model
		});
		const source = {
			kind: "user",
			rpcId: request.requestId,
			...clientTimeZone === void 0 ? {} : { clientTimeZone }
		};
		const hasImage = request.content.some((part) => part.type === "image");
		const admit = async () => {
			try {
				const env_2 = {
					stack: [],
					error: void 0,
					hasError: false
				};
				try {
					if (hasImage) {
						const current = this.agents.selectionFor(agent).current;
						const model = await this.ctx.llm.resolveModelInfo(current.provider, current.model);
						if (model.inputModalities !== void 0 && !model.inputModalities.includes("image")) throw new RemoteError("session/attachment-invalid", `Model "${current.model}" does not support image input.`, { reason: "MODEL_DOES_NOT_SUPPORT_IMAGES" });
					}
					const admission = resolvePromptFileReceipts(request.content, (receiptId) => this.ctx.fileUploads.resolve(agent, receiptId));
					const message = createUserMessage({
						content: await this.ctx.attachments.admitPromptContent(admission.content),
						source
					});
					if (this.ctx.agents.get(agent.id) !== agent) throw new RemoteError("session/not-found", `session "${agent.id}" was disposed during prompt admission`, { sessionId: agent.id });
					const binding = __addDisposableResource$3(env_2, this.ctx.fileUploads.bindPrompt(agent, admission.receiptIds, request.requestId), false);
					if (request.mode === "steer") agent.steer(message);
					else agent.followup(message);
					binding.commit();
				} catch (e_2) {
					env_2.error = e_2;
					env_2.hasError = true;
				} finally {
					__disposeResources$3(env_2);
				}
			} catch (error) {
				if (remoteErrorOf(error) !== void 0) throw error;
				if (error instanceof AttachmentError) throw new RemoteError("session/attachment-invalid", error.message, { reason: error.code });
				throw new RemoteError("session/agent-busy", "prompt rejected", { reason: String(error) });
			}
			return { accepted: true };
		};
		return hasImage ? this.agents.serializeImageAdmission(agent, admit) : admit();
	}
	/**
	* Read one durable image after proving the Session log references it.
	* @param request - Session and attachment identities used for authorization.
	* @returns the durable attachment reference and base64-encoded bytes.
	*/
	async attachment(request) {
		let source;
		try {
			source = await this.readSessionState(request.sessionId);
		} catch (error) {
			if (error instanceof ApiSessionNotFound) throw new RemoteError("session/not-found", error.message, { sessionId: request.sessionId });
			throw new RemoteError("gateway/internal", `attachment authorization unavailable for session "${request.sessionId}": ${String(error)}`, {});
		}
		const ref = referencedImage(source.events, String(request.attachmentId));
		if (ref === void 0) throw new RemoteError("session/attachment-invalid", "Image is not referenced by this session.", { reason: "ATTACHMENT_NOT_REFERENCED" });
		try {
			const stored = await this.ctx.attachments.readImage(ref);
			return {
				attachment: stored.ref,
				data: Buffer.from(stored.data).toString("base64")
			};
		} catch (error) {
			if (error instanceof AttachmentError) throw new RemoteError("session/attachment-invalid", error.message, { reason: error.code });
			throw new RemoteError("gateway/internal", "Unable to read image attachment.", {});
		}
	}
	/**
	* Mutate one still-pending queue occurrence without resuming a cold Agent.
	* @param request - Session, queue item, and requested mutation.
	* @returns acknowledgement that the queue mutation was applied.
	*/
	updateQueue(request) {
		if (request.action.kind === "edit") {
			if (request.action.content.some((block) => block.type !== "text")) throw new RemoteError("session/attachment-invalid", "queue edits accept text content only", { reason: "QUEUE_EDIT_NON_TEXT" });
			if (!hasPromptContent(request.action.content)) throw new RemoteError("gateway/bad-request", "queue edit content must include non-whitespace text", {});
		}
		const agent = this.ctx.agents.get(request.sessionId);
		if (agent === void 0) throw new RemoteError("session/queue-item-not-found", "queued item is no longer pending", { itemId: request.itemId });
		if (hasApiSessionSubagentOwner(this.ctx, agent.session, agent)) {
			const identity = this.ctx.sessionProjections.snapshot(agent.session, ["subagent"]).values.subagent;
			if (identity?.mode !== "continuable" || !agent.session.isOwnSeq(identity.seq)) throw apiSessionSubagentOwnershipError(request.sessionId);
		}
		const nextTurn = agent.inbox.nextTurn.find((message) => message.id === request.itemId);
		const nextStep = agent.inbox.nextStep.find((message) => message.id === request.itemId);
		const located = nextTurn === void 0 ? nextStep === void 0 ? void 0 : {
			target: "next-step",
			message: nextStep
		} : {
			target: "next-turn",
			message: nextTurn
		};
		if (located === void 0) throw new RemoteError("session/queue-item-not-found", "queued item is no longer pending", { itemId: request.itemId });
		const { target, message } = located;
		if (request.action.kind === "steer" && (target !== "next-turn" || agent.status !== "running")) throw new RemoteError("session/steer-unavailable", "current turn no longer accepts steering", { itemId: request.itemId });
		switch (request.action.kind) {
			case "edit":
				agent.inbox.replace(request.itemId, freezeMessage({
					...message,
					content: [...request.action.content]
				}));
				break;
			case "remove": {
				agent.inbox.remove(request.itemId);
				const source = message.source;
				if (source.kind === "user" && "rpcId" in source) this.ctx.fileUploads.retirePrompt(agent, source.rpcId);
				break;
			}
			case "steer":
				agent.inbox.remove(request.itemId);
				agent.steer(message);
				break;
			/* v8 ignore next 2 -- closed-union exhaustiveness guard */
			default: assertNever(request.action, "queue action");
		}
		return { accepted: true };
	}
	/**
	* Cancel one live ordinary Agent while retaining pending inbox work.
	* @param request - Session whose active Agent turn is cancelled.
	* @returns acknowledgement that cancellation was requested.
	*/
	cancel(request) {
		const agent = this.ctx.agents.get(request.sessionId);
		if (agent === void 0) throw new RemoteError("session/not-found", `session "${request.sessionId}" not found (not attached)`, { sessionId: request.sessionId });
		if (hasApiSessionSubagentOwner(this.ctx, agent.session, agent)) throw apiSessionSubagentOwnershipError(request.sessionId);
		agent.cancel({ kind: "user" }, { keepInbox: true });
		return { accepted: true };
	}
	async resolveAgent(sessionId) {
		const found = await this.agents.resolveAgent(sessionId);
		if ("error" in found) throw found.error;
		return found.agent;
	}
	rejectCreation(sessionId, error) {
		if (remoteErrorOf(error) !== void 0) throw error;
		if (error instanceof ApiSessionPresetConflict) throw new RemoteError("agent-preset/conflict", error.message, {
			sessionId: error.sessionId,
			requestedPreset: error.requestedPreset,
			...error.existingPreset === void 0 ? {} : { existingPreset: error.existingPreset }
		});
		if (error instanceof ApiSessionCwdConflict) throw new RemoteError("session/conflict", error.message, {
			sessionId: error.sessionId,
			requestedCwd: error.requestedCwd,
			...error.existingCwd === void 0 ? {} : { existingCwd: error.existingCwd }
		});
		if (error instanceof ApiSessionSubagentOwnership) throw apiSessionSubagentOwnershipError(error.sessionId);
		throw new RemoteError("gateway/internal", `failed to create session "${sessionId}": ${String(error)}`, {});
	}
	async readSessionState(sessionId) {
		const attached = this.ctx.sessions.get(sessionId);
		if (attached !== void 0) return {
			id: attached.id,
			header: attached.header,
			events: attached.snapshotEvents()
		};
		const inspected = await inspectApiSession(this.ctx, sessionId);
		return {
			id: inspected.meta.id,
			header: inspected.meta,
			events: inspected.events
		};
	}
	async forkWorkspace(source) {
		const workspaces = this.ctx.workspaceRegistry.list();
		const direct = workspaces.find((workspace) => workspace.sessionIds.includes(source.id));
		if (direct !== void 0 || source.origin !== "subagent") return direct;
		const lineage = await this.ctx.sessionQuery.traceSession(source.id);
		for (const ancestor of lineage.ancestors) {
			const workspace = workspaces.find((candidate) => candidate.sessionIds.includes(ancestor.header.id));
			if (workspace !== void 0) return workspace;
		}
	}
};
function resolvePromptFileReceipts(content, stagedFile) {
	const receiptIds = /* @__PURE__ */ new Set();
	return {
		content: content.map((part) => {
			if (part.type !== "file") return part;
			const attachment = stagedFile(part.receiptId);
			if (attachment === void 0) throw new RemoteError("session/attachment-invalid", "File was not uploaded for this session.", { reason: "FILE_NOT_STAGED" });
			receiptIds.add(part.receiptId);
			return {
				type: "file",
				attachment
			};
		}),
		receiptIds: [...receiptIds]
	};
}
function hasPromptRequest(agent, requestId) {
	const matches = (message) => {
		const source = message.source;
		return source.kind === "user" && "rpcId" in source && source.rpcId === requestId;
	};
	if (agent.inbox.nextTurn.some(matches) || agent.inbox.nextStep.some(matches)) return true;
	return agent.session.snapshotEvents().some((event) => {
		if (event.type !== "user/message") return false;
		const source = event.data.source;
		return source.kind === "user" && "rpcId" in source && source.rpcId === requestId;
	});
}
function imageBlockIn(content, match) {
	if (!Array.isArray(content)) return void 0;
	for (const value of content) {
		if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
		const block = value;
		if (block.type === "image" && typeof block.attachment === "object" && block.attachment !== null) {
			const ref = block.attachment;
			if (match(ref)) return ref;
		}
		if (block.type === "tool-result") {
			const nested = imageBlockIn(block.content, match);
			if (nested !== void 0) return nested;
		}
	}
}
function imageInEvent(event, match) {
	const data = event.data;
	const direct = imageBlockIn(data.content, match);
	if (direct !== void 0) return direct;
	const message = imageBlockIn(data.message?.content, match);
	if (message !== void 0) return message;
	for (const inserted of data.inserted ?? []) {
		const found = imageBlockIn(inserted.content, match);
		if (found !== void 0) return found;
	}
	if (event.type === "assistant/message" || event.type === "assistant/attempt") for (const chunk of assistantStreamChunks(event.data.stream, "block-end")) {
		const found = imageBlockIn([chunk.block], match);
		if (found !== void 0) return found;
	}
}
function referencedImage(events, attachmentId) {
	for (const event of events) {
		const found = imageInEvent(event, (ref) => String(ref.attachmentId) === attachmentId);
		if (found !== void 0) return found;
	}
}
function routeServed(ctx, provider) {
	return ctx.llm.listProviders().some((entry) => entry.id === provider);
}
//#endregion
//#region lib/types/control.js
/** Live Session queue, jobs, and projection state with reconnect baselines. */
/** Owns the Host-wide Session control stream. */
var SessionControlController = class {
	ctx;
	streams = /* @__PURE__ */ new Set();
	/** @param ctx - Host context carrying live Agent, projection, and jobs services. */
	constructor(ctx) {
		this.ctx = ctx;
		ctx.sessionProjections.onChanged((session, key, value, seq) => {
			this.broadcast({
				type: "projection",
				sessionId: session.id,
				key,
				value,
				seq
			});
			if (key !== "inbox") return;
			if (this.ctx.agents.get(session.id)?.session !== session) return;
			this.broadcast({
				type: "queue",
				sessionId: session.id,
				items: queueItemsFromInbox(value)
			});
		});
		ctx.inject(["jobs"], (jobsCtx) => {
			jobsCtx.jobs.onJobsChanged((owner) => {
				this.onJobsChanged(owner);
			});
		});
		ctx.on("session/created", (session) => {
			const jobs = this.jobsFor(this.ctx.agents.get(session.id));
			if (jobs.length > 0) this.broadcast({
				type: "jobs",
				sessionId: session.id,
				jobs
			});
		});
		ctx.effect(() => () => {
			for (const stream of this.streams) stream.end();
			this.streams.clear();
		}, "session-controller.control");
	}
	/**
	* Open one generation of Host-wide live control state.
	* @param signal - Remote stream cancellation.
	* @returns one complete baseline followed by live replacement frames.
	*/
	async *control(signal) {
		signal.throwIfAborted();
		const queue = new ControlQueue();
		this.streams.add(queue);
		try {
			yield {
				type: "baseline",
				value: this.baseline()
			};
			yield* queue.iterate(signal);
		} finally {
			this.streams.delete(queue);
			queue.end();
		}
	}
	baseline() {
		const sessions = this.ctx.sessions.list();
		const queues = Object.create(null);
		const jobs = Object.create(null);
		for (const session of sessions) {
			const agent = this.ctx.agents.get(session.id);
			queues[session.id] = agent?.session === session ? queueItems(agent) : [];
			jobs[session.id] = this.jobsFor(agent);
		}
		return {
			queues,
			jobs,
			projections: this.projectionBaseline(sessions)
		};
	}
	projectionBaseline(sessions) {
		const blocks = Object.create(null);
		for (const session of sessions) {
			const snapshot = this.ctx.sessionProjections.snapshot(session);
			blocks[session.id] = {
				asOfSeq: snapshot.asOfSeq,
				values: snapshot.values
			};
		}
		return blocks;
	}
	onJobsChanged(owner) {
		if (owner !== void 0) {
			this.broadcast({
				type: "jobs",
				sessionId: owner.id,
				jobs: this.jobsFor(owner)
			});
			return;
		}
		for (const session of this.ctx.sessions.list()) this.broadcast({
			type: "jobs",
			sessionId: session.id,
			jobs: this.jobsFor(this.ctx.agents.get(session.id))
		});
	}
	jobsFor(agent) {
		const jobs = this.ctx.get("jobs");
		return jobs === void 0 ? [] : jobs.list(agent).map(jobView);
	}
	broadcast(frame) {
		for (const stream of this.streams) stream.push(frame);
	}
};
var ControlQueue = class {
	buffer = new Deque();
	wake;
	done = false;
	push(frame) {
		if (this.done) return;
		this.buffer.pushBack(frame);
		const wake = this.wake;
		this.wake = void 0;
		wake?.();
	}
	end() {
		if (this.done) return;
		this.done = true;
		const wake = this.wake;
		this.wake = void 0;
		wake?.();
	}
	async *iterate(signal) {
		const onAbort = () => {
			this.end();
		};
		signal.addEventListener("abort", onAbort, { once: true });
		try {
			while (!this.done && !signal.aborted) {
				const frame = this.buffer.popFront();
				if (frame !== void 0) {
					yield frame;
					continue;
				}
				await new Promise((resolve) => {
					this.wake = resolve;
				});
			}
			while (this.buffer.size > 0 && !signal.aborted) yield this.buffer.popFront();
		} finally {
			signal.removeEventListener("abort", onAbort);
			this.end();
		}
	}
};
function queueItems(agent) {
	return queueItemsFromInbox({
		"next-turn": agent.inbox.nextTurn,
		"next-step": agent.inbox.nextStep
	});
}
function queueItemsFromInbox(inbox) {
	return [...inbox["next-turn"].map((message) => ({
		id: message.id,
		placement: "queued",
		...promptRpcId(message),
		message: {
			id: message.id,
			content: message.content
		}
	})), ...inbox["next-step"].map((message) => ({
		id: message.id,
		placement: message.source.kind === "user" ? "steering" : "context",
		...promptRpcId(message),
		message: {
			id: message.id,
			content: message.content
		}
	}))];
}
/** Prompt-RPC identity carried by a browser-submitted message's user source. */
function promptRpcId(message) {
	const source = message.source;
	return source.kind === "user" && "rpcId" in source ? { rpcId: source.rpcId } : {};
}
function jobView(job) {
	return {
		id: job.id,
		kind: job.kind,
		label: job.label,
		status: job.status,
		...job.detail === void 0 ? {} : { detail: job.detail },
		startedAt: job.startedAt,
		...job.finishedAt === void 0 ? {} : { finishedAt: job.finishedAt }
	};
}
//#endregion
//#region lib/types/assistant-stream.js
/** Process-local assistant state retained for reconnecting Web followers. */
const EMPTY_BASELINE = { revision: 0 };
/**
* Folds dense Agent frames and materializes one shared immutable reconnect
* baseline per accepted revision.
*/
var SessionAssistantStreamAccumulator = class {
	activeAttempt;
	revision = 0;
	snapshotValue = EMPTY_BASELINE;
	dirty = false;
	/**
	* Fold one trusted frame from the current attached Agent lifecycle.
	* @param frame - next dense process-local Assistant frame.
	* @param durableCursor - last committed Session seq when this frame was observed.
	*/
	accept(frame, durableCursor) {
		if (frame.type === "start" && frame.revision === 1 && this.revision !== 0) {
			this.activeAttempt = void 0;
			this.revision = 0;
		}
		if (frame.revision !== this.revision + 1) {
			this.activeAttempt = void 0;
			this.revision = frame.revision;
			this.dirty = true;
			return;
		}
		this.revision = frame.revision;
		switch (frame.type) {
			case "start":
				this.activeAttempt = {
					attemptId: frame.attemptId,
					startedAfterSeq: durableCursor,
					turn: frame.turn,
					step: frame.step,
					stream: new AssistantStreamAccumulator(),
					nextIndex: 0
				};
				break;
			case "chunk": {
				const attempt = this.activeAttempt;
				if (attempt === void 0 || attempt.attemptId !== frame.attemptId || frame.index !== attempt.nextIndex) {
					this.activeAttempt = void 0;
					break;
				}
				attempt.stream.push({
					time: frame.time,
					chunk: frame.chunk
				});
				attempt.nextIndex += 1;
				break;
			}
			case "end":
				this.activeAttempt = void 0;
				break;
		}
		this.dirty = true;
	}
	/**
	* Read the cached reconnect baseline, materializing it after a state change.
	* @returns the identity-stable baseline for the latest accepted revision.
	*/
	snapshot() {
		if (!this.dirty) return this.snapshotValue;
		this.snapshotValue = {
			revision: this.revision,
			...this.activeAttempt === void 0 ? {} : { activeAttempt: {
				attemptId: this.activeAttempt.attemptId,
				startedAfterSeq: this.activeAttempt.startedAfterSeq,
				turn: this.activeAttempt.turn,
				step: this.activeAttempt.step,
				nextIndex: this.activeAttempt.nextIndex,
				stream: this.activeAttempt.stream.snapshot()
			} }
		};
		this.dirty = false;
		return this.snapshotValue;
	}
};
//#endregion
//#region lib/types/history.js
/** Cold Session history pagination and live-event source. */
var __addDisposableResource$2 = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources$2 = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
const DEFAULT_MAX_MESSAGES = 50;
const MESSAGE_TYPES$1 = new Set(["user/message", "assistant/message"]);
/** Implements cold-safe history operations delegated by the Session Controller. */
var SessionHistoryController = class {
	ctx;
	promote;
	closeFollowers = /* @__PURE__ */ new Set();
	assistantStreams = /* @__PURE__ */ new Map();
	/**
	* @param ctx - Host context carrying Session query and projection services.
	* @param promote - starts ordinary Session activation after snapshot delivery.
	*/
	constructor(ctx, promote) {
		this.ctx = ctx;
		this.promote = promote;
		ctx.on("agent/assistant-stream", ({ agent, frame }) => {
			let stream = this.assistantStreams.get(agent.session.id);
			if (stream === void 0) {
				stream = new SessionAssistantStreamAccumulator();
				this.assistantStreams.set(agent.session.id, stream);
			}
			stream.accept(frame, cursorBeforeNext(agent.session.seq));
		}, { global: true });
		ctx.on("agent/disposed", ({ agent }) => {
			this.assistantStreams.delete(agent.session.id);
		}, { global: true });
		ctx.effect(() => () => {
			for (const close of this.closeFollowers) close();
			this.closeFollowers.clear();
		}, "session-controller.history");
	}
	/**
	* Read one message-aligned history page without activating an Agent.
	* @param request - durable address and backwards-page cursor.
	* @param signal - caller cancellation for persistence reads.
	* @returns a contiguous event page.
	*/
	async page(request, signal) {
		const env_1 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			validatePageRequest(request);
			const throughSeq = request.throughSeq === -1 ? -1 : SessionSeq(request.throughSeq);
			const beforeSeq = request.beforeSeq === void 0 ? void 0 : SessionLogOffset(request.beforeSeq);
			const source = __addDisposableResource$2(env_1, await this.sourceFor(request.address, signal, false), false);
			signal.throwIfAborted();
			const sourceLog = source.events;
			const sourceCursor = sourceLog.at(-1)?.seq ?? -1;
			if (throughSeq > sourceCursor) throw new RemoteError("gateway/bad-request", `session page through seq ${String(throughSeq)} is past cursor ${String(sourceCursor)}`, {});
			/* v8 ignore next -- Session and persistence validation guarantee a dense zero-based event prefix. */
			if (throughSeq >= 0 && sourceLog[throughSeq]?.seq !== throughSeq) throw new RemoteError("gateway/internal", `session log does not contain through seq ${String(throughSeq)}`, {});
			const page = paginate(sourceLog, beforeSeq, request.maxMessages ?? DEFAULT_MAX_MESSAGES, throughSeq);
			return {
				records: pageRecords(page.events),
				hasMore: page.hasMore
			};
		} catch (e_1) {
			env_1.error = e_1;
			env_1.hasError = true;
		} finally {
			__disposeResources$2(env_1);
		}
	}
	/**
	* Follow events appended after an initial cursor on one durable address.
	* @param request - durable address and last committed sequence already held by the caller.
	* @param signal - stream cancellation owned by the Remote carrier.
	* @returns a complete opening snapshot followed by gap-free durable events and opted-in assistant frames.
	*/
	async *follow(request, signal) {
		validateFollowRequest(request);
		const { address } = request;
		const target = addressId(address);
		const buffered = new Deque();
		let snapshotCursor;
		let assistantStreamOrdinal = 0;
		let wake;
		const notify = () => {
			const resume = wake;
			wake = void 0;
			resume?.();
		};
		const follower = { closed: false };
		const close = () => {
			follower.closed = true;
			notify();
		};
		this.closeFollowers.add(close);
		const disposeEvent = this.ctx.on("session/event", (session, event) => {
			if (session.id !== target) return;
			buffered.pushBack({
				type: "event",
				event
			});
			notify();
		}, { global: true });
		const disposeCreated = this.ctx.on("session/created", (session) => {
			if (session.id !== target) return;
			const suffix = session.snapshotEvents(snapshotCursor === void 0 ? session.firstLiveSeq : SessionLogOffset(snapshotCursor + 1));
			for (let index = suffix.length - 1; index >= 0; index -= 1) buffered.pushFront({
				type: "event",
				event: suffix[index]
			});
			notify();
		}, { global: true });
		const disposeAssistantStream = request.assistantStream !== true ? void 0 : this.ctx.on("agent/assistant-stream", ({ agent, frame }) => {
			if (agent.session.id !== target) return;
			buffered.pushBack({
				type: "assistant-stream",
				frame: wireAssistantStreamFrame(frame, cursorBeforeNext(agent.session.seq)),
				ordinal: ++assistantStreamOrdinal
			});
			notify();
		}, { global: true });
		const onAbort = () => {
			notify();
		};
		signal.addEventListener("abort", onAbort, { once: true });
		try {
			const env_2 = {
				stack: [],
				error: void 0,
				hasError: false
			};
			try {
				const source = __addDisposableResource$2(env_2, await this.sourceFor(address, signal, true), false);
				const events = source.events;
				signal.throwIfAborted();
				const cursor = source.cursor;
				snapshotCursor = cursor;
				const page = paginate(events, void 0, request.maxMessages ?? DEFAULT_MAX_MESSAGES);
				const assistantStream = request.assistantStream === true ? this.assistantStreams.get(target)?.snapshot() ?? { revision: 0 } : void 0;
				const assistantStreamOrdinalCut = assistantStreamOrdinal;
				yield {
					type: "snapshot",
					header: wireHeader(source.header),
					cursor,
					records: pageRecords(page.events),
					hasMore: page.hasMore,
					projections: source.projections === void 0 ? {
						asOfSeq: cursor,
						values: {}
					} : projectionBlock(source.projections),
					...assistantStream === void 0 ? {} : { assistantStream }
				};
				if (address.kind === "session" && source.source === "prepared") {
					const promotion = source.retain();
					try {
						this.promote(promotion);
					} catch (error) {
						promotion[Symbol.dispose]();
						throw error;
					}
				}
				let nextOffset = SessionLogOffset(cursor + 1);
				while (!follower.closed && !signal.aborted) {
					const item = buffered.popFront();
					if (item === void 0) {
						await new Promise((resolve) => {
							wake = resolve;
						});
						continue;
					}
					if (item.type === "assistant-stream") {
						if (item.ordinal > assistantStreamOrdinalCut) yield {
							type: "assistant-stream",
							frame: item.frame
						};
						continue;
					}
					const expectedSeq = SessionSeq(nextOffset);
					if (item.event.seq < expectedSeq) continue;
					if (item.event.seq !== expectedSeq) throw new RemoteError("gateway/internal", `session event stream skipped seq ${String(expectedSeq)}`, {});
					nextOffset = SessionLogOffset(nextOffset + 1);
					yield entryFor(item.event);
				}
			} catch (e_2) {
				env_2.error = e_2;
				env_2.hasError = true;
			} finally {
				__disposeResources$2(env_2);
			}
		} finally {
			this.closeFollowers.delete(close);
			signal.removeEventListener("abort", onAbort);
			disposeCreated();
			disposeEvent();
			disposeAssistantStream?.();
		}
	}
	async sourceFor(address, signal, withProjections) {
		const sessionId = addressId(address);
		try {
			const observation = await this.ctx.sessionQuery.observeSession(sessionId, {
				signal,
				projectionMode: withProjections || address.kind === "subagent" ? "all" : "none"
			});
			if (observation.header.cwd === void 0) {
				observation[Symbol.dispose]();
				rejectNotFound(address);
			}
			try {
				validateAddress(address, observation.header, observation.inheritedEventCount, observation.projections);
			} catch (error) {
				observation[Symbol.dispose]();
				throw error;
			}
			return observation;
		} catch (error) {
			if (error instanceof SessionQueryError && error.code === "SESSION_QUERY_SESSION_NOT_FOUND") rejectNotFound(address);
			throw error;
		}
	}
};
function cursorBeforeNext(nextSeq) {
	return nextSeq === 0 ? -1 : SessionSeq(nextSeq - 1);
}
function wireAssistantStreamFrame(frame, durableCursor) {
	if (frame.type === "start") return {
		...frame,
		startedAfterSeq: durableCursor
	};
	if (frame.type === "end") return frame;
	return {
		...frame,
		chunk: frame.chunk
	};
}
function projectionBlock(snapshot) {
	return {
		asOfSeq: snapshot.asOfSeq,
		values: snapshot.values
	};
}
function validatePageRequest(request) {
	if (!Number.isSafeInteger(request.throughSeq) || request.throughSeq < -1 || Object.is(request.throughSeq, -0)) throw new RemoteError("gateway/bad-request", "throughSeq must be an integer greater than or equal to -1", {});
	if (request.beforeSeq !== void 0 && (!Number.isSafeInteger(request.beforeSeq) || request.beforeSeq < 0 || Object.is(request.beforeSeq, -0))) throw new RemoteError("gateway/bad-request", "beforeSeq must be a non-negative safe integer", {});
	if (request.maxMessages !== void 0 && (!Number.isSafeInteger(request.maxMessages) || request.maxMessages <= 0)) throw new RemoteError("gateway/bad-request", "maxMessages must be a positive safe integer", {});
}
function validateFollowRequest(request) {
	if (request.maxMessages !== void 0 && (!Number.isSafeInteger(request.maxMessages) || request.maxMessages <= 0)) throw new RemoteError("gateway/bad-request", "maxMessages must be a positive safe integer", {});
}
function addressId(address) {
	return address.kind === "session" ? address.sessionId : address.childSessionId;
}
function validateAddress(address, header, inheritedEventCount, projections) {
	if (address.kind === "session") {
		if (header.origin === "subagent") throw new RemoteError("session/agent-busy", "subagent Sessions require their durable parent address", { reason: "use subagent delivery for this child session" });
		return;
	}
	if (header.origin !== "subagent" || header.parentSession !== address.parentSessionId) throw new RemoteError("subagent/unauthorized", "subagent does not belong to the supplied parent", { childSessionId: address.childSessionId });
	const identity = projections?.values.subagent;
	if (identity === null) throw new RemoteError("subagent/catalog-diagnostic", "subagent descriptor is corrupt", {
		parentSessionId: address.parentSessionId,
		childSessionId: address.childSessionId,
		reason: "corrupt"
	});
	if (identity === void 0 || identity.seq < inheritedEventCount) throw new RemoteError("subagent/catalog-diagnostic", "subagent descriptor is unavailable", {
		parentSessionId: address.parentSessionId,
		childSessionId: address.childSessionId,
		reason: "unsupported"
	});
	if (identity.mode !== address.mode) throw new RemoteError("subagent/unauthorized", "subagent mode does not match the supplied address", { childSessionId: address.childSessionId });
}
function rejectNotFound(address) {
	if (address.kind === "session") throw new RemoteError("session/not-found", `session "${address.sessionId}" not found`, { sessionId: address.sessionId });
	throw new RemoteError("subagent/not-found", "subagent is unavailable", {
		parentSessionId: address.parentSessionId,
		childSessionId: address.childSessionId
	});
}
function paginate(events, beforeSeq, maxMessages, throughSeq = events.at(-1)?.seq ?? -1) {
	const end = SessionLogOffset(Math.min(throughSeq + 1, beforeSeq ?? throughSeq + 1));
	let count = 0;
	let cut = SessionLogOffset(0);
	for (let index = end - 1; index >= 0; index--) {
		const event = events[index];
		if (!MESSAGE_TYPES$1.has(event.type) || !isAppendSurfaceEvent(event)) continue;
		count++;
		const sources = event.sourceEventSeqs;
		let groupStart = event.seq;
		if (sources !== void 0) {
			for (const source of sources) if (source < groupStart) groupStart = source;
		}
		if (count >= maxMessages) {
			cut = SessionLogOffset(groupStart);
			break;
		}
	}
	return {
		events: events.slice(cut, end),
		hasMore: cut > 0
	};
}
/** Translate current logical Session metadata to the browser wire. */
function wireHeader(header) {
	return { ...header };
}
function entryFor(event) {
	return {
		type: "event",
		event
	};
}
/** Encode one bounded logical page without changing its pagination cut. */
function pageRecords(events) {
	return events.map(entryFor);
}
//#endregion
//#region lib/types/file-references.js
/** Session Controller adapter for Agent-scoped file-reference discovery. */
var __runInitializers$2 = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate$2 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** Host Remote adapter over the composed file-reference provider. */
let SessionFileReferences = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _list_decorators;
	return class SessionFileReferences extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_list_decorators = [Remote];
			__esDecorate$2(this, null, _list_decorators, {
				kind: "method",
				name: "list",
				static: false,
				private: false,
				access: {
					has: (obj) => "list" in obj,
					get: (obj) => obj.list
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["fileReferences", "typert"];
		/** @param ctx - Host context carrying the selected file-reference provider. */
		constructor(ctx) {
			super(ctx, "sessionFileReferences", { namespace: "fileReferences" });
			__runInitializers$2(this, _instanceExtraInitializers);
		}
		/**
		* List file and directory candidates for one Agent's working directory.
		* @param agent - target Agent resolved from the Session identity on the wire.
		* @param query - path text following `@` or `@"`.
		* @param signal - caller cancellation.
		* @returns deterministic path-only candidates from the composed provider.
		*/
		list(agent, query, signal) {
			return this.ctx.fileReferences.list(agent, query, signal);
		}
	};
})();
//#endregion
//#region lib/types/list.js
/** Cold-safe Session list and search projection. */
const SEARCH_PROVIDER_CALL_LIMIT = 100;
const SESSION_SEARCH_QUERY_MAX_CHARS = 500;
const MESSAGE_TYPES = new Set(["user/message", "assistant/message"]);
const sessionListMetadataSchema = z$1.object({
	blank: z$1.boolean(),
	lastPromptAt: z$1.number().nullable()
});
const imageLimitsSchema = z$1.object({
	maxImageBytes: z$1.number().int().positive(),
	maxImagesPerMessage: z$1.number().int().positive(),
	maxMessageImageBytes: z$1.number().int().positive(),
	maxImagePixels: z$1.number().int().positive(),
	maxImageDimension: z$1.number().int().positive(),
	mediaTypes: z$1.array(z$1.string())
});
/**
* Advance the Session-list metadata projection by one committed event.
* @param state - metadata before the event.
* @param event - next committed Session event.
* @returns the original or advanced metadata value.
*/
function applySessionListMetadata(state, event) {
	const blank = state.blank && event.type !== "turn/start";
	const lastPromptAt = event.type === "user/message" && event.data.source.kind === "user" ? event.time : state.lastPromptAt;
	return blank === state.blank && lastPromptAt === state.lastPromptAt ? state : {
		blank,
		lastPromptAt
	};
}
/**
* Return the longest prefix containing at most `maximum` Unicode code points.
* @param value - source text.
* @param maximum - maximum number of Unicode code points.
* @returns the source text or its longest allowed prefix.
*/
function truncateUnicodeCodePoints(value, maximum) {
	let count = 0;
	let end = 0;
	for (const codePoint of value) {
		if (count === maximum) return value.slice(0, end);
		count++;
		end += codePoint.length;
	}
	return value;
}
/** Owns list projection registration, bounded cold summaries, and authorized search. */
var ApiSessionList = class {
	ctx;
	/** @param ctx - Host context carrying Session, query, persistence, and projection services. */
	constructor(ctx) {
		this.ctx = ctx;
		ctx.sessionProjections.register({
			key: "sessionListMetadata",
			stateSchema: sessionListMetadataSchema,
			init: () => ({
				blank: true,
				lastPromptAt: null
			}),
			apply: applySessionListMetadata,
			wire: {
				viewSchema: sessionListMetadataSchema,
				view: (state) => state
			},
			stateVersion: 1
		});
		ctx.inject(["attachments"], (attachmentCtx) => {
			ctx.sessionProjections.register({
				key: "imageLimits",
				stateSchema: z$1.null(),
				init: () => null,
				apply: (state) => state,
				wire: {
					viewSchema: imageLimitsSchema,
					view: () => attachmentCtx.attachments.imageLimits
				},
				stateVersion: 1
			});
		});
	}
	/**
	* Build one current attached-Session summary.
	* @param session - attached Session to summarize.
	* @returns current list metadata and available projections.
	*/
	summaryFor(session) {
		const projections = this.projectionsFor(session.header, session);
		const metadata = projections?.values.sessionListMetadata;
		return {
			sessionId: session.id,
			updatedAt: updatedAt(session.header, metadata),
			running: this.ctx.agents.get(session.id)?.status === "running",
			blank: metadata?.blank ?? session.seq === 0,
			...listFields(session.header),
			...projections === void 0 ? {} : { projections }
		};
	}
	/**
	* Read every visible attached and persisted Session without activating an Agent.
	* @param signal - optional cancellation for persistence reads.
	* @returns visible Session summaries ordered by activity.
	*/
	async list(signal) {
		signal?.throwIfAborted();
		const records = await this.ctx.sessionQuery.listSessions(signal);
		signal?.throwIfAborted();
		const items = [];
		const cold = [];
		for (const record of records) {
			const live = this.ctx.sessions.get(record.header.id);
			if (live !== void 0) {
				items.push(this.summaryFor(live));
				continue;
			}
			if (record.header.cwd === void 0) continue;
			cold.push(record.header);
		}
		for (const header of cold) items.push(this.summarizeCold(header));
		items.sort((left, right) => right.updatedAt - left.updatedAt);
		return items;
	}
	summarizeCold(header) {
		const projections = this.projectionsFor(header, void 0);
		const metadata = projections?.values.sessionListMetadata;
		return {
			sessionId: header.id,
			updatedAt: updatedAt(header, metadata),
			running: false,
			blank: metadata?.blank ?? false,
			...listFields(header),
			...projections === void 0 ? {} : { projections }
		};
	}
	/**
	* Search current visible message content without activating any matching Session.
	* @param query - literal message-content query.
	* @param signal - cancellation for list and search reads.
	* @returns authorized bounded Session search results.
	*/
	async search(query, signal) {
		const normalizedQuery = normalizeSearchQuery(query);
		signal.throwIfAborted();
		const provider = this.ctx.get("sessionQuery");
		if (provider === void 0) throw new RemoteError("gateway/internal", "session search is unavailable: this deployment does not mount @deepseek-ai/dsh-session-query", {});
		try {
			const visible = await provider.listSessions(signal);
			signal.throwIfAborted();
			const visibleIds = new Set(visible.filter((record) => record.header.cwd !== void 0).map((record) => record.header.id));
			if (visibleIds.size === 0) return {
				items: [],
				hasMore: false
			};
			const authorized = [];
			const acceptedIds = /* @__PURE__ */ new Set();
			const seenCursors = /* @__PURE__ */ new Set();
			let cursor;
			let providerCalls = 0;
			let pageLimit = 20;
			while (authorized.length <= 20) {
				signal.throwIfAborted();
				if (providerCalls >= SEARCH_PROVIDER_CALL_LIMIT) throw new Error(`session search provider exceeded the ${SEARCH_PROVIDER_CALL_LIMIT}-call work budget`);
				providerCalls++;
				const requestedCursor = cursor;
				const requestedLimit = pageLimit;
				let page;
				try {
					page = await provider.searchSessions({
						query: normalizedQuery,
						eventFilters: [{
							kind: "type",
							values: ["user/message", "assistant/message"]
						}, {
							kind: "surface",
							values: ["current"]
						}],
						limit: requestedLimit,
						...requestedCursor === void 0 ? {} : { cursor: requestedCursor }
					}, { signal });
					signal.throwIfAborted();
				} catch (error) {
					signal.throwIfAborted();
					if (requestedCursor === void 0 && error instanceof SessionQueryError && error.code === "SESSION_QUERY_INVALID_LIMIT" && requestedLimit > 1) {
						pageLimit = Math.max(1, Math.floor(requestedLimit / 2));
						continue;
					}
					if (requestedCursor !== void 0 && error instanceof SessionQueryError && error.code === "SESSION_QUERY_STALE_CURSOR") {
						authorized.length = 0;
						acceptedIds.clear();
						seenCursors.clear();
						cursor = void 0;
						continue;
					}
					throw error;
				}
				if (page.items.length > requestedLimit) throw new Error(`session search provider returned ${String(page.items.length)} items; maximum is ${String(requestedLimit)}`);
				for (const hit of page.items) {
					if (authorized.length > 20) continue;
					if (!visibleIds.has(hit.header.id) || hit.bestMatch.sessionId !== hit.header.id || hit.bestMatch.surface !== "current" || !MESSAGE_TYPES.has(hit.bestMatch.type) || acceptedIds.has(hit.header.id)) continue;
					acceptedIds.add(hit.header.id);
					authorized.push({
						sessionId: hit.header.id,
						snippet: truncateUnicodeCodePoints(hit.bestMatch.snippet, 240)
					});
				}
				if (page.nextCursor !== void 0) {
					if (seenCursors.has(page.nextCursor)) throw new Error("session search provider repeated a continuation cursor");
					seenCursors.add(page.nextCursor);
				}
				if (authorized.length > 20 || page.nextCursor === void 0) break;
				cursor = page.nextCursor;
			}
			return {
				items: authorized.slice(0, 20),
				hasMore: authorized.length > 20
			};
		} catch (error) {
			signal.throwIfAborted();
			if (error instanceof SessionQueryError && error.code === "SESSION_QUERY_ABORTED") throw new RemoteError("gateway/cancelled", "session search was aborted", {});
			throw new RemoteError("gateway/internal", `session search failed: ${String(error)}`, {});
		}
	}
	projectionsFor(header, session) {
		try {
			const cache = this.ctx.get("sessionProjectionCache");
			const block = session === void 0 ? header.isSeeded ? void 0 : cache?.cachedSnapshot(header, SessionLogOffset(0)) ?? cache?.cachedPredecessorTitle(header, SessionLogOffset(0)) : this.ctx.sessionProjections.cachedSnapshot(session);
			return block !== void 0 && Object.keys(block.values).length > 0 ? {
				asOfSeq: block.asOfSeq,
				values: block.values
			} : void 0;
		} catch (error) {
			this.ctx.logger.warn(`api-session.list: projection column for "${header.id}" failed; serving the row without it: ${String(error)}`);
			return;
		}
	}
};
function normalizeSearchQuery(query) {
	const normalized = query.trim();
	if (normalized.length === 0) throw new RemoteError("gateway/bad-request", "session search query must not be empty", {});
	if (normalized.length > SESSION_SEARCH_QUERY_MAX_CHARS) throw new RemoteError("gateway/bad-request", `session search query must contain at most ${SESSION_SEARCH_QUERY_MAX_CHARS} UTF-16 code units`, {});
	if (normalized.includes("\0")) throw new RemoteError("gateway/bad-request", "session search query must not contain NUL", {});
	return normalized;
}
function updatedAt(header, metadata) {
	return Math.max(header.createdAt, metadata?.lastPromptAt ?? 0);
}
function listFields(header) {
	return {
		...header.parentSession === void 0 ? {} : { parentSessionId: header.parentSession },
		...header.origin === void 0 ? {} : { origin: header.origin },
		...header.cwd === void 0 ? {} : { cwd: header.cwd }
	};
}
//#endregion
//#region lib/types/catalog.js
/** Shared projection of the live LLM registry into the browser model catalog. */
/**
* Build the browser model catalog without requiring a Session.
* @param ctx - Host context carrying the live LLM registry.
* @param defaultSelection - deployment default used before a Session selects a model.
* @returns successful non-empty provider groups and isolated provider failures.
*/
async function buildModelCatalog(ctx, defaultSelection = ctx.agentDefaultModel.currentSelection()) {
	const providers = ctx.llm.listProviders();
	const catalog = await Promise.all(providers.map(async (provider) => {
		try {
			const models = await ctx.llm.listModels(provider.id);
			const entries = await Promise.all(models.map(async (model) => {
				const resolved = await ctx.llm.resolveModelInfo(provider.id, model.id);
				const reasoning = resolved.reasoning === void 0 ? void 0 : {
					efforts: resolved.reasoning.efforts.map((effort) => ({
						id: effort.id,
						name: effort.name,
						...effort.description === void 0 ? {} : { description: effort.description }
					})),
					...resolved.reasoning.defaultEffort === void 0 ? {} : { defaultEffort: resolved.reasoning.defaultEffort }
				};
				return {
					id: model.id,
					name: model.name,
					...model.description === void 0 ? {} : { description: model.description },
					...reasoning === void 0 ? {} : { reasoning }
				};
			}));
			return {
				kind: "group",
				group: {
					id: provider.id,
					name: provider.name,
					models: entries
				}
			};
		} catch (error) {
			return {
				kind: "failure",
				failure: {
					id: provider.id,
					name: provider.name,
					message: error instanceof Error ? error.message : String(error)
				}
			};
		}
	}));
	return {
		default: { ...defaultSelection },
		routableProviders: providers.map((provider) => provider.id),
		groups: catalog.flatMap((item) => item.kind === "group" ? [item.group] : []).filter((group) => group.models.length > 0),
		failures: catalog.flatMap((item) => item.kind === "failure" ? [item.failure] : [])
	};
}
//#endregion
//#region lib/types/model-selection-projection.js
/** Durable model-selection intent and request-use projection. */
const modelSelectionSchema = z$1.object({
	provider: z$1.string().min(1),
	model: z$1.string().min(1),
	reasoningEffort: z$1.string().min(1).optional()
});
const modelSelectionProjectionStateSchema = z$1.object({
	lastUsed: modelSelectionSchema.nullable(),
	pending: modelSelectionSchema.nullable()
});
const modelSelectionProjectionSchema = z$1.object({
	lastUsed: modelSelectionSchema.nullable(),
	next: modelSelectionSchema.nullable()
});
/**
* Advance durable model-selection state by one Session event.
* @param state - selection state before the event.
* @param event - next committed Session event.
* @returns the original or advanced selection state.
*/
function applyModelSelectionProjection(state, event) {
	if (event.type === "model/selection") return sameSelection(state.pending, event.data) ? state : {
		lastUsed: state.lastUsed,
		pending: event.data
	};
	if (event.type !== "request/header") return state;
	const lastUsed = {
		provider: event.data.header.config.provider,
		model: event.data.header.config.model,
		...event.data.header.config.reasoningEffort === void 0 ? {} : { reasoningEffort: String(event.data.header.config.reasoningEffort) }
	};
	const pending = sameSelection(state.pending, lastUsed) ? null : state.pending;
	return sameSelection(state.lastUsed, lastUsed) && pending === state.pending ? state : {
		lastUsed,
		pending
	};
}
const modelSelectionProjection = {
	key: "modelSelection",
	stateSchema: modelSelectionProjectionStateSchema,
	init: () => ({
		lastUsed: null,
		pending: null
	}),
	apply: applyModelSelectionProjection,
	wire: {
		viewSchema: modelSelectionProjectionSchema,
		view: (state) => ({
			lastUsed: state.lastUsed,
			next: state.pending ?? state.lastUsed
		})
	},
	stateVersion: 2
};
function sameSelection(left, right) {
	return left === right || left !== null && right !== null && left.provider === right.provider && left.model === right.model && left.reasoningEffort === right.reasoningEffort;
}
/**
* Register the durable model-selection projection when the registry is present.
* @param ctx - Session Controller context.
*/
function installModelSelectionProjection(ctx) {
	ctx.sessionProjections.register(modelSelectionProjection);
}
//#endregion
//#region lib/types/skill-catalog.js
/** Session-addressed, cold-readable skill catalog Remote. */
var __runInitializers$1 = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate$1 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
var __addDisposableResource$1 = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources$1 = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/** Host service backing `ctx.remote.skills` without activating a cold Agent. */
let SessionSkillCatalog = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _list_decorators;
	return class SessionSkillCatalog extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_list_decorators = [Remote];
			__esDecorate$1(this, null, _list_decorators, {
				kind: "method",
				name: "list",
				static: false,
				private: false,
				access: {
					has: (obj) => "list" in obj,
					get: (obj) => obj.list
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = [
			"agents",
			"sessionQuery",
			"typert"
		];
		/** @param ctx - Host context carrying Session reads and optional skill/preset services. */
		constructor(ctx) {
			super(ctx, "sessionSkillCatalog", { namespace: "skills" });
			__runInitializers$1(this, _instanceExtraInitializers);
		}
		/**
		* List the user-invocable skills visible to one Session composition.
		* @param request - Session identity whose cwd and preset select the catalog view.
		* @param signal - caller lifetime carried by the Remote transport; admitted catalog reads retain their existing completion semantics.
		* @returns user-invocable skill metadata without loading skill bodies.
		* @throws RemoteError when the Session cannot be inspected or no registry can serve it.
		*/
		async list(request, signal) {
			const { sessionId } = request;
			let cwd;
			let agentPreset;
			try {
				const env_1 = {
					stack: [],
					error: void 0,
					hasError: false
				};
				try {
					const observation = __addDisposableResource$1(env_1, await this.ctx.sessionQuery.observeSession(sessionId), false);
					if (observation.projections === void 0) throw new Error("skill catalog requires a projected Session observation");
					cwd = observation.header.cwd;
					agentPreset = observation.projections.values.agentPreset ?? void 0;
				} catch (e_1) {
					env_1.error = e_1;
					env_1.hasError = true;
				} finally {
					__disposeResources$1(env_1);
				}
			} catch (error) {
				if (error instanceof SessionQueryError && error.code === "SESSION_QUERY_SESSION_NOT_FOUND") throw new RemoteError("session/not-found", `session "${sessionId}" not found`, { sessionId });
				throw new RemoteError("gateway/internal", `session "${sessionId}" could not be inspected: ${String(error)}`, {});
			}
			if (cwd === void 0) throw new RemoteError("gateway/internal", `session "${sessionId}" has no project cwd`, {});
			const live = this.ctx.agents.get(sessionId);
			const presets = this.ctx.get("agentPresets");
			const skillRegistry = (live === void 0 ? void 0 : presets?.serviceFor(live, "skills")) ?? this.ctx.get("skills");
			if (skillRegistry === void 0) throw new RemoteError("gateway/internal", "skill registry is absent: neither this session's agent preset nor the host composition mounts @deepseek-ai/dsh-skill", {});
			const scope = await this.scopeFor(sessionId, agentPreset);
			try {
				return { skills: (await skillRegistry.list({
					cwd,
					scope
				})).filter(isUserInvocable).map((skill) => ({
					name: skill.name,
					description: skill.description,
					...skill.whenToUse === void 0 ? {} : { whenToUse: skill.whenToUse },
					modelInvocable: skill.invocation.modelInvocable
				})) };
			} catch (error) {
				throw new RemoteError("gateway/internal", `skill listing failed: ${String(error)}`, {});
			}
		}
		/** Resolve a live or standing preset scope without creating an Agent. */
		async scopeFor(sessionId, agentPreset) {
			const live = this.ctx.agents.get(sessionId);
			if (live !== void 0) return live;
			const presets = this.ctx.get("agentPresets");
			if (presets === void 0) return void 0;
			try {
				return await presets.standingKeyFor(agentPreset);
			} catch {
				return;
			}
		}
	};
})();
//#endregion
//#region lib/types/media-references.js
/**
* Authenticated GET/HEAD /api/file reads bounded file responses through
* the composed filesystem provider. Paths and MIME types do not restrict access;
* the connection service authenticates requests before this handler.
* @module @deepseek-ai/dsh-api-session-controller/media-references
*/
const BASE_HEADERS = {
	"Cache-Control": "private, no-store",
	"X-Content-Type-Options": "nosniff",
	"Content-Security-Policy": "sandbox; default-src 'none'"
};
async function serveFile(request, fs, maxBytes) {
	const fail = (status, text) => new Response(request.method === "HEAD" ? null : text, {
		status,
		headers: BASE_HEADERS
	});
	const path = new URL(request.url).searchParams.get("path");
	if (path === null || path.length === 0) return fail(400, "missing path");
	if (path.includes("\0") || !isAbsolute(path)) return fail(400, "absolute path required");
	try {
		const target = await fs.resolve(path, { signal: request.signal });
		const mediaType = mime.lookup(target.displayPath) || "application/octet-stream";
		const headers = {
			...BASE_HEADERS,
			"Content-Type": mediaType
		};
		if (request.method === "HEAD") {
			const info = await fs.stat(target, request.signal);
			if (info === void 0) return fail(404, "not found");
			if (info.type !== "file") return fail(403, "not a regular file");
			if (info.size !== void 0) {
				if (info.size > maxBytes) return fail(413, "file exceeds byte limit");
				headers["Content-Length"] = String(info.size);
			}
			return new Response(null, { headers });
		}
		const bytes = await fs.readBytes(target, request.signal, maxBytes);
		headers["Content-Length"] = String(bytes.byteLength);
		return new Response(bytes.slice(), { headers });
	} catch (error) {
		if (!(error instanceof FsError)) throw error;
		return fail({
			FS_NOT_FOUND: 404,
			FS_NOT_REGULAR_FILE: 403,
			FS_PERMISSION_DENIED: 403,
			FS_SANDBOX_DENIED: 403,
			FS_TOO_LARGE: 413,
			FS_ABORTED: 499
		}[error.code] ?? 500, error.code);
	}
}
/**
* File-display contribution. The connection service supplies authentication;
* `ctx.fs` supplies the execution world's paths, reads, and access policy.
*/
const SessionMediaReferences = {
	inject: [
		"connection",
		"fs",
		"attachments"
	],
	apply(ctx) {
		const maxBytes = ctx.attachments.imageLimits.maxImageBytes;
		ctx.effect(() => ctx.connection.fetch.register({
			path: "/api/file",
			methods: ["GET", "HEAD"],
			requestBody: "buffered",
			fetch: (request) => serveFile(request, ctx.fs, maxBytes)
		}), "session-controller: /api/file");
	}
};
//#endregion
//#region lib/types/index.js
/** Session Remote owner: cold reads, explicit Agent commands, and live control state. */
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
var __addDisposableResource = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/** Host service backing the generated `ctx.remote.session` namespace. */
let SessionController = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _list_decorators;
	let _search_decorators;
	let _create_decorators;
	let _selectModel_decorators;
	let _modelCatalog_decorators;
	let _canOpenWorkspacePath_decorators;
	let _openWorkspacePath_decorators;
	let _rename_decorators;
	let _fork_decorators;
	let _prompt_decorators;
	let _attachment_decorators;
	let _updateQueue_decorators;
	let _cancel_decorators;
	let _page_decorators;
	let _follow_decorators;
	let _control_decorators;
	return class SessionController extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_list_decorators = [Remote("list")];
			_search_decorators = [Remote("search")];
			_create_decorators = [Remote("create")];
			_selectModel_decorators = [Remote("selectModel")];
			_modelCatalog_decorators = [Remote("modelCatalog")];
			_canOpenWorkspacePath_decorators = [Remote];
			_openWorkspacePath_decorators = [Remote("openWorkspacePath")];
			_rename_decorators = [Remote("rename")];
			_fork_decorators = [Remote("fork")];
			_prompt_decorators = [Remote("prompt")];
			_attachment_decorators = [Remote("attachment")];
			_updateQueue_decorators = [Remote("updateQueue")];
			_cancel_decorators = [Remote("cancel")];
			_page_decorators = [Remote("page")];
			_follow_decorators = [Remote({ mode: "stream" })];
			_control_decorators = [Remote({ mode: "stream" })];
			__esDecorate(this, null, _list_decorators, {
				kind: "method",
				name: "list",
				static: false,
				private: false,
				access: {
					has: (obj) => "list" in obj,
					get: (obj) => obj.list
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _search_decorators, {
				kind: "method",
				name: "search",
				static: false,
				private: false,
				access: {
					has: (obj) => "search" in obj,
					get: (obj) => obj.search
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _create_decorators, {
				kind: "method",
				name: "create",
				static: false,
				private: false,
				access: {
					has: (obj) => "create" in obj,
					get: (obj) => obj.create
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _selectModel_decorators, {
				kind: "method",
				name: "selectModel",
				static: false,
				private: false,
				access: {
					has: (obj) => "selectModel" in obj,
					get: (obj) => obj.selectModel
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _modelCatalog_decorators, {
				kind: "method",
				name: "modelCatalog",
				static: false,
				private: false,
				access: {
					has: (obj) => "modelCatalog" in obj,
					get: (obj) => obj.modelCatalog
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _canOpenWorkspacePath_decorators, {
				kind: "method",
				name: "canOpenWorkspacePath",
				static: false,
				private: false,
				access: {
					has: (obj) => "canOpenWorkspacePath" in obj,
					get: (obj) => obj.canOpenWorkspacePath
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _openWorkspacePath_decorators, {
				kind: "method",
				name: "openWorkspacePath",
				static: false,
				private: false,
				access: {
					has: (obj) => "openWorkspacePath" in obj,
					get: (obj) => obj.openWorkspacePath
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _rename_decorators, {
				kind: "method",
				name: "rename",
				static: false,
				private: false,
				access: {
					has: (obj) => "rename" in obj,
					get: (obj) => obj.rename
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _fork_decorators, {
				kind: "method",
				name: "fork",
				static: false,
				private: false,
				access: {
					has: (obj) => "fork" in obj,
					get: (obj) => obj.fork
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _prompt_decorators, {
				kind: "method",
				name: "prompt",
				static: false,
				private: false,
				access: {
					has: (obj) => "prompt" in obj,
					get: (obj) => obj.prompt
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _attachment_decorators, {
				kind: "method",
				name: "attachment",
				static: false,
				private: false,
				access: {
					has: (obj) => "attachment" in obj,
					get: (obj) => obj.attachment
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _updateQueue_decorators, {
				kind: "method",
				name: "updateQueue",
				static: false,
				private: false,
				access: {
					has: (obj) => "updateQueue" in obj,
					get: (obj) => obj.updateQueue
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _cancel_decorators, {
				kind: "method",
				name: "cancel",
				static: false,
				private: false,
				access: {
					has: (obj) => "cancel" in obj,
					get: (obj) => obj.cancel
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _page_decorators, {
				kind: "method",
				name: "page",
				static: false,
				private: false,
				access: {
					has: (obj) => "page" in obj,
					get: (obj) => obj.page
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _follow_decorators, {
				kind: "method",
				name: "follow",
				static: false,
				private: false,
				access: {
					has: (obj) => "follow" in obj,
					get: (obj) => obj.follow
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _control_decorators, {
				kind: "method",
				name: "control",
				static: false,
				private: false,
				access: {
					has: (obj) => "control" in obj,
					get: (obj) => obj.control
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = [
			"agentDefaultModel",
			"agents",
			"attachments",
			"fileUploads",
			"llm",
			"sessions",
			"sessionProjections",
			"sessionQuery",
			"typert",
			"workspaceRegistry"
		];
		static Config = z.object({ nativeOpen: z.boolean() });
		agents = __runInitializers(this, _instanceExtraInitializers);
		commands;
		controlState;
		history;
		listState;
		openPath;
		revealPath;
		canOpenPath;
		promotions = /* @__PURE__ */ new Set();
		/**
		* @param ctx - Host context containing the Session capability assembly.
		* @param config - native-opener deployment policy.
		* @param internals - host integrations replaceable by direct unit tests.
		*/
		constructor(ctx, config, internals = {}) {
			super(ctx, "sessionController", { namespace: "session" });
			installModelSelectionProjection(ctx);
			this.agents = new ApiSessionAgentController(ctx);
			this.commands = new SessionCommandController(ctx, this.agents, process.cwd());
			ctx.effect(() => ctx.fileUploads.registerAgentResolver(async (sessionId) => {
				const result = await this.agents.resolveAgent(sessionId);
				if ("error" in result) throw result.error;
				return result.agent;
			}), "session-controller: file-upload Agent resolver");
			this.controlState = new SessionControlController(ctx);
			ctx.effect(() => async () => {
				await Promise.allSettled([...this.promotions]);
			}, "session-controller.promotions");
			this.history = new SessionHistoryController(ctx, (observation) => {
				this.promote(observation);
			});
			this.listState = new ApiSessionList(ctx);
			this.openPath = internals.openPath ?? openNativePath;
			this.revealPath = internals.revealPath ?? revealNativePath;
			this.canOpenPath = internals.canOpenPath ?? (() => config.nativeOpen ?? (internals.openPath !== void 0 || canOpenNativePath()));
			ctx.plugin(SessionFileReferences);
			ctx.plugin(SessionMediaReferences);
			ctx.plugin(SessionSkillCatalog);
			ctx.on("session/created", (session) => {
				ctx.emit("api-session/added", this.listState.summaryFor(session));
			});
			ctx.on("session/disposed", (session) => {
				ctx.emit("api-session/removed", session.id);
			});
			ctx.on("agent/status", ({ agent, status }) => {
				ctx.emit("api-session/status", agent.id, status === "running");
			});
			ctx.on("agent/error", ({ agent, error }) => {
				ctx.emit("api-session/error", agent.id, errorChain(error));
			});
			ctx.on("session/event", (session, event) => {
				if (event.type === "request/header") {
					const agent = ctx.agents.get(session.id);
					if (agent?.session === session) this.agents.consumeSelection(agent, event.data.header.config.provider, event.data.header.config.model, event.data.header.config.reasoningEffort);
				}
				if (event.type !== "user/message" || event.data.source.kind !== "user") return;
				ctx.emit("api-session/activity", session.id, event.time);
			});
		}
		promote(observation) {
			const sessionId = observation.header.id;
			const task = (async () => {
				const env_1 = {
					stack: [],
					error: void 0,
					hasError: false
				};
				try {
					const ownedObservation = __addDisposableResource(env_1, observation, false);
					const result = await this.agents.resolveObservedAgent(ownedObservation);
					if ("error" in result) this.ctx.emit("api-session/error", sessionId, result.error.message);
				} catch (e_1) {
					env_1.error = e_1;
					env_1.hasError = true;
				} finally {
					__disposeResources(env_1);
				}
			})().catch((error) => {
				this.ctx.logger.error(`session-controller: background activation for "${sessionId}" failed: ${errorChain(error)}`);
			});
			this.promotions.add(task);
			task.finally(() => {
				this.promotions.delete(task);
			});
		}
		/**
		* Resolve or resume one ordinary Session for another Host API domain.
		* @param sessionId - Session identity whose Agent owns the operation.
		* @returns the live Agent or the stable Session-domain failure.
		*/
		resolveAgent(sessionId) {
			return this.agents.resolveAgent(sessionId);
		}
		/**
		* Inspect one attached or persisted Session without activating its Agent.
		* @param sessionId - durable Session identity.
		* @param signal - optional caller cancellation for persistence reads.
		* @returns the current attached state or persisted header and event prefix.
		*/
		inspect(sessionId, signal) {
			const attached = this.ctx.sessions.get(sessionId);
			if (attached !== void 0) return Promise.resolve({
				meta: attached.header,
				inheritedEventCount: attached.inheritedEventCount,
				events: attached.snapshotEvents()
			});
			return inspectApiSession(this.ctx, sessionId, signal);
		}
		/**
		* Read all visible Session rows without resuming an Agent.
		* @param _request - reserved empty list request.
		* @param signal - cancellation for persistence reads.
		* @returns visible Session summaries ordered by activity.
		*/
		async list(_request, signal) {
			return { items: await this.listState.list(signal) };
		}
		/**
		* Search visible Session content without resuming an Agent.
		* @param request - literal message-content query.
		* @param signal - cancellation for list and search reads.
		* @returns authorized bounded Session search results.
		*/
		search(request, signal) {
			return this.listState.search(request.query, signal);
		}
		/**
		* Create or idempotently adopt one ordinary Session.
		* @param request - requested identity, location, and Agent preset.
		* @returns the Session identity and resolved preset when configured.
		*/
		create(request) {
			return this.commands.create(request);
		}
		/**
		* Select one Session-local model after explicitly resuming the Session.
		* @param request - Session identity and requested model selection.
		* @returns the normalized selection installed for the Session.
		*/
		selectModel(request) {
			return this.commands.selectModel(request);
		}
		/**
		* Describe every currently routable model for Host-generation selectors.
		* @returns provider-grouped models, the deployment default, and isolated provider failures.
		*/
		modelCatalog() {
			return buildModelCatalog(this.ctx);
		}
		/**
		* Report whether this deployment can hand a Session workspace path to a native desktop.
		* @returns true when the matching open operation is available.
		*/
		canOpenWorkspacePath() {
			return this.canOpenPath();
		}
		/**
		* Describe the serving desktop for authenticated file-action routes.
		* @returns Host name, configured availability, and platform-specific file-manager behavior.
		*/
		workspaceDesktop() {
			const fileManager = nativeFileManager();
			return {
				name: hostname(),
				available: fileManager !== null && this.canOpenPath(),
				fileManager
			};
		}
		/**
		* Open one path prepared by a Session-aware caller on the Host desktop.
		* @param request - path after best-effort Session workspace resolution.
		* @param signal - caller lifetime; abort terminates the native command.
		* @returns confirmation after the native opener accepts the path.
		* @throws RemoteError when the request is invalid, cancelled, or the opener fails.
		*/
		async openWorkspacePath(request, signal) {
			if (request.path.length === 0) throw new RemoteError("gateway/bad-request", "session.openWorkspacePath requires a non-empty path", {});
			signal.throwIfAborted();
			try {
				if (request.action === "reveal") await this.revealPath(request.path, signal);
				else await this.openPath(request.path, signal);
				return { opened: true };
			} catch (error) {
				if (signal.aborted) throw new RemoteError("gateway/cancelled", "path open was aborted", {});
				throw new RemoteError("gateway/internal", `path open failed: ${error instanceof Error ? error.message : String(error)}`, {});
			}
		}
		/**
		* Rename one Session after explicitly resuming it.
		* @param request - Session identity and proposed title.
		* @returns the accepted title and durable event sequence.
		*/
		rename(request) {
			return this.commands.rename(request);
		}
		/**
		* Fork one cold-readable completed-turn prefix into a new Session.
		* @param request - source Session and optional event anchor.
		* @returns the new Session identity.
		*/
		fork(request) {
			return this.commands.fork(request);
		}
		/**
		* Admit one prompt after explicitly resuming its Session.
		* @param request - Session identity, prompt content, source metadata, and delivery mode.
		* @param signal - caller cancellation before prompt admission begins.
		* @returns acknowledgement that the Agent accepted the prompt.
		*/
		prompt(request, signal) {
			signal.throwIfAborted();
			return this.commands.prompt(request);
		}
		/**
		* Read one image proven reachable from the addressed Session log.
		* @param request - Session and attachment identities used for authorization.
		* @returns the durable attachment reference and base64-encoded bytes.
		*/
		attachment(request) {
			return this.commands.attachment(request);
		}
		/**
		* Mutate one still-pending queue occurrence on a live Agent.
		* @param request - Session, queue item, and requested mutation.
		* @returns acknowledgement that the queue mutation was applied.
		*/
		updateQueue(request) {
			return this.commands.updateQueue(request);
		}
		/**
		* Cancel one active Agent turn without dropping its pending inbox.
		* @param request - Session whose active Agent turn is cancelled.
		* @returns acknowledgement that cancellation was requested.
		*/
		cancel(request) {
			return this.commands.cancel(request);
		}
		/**
		* Read one cold-safe, message-aligned Session history page.
		* @param request - durable address, backward cursor, and page budget.
		* @param signal - cancellation for persistence reads.
		* @returns one chronological page.
		*/
		page(request, signal) {
			return this.history.page(request, signal);
		}
		/**
		* Follow one Session log from its opening or resume cursor.
		* @param request - durable address and last committed sequence already held by the caller.
		* @param signal - cancellation owned by the Remote stream carrier.
		* @returns a complete opening snapshot followed by gap-free durable event
		*   frames and optional cursorless assistant-stream frames.
		*/
		follow(request, signal) {
			return this.history.follow(request, signal);
		}
		/**
		* Stream a complete live-control baseline followed by replacement frames.
		* @param signal - cancellation owned by the Remote stream carrier.
		* @returns one complete baseline followed by live replacement frames.
		*/
		control(signal) {
			return this.controlState.control(signal);
		}
	};
})();
//#endregion
export { ApiSessionNotFound, SessionController, SessionController as default, SessionFileReferences, SessionSkillCatalog, buildModelCatalog };

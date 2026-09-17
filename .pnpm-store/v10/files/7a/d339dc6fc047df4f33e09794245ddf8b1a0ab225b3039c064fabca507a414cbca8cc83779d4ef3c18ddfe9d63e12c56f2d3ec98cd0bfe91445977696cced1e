import { dirname } from "node:path";
import Schema from "@deepseek-ai/schemastery";
import { canOpenNativePath, openNativePath, openNativeTextFile } from "@deepseek-ai/dsh-native-command";
import { Remote, RemoteError, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
//#region lib/types/credentials.js
/**
* Host owner of the `credentials` Remote namespace: the reference half of
* `ctx.credentials` as a browser configuration page reads and writes it.
*
* @module @deepseek-ai/dsh-api-settings-controller/src/credentials.ts
*/
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
/**
* Fan-out bound on one remote `describe` batch. A settings page asks about the
* references its own rows name, so this is far above any real page and still
* keeps one authenticated request from starting unbounded provider work.
*/
const MAX_DESCRIBE_REFS = 64;
const credentialRefSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
const describeRequestSchema = z.object({ refs: z.array(credentialRefSchema).max(MAX_DESCRIBE_REFS) });
const setRequestSchema = z.object({
	ref: credentialRefSchema,
	value: z.string().min(1)
});
const unsetRequestSchema = z.object({ ref: credentialRefSchema });
/** Parse the domain constraints that are more specific than generated TypeScript codecs. */
function parseRequest(method, schema, value) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) throw new RemoteError("gateway/bad-request", `invalid payload for ${method}`, { issues: parsed.error.issues });
	return parsed.data;
}
/**
* Copy exactly the fields {@link CredentialInfo} declares. The Gateway returns
* a business result without decoding it, so a provider whose `describe` carried
* extra enumerable properties would otherwise serialize them to the caller.
* @param info - the provider's answer for one reference.
* @returns the same facts with nothing else attached.
*/
function projectCredentialInfo(info) {
	return {
		configured: info.configured,
		...info.source === void 0 ? {} : { source: info.source },
		writable: info.writable
	};
}
/**
* Host service backing the generated `ctx.remote.credentials` namespace. It
* carries every wire obligation the credential seam itself does not: the batch
* fan-out bound, the field-by-field view projection, the reference-grammar
* guard, and the refusal mapping. Secret values cross in one direction only —
* no method here returns one.
*/
let CredentialsController = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _describe_decorators;
	let _set_decorators;
	let _unset_decorators;
	return class CredentialsController extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_describe_decorators = [Remote];
			_set_decorators = [Remote];
			_unset_decorators = [Remote];
			__esDecorate$1(this, null, _describe_decorators, {
				kind: "method",
				name: "describe",
				static: false,
				private: false,
				access: {
					has: (obj) => "describe" in obj,
					get: (obj) => obj.describe
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _set_decorators, {
				kind: "method",
				name: "set",
				static: false,
				private: false,
				access: {
					has: (obj) => "set" in obj,
					get: (obj) => obj.set
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _unset_decorators, {
				kind: "method",
				name: "unset",
				static: false,
				private: false,
				access: {
					has: (obj) => "unset" in obj,
					get: (obj) => obj.unset
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
		/** @param ctx - Host context where a credential provider may be mounted. */
		constructor(ctx) {
			super(ctx, "credentialsController", { namespace: "credentials" });
			__runInitializers$1(this, _instanceExtraInitializers);
		}
		/**
		* Describe several references for one configuration surface. Batched because
		* a settings page describes every reference its rows name at once, and one
		* round trip keeps those rows from settling separately.
		* @param refs - reference names, at most {@link MAX_DESCRIBE_REFS}; a name outside the grammar
		*   rejects the whole call as `gateway/bad-request`.
		* @returns one view per requested name, keyed by that name.
		* @throws RemoteError when the request is invalid or no credential provider is mounted.
		*/
		async describe(refs) {
			const branded = parseRequest("credentials.describe", describeRequestSchema, { refs }).refs.map((ref) => [ref, credentialRef(ref)]);
			const credentials = this.provider();
			const entries = await Promise.all(branded.map(async ([ref, key]) => [ref, projectCredentialInfo(await credentials.describe(key))]));
			return Object.fromEntries(entries);
		}
		/**
		* Store one value from a configuration surface. The value crosses the wire in
		* this direction only: no read path returns it.
		* @param ref - reference name to store under.
		* @param value - the non-empty secret value.
		* @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
		*/
		async set(ref, value) {
			const request = parseRequest("credentials.set", setRequestSchema, {
				ref,
				value
			});
			const branded = credentialRef(request.ref);
			const credentials = this.provider();
			await this.write(request.ref, () => credentials.set(branded, request.value));
		}
		/**
		* Remove one reference from a configuration surface.
		* @param ref - reference name to remove.
		* @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
		*/
		async unset(ref) {
			const request = parseRequest("credentials.unset", unsetRequestSchema, { ref });
			const branded = credentialRef(request.ref);
			const credentials = this.provider();
			await this.write(request.ref, () => credentials.unset(branded));
		}
		/** Resolve the optional provider or report how to supply it. */
		provider() {
			const credentials = this.ctx.get("credentials");
			if (credentials === void 0) throw new RemoteError("gateway/internal", "credentials service is absent: this deployment does not mount a credential provider (e.g. @deepseek-ai/dsh-credentials-local) in its composition", {});
			return credentials;
		}
		/**
		* Run one remote write and report every refusal as `credential/rejected`
		* carrying the seam's own message: a read-only source shadowing the reference
		* is what a configuration surface must show verbatim. Callers brand the
		* reference before entering, so a name outside the grammar never reaches this
		* path and fails the same way it does on the read side. The details name only
		* the reference, so no failure path can carry the value back out.
		*/
		async write(ref, write) {
			try {
				await write();
			} catch (error) {
				throw new RemoteError("credential/rejected", error instanceof Error ? error.message : String(error), { ref }, { cause: error });
			}
		}
	};
})();
//#endregion
//#region lib/types/index.js
/**
* Host Remote owner for the configuration surfaces over the settings-domain
* seams. Two namespaces: `settings`, the redacted reads and writes of
* `ctx.settings`, owned by the class below; and `credentials`, mounted from
* here as its own plugin.
*
* @module @deepseek-ai/dsh-api-settings-controller
*/
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
const settingsNamespaceRequestSchema = z.object({ ns: z.string().min(1) });
/** Read abort state afresh after an awaited provider or opener call. */
function isAborted(signal) {
	return signal.aborted;
}
/**
* Project one redacted descriptor onto its wire view, field by field. The
* Gateway returns a business result without decoding it, so a provider whose
* descriptor carried extra enumerable properties would otherwise serialize them
* to the caller.
* @param descriptor - one descriptor read under `redactSecrets`.
* @returns the same facts with nothing else attached.
*/
function namespaceView(descriptor) {
	return {
		ns: String(descriptor.ns),
		schema: descriptor.schema,
		value: descriptor.value,
		...descriptor.base === void 0 ? {} : { base: descriptor.base },
		...descriptor.user === void 0 ? {} : { user: descriptor.user },
		applies: descriptor.applies,
		secrets: (descriptor.secrets ?? []).map((secret) => ({
			path: [...secret.path],
			set: secret.set
		})),
		revision: descriptor.revision
	};
}
/**
* Host service backing the generated `ctx.remote.settings` namespace. Every
* remote read uses `redactSecrets: true`, so a `role('secret')` field cannot
* ride a response. Writes expose the settings service's merge, replacement,
* and path-addressed operations, and classify every provider refusal as
* `settings/conflict` or `settings/rejected` with the service's message.
*/
let SettingsController = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _describe_decorators;
	let _canOpenAgentPresetDirectory_decorators;
	let _update_decorators;
	let _replace_decorators;
	let _mutate_decorators;
	let _openSettingsDocument_decorators;
	let _openAgentPresetDirectory_decorators;
	return class SettingsController extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_describe_decorators = [Remote];
			_canOpenAgentPresetDirectory_decorators = [Remote];
			_update_decorators = [Remote];
			_replace_decorators = [Remote];
			_mutate_decorators = [Remote];
			_openSettingsDocument_decorators = [Remote];
			_openAgentPresetDirectory_decorators = [Remote];
			__esDecorate(this, null, _describe_decorators, {
				kind: "method",
				name: "describe",
				static: false,
				private: false,
				access: {
					has: (obj) => "describe" in obj,
					get: (obj) => obj.describe
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _canOpenAgentPresetDirectory_decorators, {
				kind: "method",
				name: "canOpenAgentPresetDirectory",
				static: false,
				private: false,
				access: {
					has: (obj) => "canOpenAgentPresetDirectory" in obj,
					get: (obj) => obj.canOpenAgentPresetDirectory
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _update_decorators, {
				kind: "method",
				name: "update",
				static: false,
				private: false,
				access: {
					has: (obj) => "update" in obj,
					get: (obj) => obj.update
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _replace_decorators, {
				kind: "method",
				name: "replace",
				static: false,
				private: false,
				access: {
					has: (obj) => "replace" in obj,
					get: (obj) => obj.replace
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _mutate_decorators, {
				kind: "method",
				name: "mutate",
				static: false,
				private: false,
				access: {
					has: (obj) => "mutate" in obj,
					get: (obj) => obj.mutate
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _openSettingsDocument_decorators, {
				kind: "method",
				name: "openSettingsDocument",
				static: false,
				private: false,
				access: {
					has: (obj) => "openSettingsDocument" in obj,
					get: (obj) => obj.openSettingsDocument
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _openAgentPresetDirectory_decorators, {
				kind: "method",
				name: "openAgentPresetDirectory",
				static: false,
				private: false,
				access: {
					has: (obj) => "openAgentPresetDirectory" in obj,
					get: (obj) => obj.openAgentPresetDirectory
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
		static Config = Schema.object({ nativeOpen: Schema.boolean() });
		openPath = __runInitializers(this, _instanceExtraInitializers);
		openTextFile;
		canOpenPath;
		/**
		* Register the settings namespace and mount the credentials namespace beside
		* it. Both namespaces stay registered when a provider is absent so calls can
		* return the configuration API's actionable missing-provider diagnostic.
		* @param ctx - Host context where settings and credential providers may be mounted.
		*/
		constructor(ctx, config = {}, internals = {}) {
			super(ctx, "settingsController", { namespace: "settings" });
			this.openPath = internals.openPath ?? openNativePath;
			this.openTextFile = internals.openTextFile ?? openNativeTextFile;
			this.canOpenPath = internals.canOpenPath ?? (() => config.nativeOpen ?? (internals.openPath !== void 0 || canOpenNativePath()));
			ctx.plugin(CredentialsController);
		}
		/**
		* Describe every registered namespace for a configuration page: redacted
		* layered values plus the serialized schema the page renders its form from.
		* @returns provider writability, local-document presence, and one view per namespace.
		* @throws RemoteError when no settings provider is mounted.
		*/
		describe() {
			const settings = this.provider();
			return {
				writable: settings.writable,
				hasDocument: settings.documentPath !== void 0,
				namespaces: settings.describe({ redactSecrets: true }).map(namespaceView)
			};
		}
		/**
		* Report whether this deployment can open an authored Agent preset directory natively.
		* @returns true when the matching open operation is available.
		*/
		canOpenAgentPresetDirectory() {
			return this.canOpenPath();
		}
		/**
		* Merge a patch into one namespace's stored user section.
		* @param ns - namespace key to write.
		* @param patch - fields to merge into the user section.
		* @param expectedRevision - revision the caller read; `undefined` writes unconditionally.
		* @returns the namespace's redacted view after the write.
		* @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
		*/
		update(ns, patch, expectedRevision) {
			return this.write(ns, "update", patch, expectedRevision);
		}
		/**
		* Replace one namespace's stored user section wholesale.
		* @param ns - namespace key to write.
		* @param section - complete replacement user section.
		* @param expectedRevision - revision the caller read; `undefined` writes unconditionally.
		* @returns the namespace's redacted view after the write.
		* @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
		*/
		replace(ns, section, expectedRevision) {
			return this.write(ns, "replace", section, expectedRevision);
		}
		/**
		* Apply path-addressed edits to one namespace's user section, resolved against
		* the section as stored rather than against whatever the caller last read,
		* then answer with that namespace's new redacted view.
		* @param ns - namespace key to write.
		* @param ops - the edits to apply, in order.
		* @param expectedRevision - revision the caller read; `undefined` writes unconditionally.
		* @returns the namespace's redacted view after the write.
		* @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
		*/
		async mutate(ns, ops, expectedRevision) {
			return this.write(ns, "mutate", ops, expectedRevision);
		}
		/**
		* Materialize the provider-owned settings document and open it in a native text editor.
		* @param signal - caller lifetime; abort terminates preparation or the native command.
		* @returns confirmation after the native opener accepts the document.
		* @throws RemoteError when no document exists, preparation fails, or opening fails.
		*/
		async openSettingsDocument(signal) {
			const settings = this.provider();
			if (isAborted(signal)) throw new RemoteError("gateway/cancelled", "settings document open was aborted", {});
			let path;
			try {
				path = await settings.prepareDocument();
			} catch (error) {
				if (isAborted(signal)) throw new RemoteError("gateway/cancelled", "settings document preparation was aborted", {});
				throw new RemoteError("gateway/internal", `settings document preparation failed: ${messageOf(error)}`, {}, { cause: error });
			}
			if (path === void 0) throw new RemoteError("gateway/internal", "settings provider has no local document to open", {});
			if (isAborted(signal)) throw new RemoteError("gateway/cancelled", "settings document open was aborted", {});
			try {
				await this.openTextFile(path, signal);
				return { opened: true };
			} catch (error) {
				if (isAborted(signal)) throw new RemoteError("gateway/cancelled", "settings document open was aborted", {});
				throw new RemoteError("gateway/internal", `path open failed: ${messageOf(error)}`, {}, { cause: error });
			}
		}
		/**
		* Open one user-authored Agent preset directory or return its path when no native opener exists.
		* @param agentPreset - preset id resolved against Host-owned roots.
		* @param signal - caller lifetime; abort terminates the native command.
		* @returns an opened confirmation or the resolved directory for text display.
		* @throws RemoteError when the preset is missing, read-only, invalid, or cannot be opened.
		*/
		async openAgentPresetDirectory(agentPreset, signal) {
			if (agentPreset.length === 0) throw new RemoteError("gateway/bad-request", "agent preset id must not be empty", {});
			const presets = this.ctx.get("agentPresets");
			if (presets === void 0) throw new RemoteError("agent-preset/not-found", "this deployment composes no agent presets", {
				agentPreset,
				available: []
			});
			const preset = await presets.resolve(agentPreset);
			if (preset.trust !== "user") throw new RemoteError("agent-preset/read-only", `agent-presets: preset "${preset.id}" cannot be written: it ships with the deployment`, {
				agentPreset: preset.id,
				reason: "it ships with the deployment"
			});
			const directory = dirname(preset.path);
			if (!this.canOpenPath()) return {
				opened: false,
				path: directory
			};
			try {
				await this.openPath(directory, signal);
				return { opened: true };
			} catch (error) {
				if (signal.aborted) throw new RemoteError("gateway/cancelled", "path open was aborted", {});
				throw new RemoteError("gateway/internal", `path open failed: ${messageOf(error)}`, {}, { cause: error });
			}
		}
		async write(ns, mode, input, expectedRevision) {
			const parsed = settingsNamespaceRequestSchema.safeParse({ ns });
			if (!parsed.success) throw new RemoteError("gateway/bad-request", `invalid payload for settings.${mode}`, { issues: parsed.error.issues });
			const settings = this.provider();
			const namespace = parsed.data.ns;
			try {
				if (mode === "update") await settings.update(namespace, input, expectedRevision);
				else if (mode === "replace") await settings.replace(namespace, input, expectedRevision);
				else await settings.mutate(namespace, input, expectedRevision);
			} catch (error) {
				throw rejected(ns, error);
			}
			const descriptor = settings.describe({ redactSecrets: true }).find((candidate) => candidate.ns === namespace);
			if (descriptor === void 0) throw new RemoteError("gateway/internal", `settings namespace "${ns}" was disposed after the ${mode}`, {});
			return namespaceView(descriptor);
		}
		/** Resolve the optional provider or report how to supply it. */
		provider() {
			const settings = this.ctx.get("settings");
			if (settings === void 0) throw new RemoteError("gateway/internal", "settings service is absent: this deployment does not mount a settings provider (e.g. @deepseek-ai/dsh-settings-file) in its composition", {});
			return settings;
		}
	};
})();
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
function settingsConflictOf(error) {
	if (typeof error !== "object" || error === null) return void 0;
	if (Reflect.get(error, "code") !== "SETTINGS_CONFLICT" || typeof Reflect.get(error, "message") !== "string" || typeof Reflect.get(error, "expected") !== "number" || typeof Reflect.get(error, "actual") !== "number") return void 0;
	return error;
}
/**
* Classify one seam refusal. A stale writer is its own outcome, not a malformed
* request: the client must re-read and re-apply rather than treat the write as
* invalid.
* @param ns - the namespace the write addressed.
* @param error - whatever the seam threw.
* @returns the failure to raise for that refusal.
*/
function rejected(ns, error) {
	const conflict = settingsConflictOf(error);
	if (conflict !== void 0) return new RemoteError("settings/conflict", conflict.message, {
		ns,
		expected: conflict.expected,
		actual: conflict.actual
	}, { cause: error });
	return new RemoteError("settings/rejected", messageOf(error), { ns }, { cause: error });
}
//#endregion
export { CredentialsController, SettingsController, SettingsController as default };

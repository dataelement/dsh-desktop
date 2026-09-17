import { randomUUID } from "@deepseek-ai/dsh-util-crypto";
import { AttachmentError, admitEncodedImages } from "@deepseek-ai/dsh-attachment";
import { NamedEntries, ScopedLayers } from "@deepseek-ai/dsh-scope";
import { SessionSeq } from "@deepseek-ai/dsh-session";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
//#region lib/types/brand.js
/**
* dsh-commands' owned branded id: command lifecycle pairing across the
* session log, the wire admission response, and client-side flow pairing.
*
* The `Branded<B>` primitive lives in `@deepseek-ai/dsh-brand`; this module
* is a pure type/constructor outlet (no cordis imports, no module
* augmentation) so wire and client programs can name the brand without
* loading the host plugin's Context merges — the `dsh-llm/brand` shape.
*
* @module @deepseek-ai/dsh-commands/brand
*/
/**
* Brand a string as a {@link CommandId}.
* @param id - the executor-minted pairing id.
* @returns the same string, branded; no validation is performed.
*/
function CommandId(id) {
	return id;
}
//#endregion
//#region lib/types/index.js
/**
* Plugin-owned human-command registry shared by interactive UI adapters.
* @module @deepseek-ai/dsh-commands
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
const name = "commands";
const COMMAND_NAME = /^[a-z][a-z0-9_-]*$/u;
/** Shared frozen attachments value for attachment-free invocations. */
const NO_ATTACHMENTS = Object.freeze([]);
/** All command registrations owned by one global or scoped layer. */
var CommandLayer = class {
	commands;
	/**
	* Create one command layer with diagnostics specific to its ownership scope.
	* @param scope - the scoped owner, or `undefined` for global registrations.
	*/
	constructor(scope) {
		this.commands = new NamedEntries((name) => /* @__PURE__ */ new Error(scope === void 0 ? `command "${name}" is already registered (for a per-agent variant, mount a command-injected plugin under that agent's \`agent.ctx\`)` : `command "${name}" is already registered in this scope`));
	}
	/** @returns whether this layer owns no command registrations. */
	isEmpty() {
		return this.commands.isEmpty();
	}
};
/**
* Parse an exact slash command without normalizing its trailing input.
*
* @param line - Complete candidate command line.
* @returns The parsed command, or `undefined` when the line is not a command.
*/
function parseCommand(line) {
	const match = /^\/([a-z][a-z0-9_-]*)(?=$|[\t\n\r ])/u.exec(line);
	if (match === null) return void 0;
	const name = match[1];
	/* v8 ignore next -- the first capture is required whenever the regular expression matches */
	if (name === void 0) return void 0;
	return Object.freeze({
		name,
		rawInput: line.slice(match[0].length)
	});
}
/** Convert arbitrary abort reasons to one stable rejected Error. */
function abortError(signal) {
	if (signal.reason instanceof Error) return signal.reason;
	return new Error(typeof signal.reason === "string" ? signal.reason : "command aborted");
}
/** The signal's normalized abort error when it is already aborted. */
function cancellationOf(signal) {
	return signal.aborted ? abortError(signal) : void 0;
}
/** Render arbitrary thrown values without trusting their string coercion. */
function renderThrown(value) {
	try {
		return String(value);
	} catch {
		return "<unrenderable thrown value>";
	}
}
/** Stop awaiting an uncooperative handler once its owning UI request aborts. */
function withAbort(promise, signal) {
	if (signal.aborted) return Promise.reject(abortError(signal));
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			signal.removeEventListener("abort", onAbort);
			reject(abortError(signal));
		};
		signal.addEventListener("abort", onAbort, { once: true });
		promise.then((value) => {
			signal.removeEventListener("abort", onAbort);
			resolve(value);
		}, (error) => {
			signal.removeEventListener("abort", onAbort);
			reject(error instanceof Error ? error : new Error(`command handler rejected with a non-Error value: ${renderThrown(error)}`, { cause: error }));
		});
	});
}
/** Reject invalid command metadata before it can reach a UI protocol. */
function normalizeDefinition(definition) {
	if (!COMMAND_NAME.test(definition.name)) throw new TypeError(`command name "${definition.name}" must match ${String(COMMAND_NAME)}`);
	if (typeof definition.description !== "string") throw new TypeError(`command "${definition.name}" description must be a string`);
	if (definition.description.trim().length === 0) throw new TypeError(`command "${definition.name}" description must not be empty`);
	if (typeof definition.handler !== "function") throw new TypeError(`command "${definition.name}" handler must be a function`);
	const rawInput = definition.input;
	let input;
	if (rawInput !== void 0) {
		if (typeof rawInput !== "object" || rawInput === null || !("hint" in rawInput) || typeof rawInput.hint !== "string") throw new TypeError(`command "${definition.name}" input hint must be a string`);
		if (rawInput.hint.trim().length === 0) throw new TypeError(`command "${definition.name}" input hint must not be empty`);
		if ("attachments" in rawInput && rawInput.attachments !== void 0 && typeof rawInput.attachments !== "boolean") throw new TypeError(`command "${definition.name}" input attachments flag must be a boolean`);
		input = Object.freeze({
			hint: rawInput.hint,
			..."attachments" in rawInput && rawInput.attachments === true ? { attachments: true } : {}
		});
	}
	const normalized = Object.freeze({
		name: definition.name,
		description: definition.description,
		...input === void 0 ? {} : { input },
		...definition.recordInput === void 0 ? {} : { recordInput: definition.recordInput },
		handler: definition.handler
	});
	return {
		definition: normalized,
		descriptor: Object.freeze({
			name: normalized.name,
			description: normalized.description,
			...normalized.input === void 0 ? {} : { input: normalized.input }
		})
	};
}
/** Validate and detach an untrusted handler result at the registry boundary. */
function normalizeResult(command, value) {
	if (typeof value !== "object" || value === null || !("kind" in value)) throw new TypeError(`command "${command}" handler must return a CommandResult`);
	const result = value;
	if (result.kind === "success") {
		if (result.text !== void 0 && typeof result.text !== "string") throw new TypeError(`command "${command}" success text must be a string when supplied`);
		if (result.sourceEventSeq !== void 0 && (!Number.isSafeInteger(result.sourceEventSeq) || result.sourceEventSeq < 0 || Object.is(result.sourceEventSeq, -0))) throw new TypeError(`command "${command}" success sourceEventSeq must be a non-negative safe integer when supplied`);
		return Object.freeze({
			kind: "success",
			...result.text === void 0 ? {} : { text: result.text },
			...result.sourceEventSeq === void 0 ? {} : { sourceEventSeq: SessionSeq(result.sourceEventSeq) }
		});
	}
	if (result.kind === "error") {
		if (typeof result.text !== "string" || result.text.trim().length === 0) throw new TypeError(`command "${command}" error text must be a non-empty string`);
		return Object.freeze({
			kind: "error",
			text: result.text
		});
	}
	throw new TypeError(`command "${command}" returned unknown result kind "${String(result.kind)}"`);
}
/**
* Human-command registry. Plain-context definitions are global; definitions
* registered through a command-injected child of an agent context shadow
* globals for that agent.
*/
let CommandRuntime = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _list_decorators;
	let _execute_decorators;
	return class CommandRuntime extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_list_decorators = [Remote];
			_execute_decorators = [Remote];
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
			__esDecorate(this, null, _execute_decorators, {
				kind: "method",
				name: "execute",
				static: false,
				private: false,
				access: {
					has: (obj) => "execute" in obj,
					get: (obj) => obj.execute
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
		layers = (__runInitializers(this, _instanceExtraInitializers), new ScopedLayers((scope) => new CommandLayer(scope), () => {
			this.notifyChange();
		}));
		/** Monotonic per-instance counter behind {@link mintCommandId}. */
		commandSeq = 0;
		/** Instance token keeping minted ids unique across process restarts over one resumed log. */
		instanceToken = randomUUID().slice(0, 8);
		/** Optional provider installed by the Session upload owner. */
		fileReceipts = { resolver: void 0 };
		constructor(ctx) {
			super(ctx, "commands");
		}
		/**
		* Register a global or calling-agent-scoped command.
		* @param definition - discovery metadata and direct UI handler.
		* @returns the exact effect disposer that unregisters this definition.
		*/
		register(definition) {
			const registered = normalizeDefinition(definition);
			return this.layers.effect(this.ctx, (layer) => layer.commands.insert(registered.definition.name, registered), { label: "commands.register()" });
		}
		/**
		* Register the sole authority that resolves staged file receipts for command submissions.
		* @param resolver - Session-aware receipt resolver.
		* @returns disposer that removes this exact resolver.
		*/
		registerFileReceiptResolver(resolver) {
			if (this.fileReceipts.resolver !== void 0) throw new Error("commands: a file receipt resolver is already registered");
			this.fileReceipts.resolver = resolver;
			return () => {
				if (this.fileReceipts.resolver === resolver) this.fileReceipts.resolver = void 0;
			};
		}
		/**
		* List the effective immutable command descriptors for one agent.
		* @param agent - exact receiving agent and scoped-layer key.
		* @returns name-sorted descriptors after scoped shadowing.
		*/
		list(agent) {
			return Object.freeze([...this.view(agent).values()].map((command) => command.descriptor).sort((left, right) => left.name < right.name ? -1 : 1));
		}
		/**
		* Resolve one effective command definition.
		* @param agent - exact receiving agent and scoped-layer key.
		* @param name - command name without a slash.
		* @returns the scoped shadow or global definition.
		*/
		find(agent, name) {
			return this.view(agent).get(name)?.definition;
		}
		/**
		* Parse and execute a known command without sending it to the model.
		*
		* A resolved command's lifecycle is logged: `command/run` is appended
		* before the handler is invoked and `command/done` after settlement (a
		* thrown or aborted handler settles as `kind: 'error'`). Both are direct
		* log-only appends — no turn wraps them, and persistence drains them at
		* ordinary checkpoints. Admission misses (syntax or unknown name) log
		* nothing — they never entered a handler. A `command/run` append failure
		* fails the execution loud; a `command/done` append failure on the
		* handler-failure path is contained so the handler's own error stays the
		* reported failure.
		*
		* Attachment admission is enforced here, not in the composer: attachments sent to a
		* command that does not declare `input.attachments`, an absent attachment store,
		* and an exceeded image limit each settle as an error result before
		* the handler runs. Validation rejection starts no attachment writes;
		* a storage failure can leave only unreachable content-addressed objects
		* for deferred collection.
		*
		* @param agent - exact receiving agent.
		* @param line - complete slash-command line.
		* @param submittedAttachments - encoded images and staged file receipts accompanying the line,
		*   in submission order; empty for a plain invocation.
		* @param signal - cancellation signal owned by the UI request.
		* @returns the settled execution (result + lifecycle pairing id), or
		*   `undefined` when syntax or name does not resolve.
		*/
		async execute(agent, line, submittedAttachments, signal) {
			const parsed = parseCommand(line);
			if (parsed === void 0) return void 0;
			const command = this.view(agent).get(parsed.name);
			if (command === void 0) return void 0;
			if (signal.aborted) throw abortError(signal);
			const commandId = this.mintCommandId();
			this.appendLifecycle(agent.session, "command/run", {
				commandId,
				name: parsed.name,
				...command.definition.recordInput === false ? {} : { args: parsed.rawInput },
				source: { kind: "user" }
			});
			const settle = (result) => {
				this.appendLifecycle(agent.session, "command/done", {
					commandId,
					kind: result.kind,
					...result.text === void 0 ? {} : { text: result.text },
					...result.kind === "success" && result.sourceEventSeq !== void 0 ? { sourceEventSeq: result.sourceEventSeq } : {}
				});
				return Object.freeze({
					commandId,
					result: Object.freeze(result)
				});
			};
			let attachments = NO_ATTACHMENTS;
			if (submittedAttachments.length > 0) {
				if (command.definition.input?.attachments !== true) return settle({
					kind: "error",
					text: `/${parsed.name} does not accept attachments`
				});
				const store = this.ctx.get("attachments");
				if (store === void 0) return settle({
					kind: "error",
					text: `/${parsed.name}: attachments are unavailable because no attachment store is composed`
				});
				try {
					attachments = await admitCommandAttachments(store, submittedAttachments, (receiptId) => this.fileReceipts.resolver?.(agent, receiptId));
				} catch (error) {
					if (error instanceof AttachmentError) return settle({
						kind: "error",
						text: error.message
					});
					this.settleThrown(agent.session, parsed.name, commandId, error);
					throw error;
				}
				const cancelledDuringAdmission = cancellationOf(signal);
				if (cancelledDuringAdmission !== void 0) {
					this.settleThrown(agent.session, parsed.name, commandId, cancelledDuringAdmission);
					throw cancelledDuringAdmission;
				}
			}
			const invocation = Object.freeze({
				commandId,
				agent,
				rawInput: parsed.rawInput,
				attachments,
				signal
			});
			let result;
			try {
				const output = command.definition.handler(invocation);
				result = normalizeResult(parsed.name, await withAbort(Promise.resolve(output), signal));
			} catch (error) {
				this.settleThrown(agent.session, parsed.name, commandId, error);
				throw error;
			}
			return settle(result);
		}
		/** Contained `command/done` error append for a thrown handler or admission failure. */
		settleThrown(session, command, commandId, error) {
			try {
				this.appendLifecycle(session, "command/done", {
					commandId,
					kind: "error",
					text: error instanceof Error ? error.message : renderThrown(error)
				});
			} catch (appendError) {
				this.ctx.logger.warn(`command "${command}": command/done append failed: ${renderThrown(appendError)}`);
			}
		}
		/** Mint the next pairing id (monotonic; instance-token-prefixed so a resumed log never repeats one). */
		mintCommandId() {
			this.commandSeq += 1;
			return CommandId(`cmd-${this.instanceToken}-${this.commandSeq}`);
		}
		/**
		* Append one log-only lifecycle event directly: no turn is opened for it and
		* no flush is forced — persistence observes the eager `session/event` path
		* and drains at ordinary checkpoints and teardown, like every other
		* standalone plugin event.
		*/
		appendLifecycle(session, type, data) {
			return session.append.bind(session)(type, data);
		}
		/** Resolve global definitions followed by exact scoped shadows. */
		view(agent) {
			return this.layers.merge(agent, (layer) => layer.commands);
		}
		/** Notify every registry observer without making UI refresh load-bearing. */
		notifyChange() {
			for (const callback of this.ctx.events.dispatch("emit", ["commands/change"])) try {
				const returned = callback();
				Promise.resolve(returned).catch((error) => {
					this.ctx.logger.warn(`commands/change listener rejected: ${renderThrown(error)}`);
				});
			} catch (error) {
				this.ctx.logger.warn(`commands/change listener threw: ${renderThrown(error)}`);
			}
		}
	};
})();
/** Admit a mixed command batch and restore its original image/file order. */
async function admitCommandAttachments(store, attachments, resolveFileReceipt) {
	const files = /* @__PURE__ */ new Map();
	for (const attachment of attachments) {
		if (attachment.type !== "file" || files.has(attachment.receiptId)) continue;
		const file = resolveFileReceipt(attachment.receiptId);
		if (file === void 0) throw new AttachmentError("File upload receipt is unknown for this session.", "ATTACHMENT_NOT_FOUND");
		files.set(attachment.receiptId, file);
	}
	const images = [];
	for (const attachment of attachments) {
		if (attachment.type !== "image") continue;
		images.push({
			mediaType: attachment.mediaType,
			data: attachment.data,
			...attachment.name === void 0 ? {} : { name: attachment.name }
		});
	}
	const imageRefs = images.length === 0 ? [] : await admitEncodedImages(store, images);
	let imageIndex = 0;
	const blocks = [];
	for (const attachment of attachments) {
		if (attachment.type === "image") {
			const ref = imageRefs[imageIndex];
			imageIndex += 1;
			blocks.push(Object.freeze({
				type: "image",
				attachment: ref
			}));
			continue;
		}
		blocks.push(Object.freeze({
			type: "file",
			attachment: files.get(attachment.receiptId)
		}));
	}
	return Object.freeze(blocks);
}
//#endregion
export { CommandId, CommandRuntime, CommandRuntime as default, name, parseCommand };

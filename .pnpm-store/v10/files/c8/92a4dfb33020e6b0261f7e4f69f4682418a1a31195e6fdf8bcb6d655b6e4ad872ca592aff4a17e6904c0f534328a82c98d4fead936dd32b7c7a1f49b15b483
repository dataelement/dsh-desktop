//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let node_worker_threads = require("node:worker_threads");
let _deepseek_ai_dsh_util_values = require("@deepseek-ai/dsh-util-values");
let node_vm = require("node:vm");
node_vm = __toESM(node_vm, 1);
let _deepseek_ai_dsh_brand = require("@deepseek-ai/dsh-brand");
let _deepseek_ai_dsh_tools = require("@deepseek-ai/dsh-tools");
let _deepseek_ai_dsh_workflow = require("@deepseek-ai/dsh-workflow");
//#region lib/types/protocol.js
/**
* The host⇄worker wire protocol: one string-valued enum of message tags per direction, a
* payload map giving each tag its parameters (the single source of truth), and the message
* unions derived from them. Payloads are plain JSON by construction for structured clone. Both
* directions are closed engine protocols whose receivers use `assertNever`; generic typed senders
* make tag/payload mismatches compile-time errors rather than silently skipped messages.
* @module @deepseek-ai/dsh-workflow-worker-thread/protocol
*/
/** Message tags the worker sends the host (the wire values are the tag strings). */
var WorkerToHostType;
(function(WorkerToHostType) {
	/** The startup handshake: the session is listening and awaits {@link HostToWorkerType.Go}. */
	WorkerToHostType["Ready"] = "ready";
	/** Observer narration: a `phase(title)` call. */
	WorkerToHostType["Phase"] = "phase";
	/** Observer narration: a `log(message)` call. */
	WorkerToHostType["Log"] = "log";
	/** Observer lifecycle: one `agent()` call started a child. */
	WorkerToHostType["AgentStart"] = "agent-start";
	/** Observer lifecycle: one `agent()` call settled. */
	WorkerToHostType["AgentEnd"] = "agent-end";
	/** Child RPC: start a child on the host (answered by ChildStarted or ChildStartError). */
	WorkerToHostType["ChildStart"] = "child-start";
	/** Child RPC: dispose a started child (answered by ChildDisposed). */
	WorkerToHostType["ChildDispose"] = "child-dispose";
	/** The run's single terminal result. */
	WorkerToHostType["Result"] = "result";
})(WorkerToHostType || (WorkerToHostType = {}));
/** Message tags the host sends the worker (the wire values are the tag strings). */
var HostToWorkerType;
(function(HostToWorkerType) {
	/** Releases the startup gate: run the script body. */
	HostToWorkerType["Go"] = "go";
	/** Cancel the run: hooks start throwing and the script dies at its next await. */
	HostToWorkerType["Cancel"] = "cancel";
	/** Child RPC reply: the provider fulfilled with a published run (exactly one start reply per ChildStart). */
	HostToWorkerType["ChildStarted"] = "child-started";
	/** Child RPC reply: the provider's asynchronous start failed. */
	HostToWorkerType["ChildStartError"] = "child-start-error";
	/** Child RPC: a started child's result RESOLVED (its JSON projection). */
	HostToWorkerType["ChildSettled"] = "child-settled";
	/** Child RPC: a started child's result REJECTED (an infrastructure fault, rendered). */
	HostToWorkerType["ChildFailed"] = "child-failed";
	/** Child RPC reply: a requested disposal completed. */
	HostToWorkerType["ChildDisposed"] = "child-disposed";
})(HostToWorkerType || (HostToWorkerType = {}));
//#endregion
//#region lib/types/realm.js
/**
* Materializes values leaving the script vm into plain JSON before they cross the worker
* boundary, and renders thrown script values without rejecting the run. The walk rejects
* values that JSON cannot preserve but trusts model-written workflow scripts: getters and proxy traps may
* run, and the vm is not a security boundary. The worker provides host-loop isolation and
* forced termination, not hostile-value containment. See
* .agents/notes/implemented/feature/2026-07-05-dynamic-workflows.md for the isolation rationale.
* @module @deepseek-ai/dsh-workflow-worker-thread/realm
*/
/** Thrown by {@link materializeFromRealm}; the caller wraps it into the right `WorkflowError` code. */
var MaterializeError = class extends Error {
	path;
	reason;
	constructor(path, reason) {
		super(`${path}: ${reason}`);
		this.path = path;
		this.reason = reason;
		this.name = "MaterializeError";
	}
};
/**
* Render a thrown value to failure text without ever throwing: prefer the
* `stack` (host or realm — a realm error's `stack` is a plain string read),
* fall back to `message`, then `String()`. Reading those properties MAY run
* script code (a getter, `toString`) — accepted under the module's trust
* premise; if that code itself throws, a fixed label is returned instead.
* @param error - any value thrown in the host or worker realm.
* @returns human-readable text for the failure report; prefers the stack.
*/
function renderThrown(error) {
	try {
		const stack = error?.stack;
		if (typeof stack === "string" && stack.length > 0) return stack;
		const message = error?.message;
		if (typeof message === "string" && message.length > 0) return message;
		return String(error);
	} catch {
		return "[unrenderable thrown value]";
	}
}
/**
* Whether an object's prototype chain represents a plain data object: `null`, or a prototype
* whose own prototype is `null` (the realm's `Object.prototype` — which we
* cannot compare by identity across realms). A `Date`/`Map`/class instance
* has a longer chain and is rejected.
*/
function hasPlainPrototype(value) {
	const proto = Object.getPrototypeOf(value);
	if (proto === null) return true;
	return Object.getPrototypeOf(proto) === null;
}
/**
* Copy `value` (typically from the vm realm) into plain host JSON data. Root `undefined` is
* returned unchanged; nested `undefined` and values JSON cannot represent losslessly fail
* with the offending path. Property accessors run normally, and a throwing read is wrapped
* with its rendered failure.
*
* @param value - the realm value to materialize.
* @param root - the path label for the root value (error messages).
* @returns the host-realm copy (plain objects/arrays/scalars only).
* @throws {@link MaterializeError} for unsupported values, cycles, sparse arrays, exotic
*   prototypes, or property reads that throw.
*/
function materializeFromRealm(value, root = "value") {
	if (value === void 0) return void 0;
	try {
		return materialize(value, root, /* @__PURE__ */ new Set());
	} catch (error) {
		if (error instanceof MaterializeError) throw error;
		throw new MaterializeError(root, `reading the value threw: ${renderThrown(error)}`);
	}
}
function materialize(value, path, seen) {
	switch (typeof value) {
		case "boolean":
		case "string": return value;
		case "number":
			if (!Number.isFinite(value)) throw new MaterializeError(path, "non-finite numbers are not JSON data");
			return value;
		case "bigint": throw new MaterializeError(path, "bigints are not JSON data");
		case "function": throw new MaterializeError(path, "functions are not plain JSON data");
		case "symbol": throw new MaterializeError(path, "symbols are not plain JSON data");
		case "undefined": throw new MaterializeError(path, "undefined is not JSON data");
		case "object": break;
	}
	if (value === null) return null;
	const objectValue = value;
	if (seen.has(objectValue)) throw new MaterializeError(path, "circular references are not JSON data");
	seen.add(objectValue);
	try {
		if (Array.isArray(objectValue)) return materializeArray(objectValue, path, seen);
		return materializeObject(objectValue, path, seen);
	} finally {
		seen.delete(objectValue);
	}
}
function materializeArray(value, path, seen) {
	const out = [];
	for (let index = 0; index < value.length; index++) {
		if (!(index in value)) throw new MaterializeError(`${path}[${index}]`, "sparse arrays are not JSON data");
		out.push(materialize(value[index], `${path}[${index}]`, seen));
	}
	for (const key of Object.keys(value)) {
		const index = Number(key);
		if (!Number.isInteger(index) || index < 0 || index >= value.length) throw new MaterializeError(`${path}.${key}`, "arrays with non-index properties are not JSON data");
	}
	if (Object.getOwnPropertySymbols(value).length > 0) throw new MaterializeError(path, "symbol-keyed properties are not plain JSON data");
	return out;
}
function materializeObject(value, path, seen) {
	if (!hasPlainPrototype(value)) throw new MaterializeError(path, "only plain objects and arrays are JSON data (exotic prototype)");
	if (Object.getOwnPropertySymbols(value).length > 0) throw new MaterializeError(path, "symbol-keyed properties are not plain JSON data");
	const out = {};
	for (const key of Object.keys(value)) Object.defineProperty(out, key, {
		value: materialize(value[key], `${path}.${key}`, seen),
		enumerable: true,
		writable: true,
		configurable: true
	});
	return out;
}
//#endregion
//#region lib/types/runtime.js
/**
* Per-run worker-side vm hooks, child RPC, concurrency/caps, cancellation, and result serialization; it
* never touches Cordis. Script values leaving the realm are materialized as plain JSON before
* messaging. Values entering the trusted model-written realm are passed directly; `args` alone is
* cloned so script mutation cannot alter initialization data. See `./realm.ts` for the trust model.
*
* Fatal workflow errors—bad hook arguments, unsupported schemas/options, caps, start failures, and
* cancellation—propagate through combinators. Only child failures and ordinary stage errors become
* per-item nulls. Every returned promise has a rejection consumer so dropped script promises cannot
* kill the worker. A cancelled script that never settles emits nothing; the host force-settles the
* run within grace and terminates the thread.
* @module @deepseek-ai/dsh-workflow-worker-thread/runtime
*/
/** The `agent()` options the script may pass; everything else rejects loud. */
const SUPPORTED_AGENT_OPTIONS = new Set([
	"label",
	"phase",
	"schema",
	"provider",
	"model"
]);
/** Deferred Claude Code options we name explicitly in the rejection message. */
const DEFERRED_AGENT_OPTIONS = new Set([
	"effort",
	"isolation",
	"agentType"
]);
/** Flatten a child's final output blocks to text (the non-schema `agent()` result). */
function outputText(blocks) {
	return blocks.filter((block) => block.type === "text").map((block) => block.text).join("");
}
/** A short display label derived from the prompt when the script passes none. */
function defaultLabel(prompt) {
	const newline = prompt.indexOf("\n");
	const line = newline === -1 ? prompt : prompt.slice(0, newline);
	return line.length <= 48 ? line : `${line.slice(0, 47)}…`;
}
/**
* One live script execution inside the worker. Constructed per run by the
* session; `drive()` is called exactly once and NEVER rejects — every failure
* becomes a {@link WorkflowResult} with a non-`completed` stop reason. The
* host owns cancellation and cleanup of any dropped child work.
*/
var WorkflowExecution = class {
	limits;
	observer;
	children;
	/** 1-based count of `agent()` calls started (the `agentsStarted` result field). */
	started = 0;
	activeSlots = 0;
	slotWaiters = [];
	cancelReason;
	cancelError;
	currentPhase;
	context;
	compiled;
	constructor(meta, body, args, limits, observer, children) {
		this.limits = limits;
		this.observer = observer;
		this.children = children;
		try {
			this.compiled = new node_vm.Script(`(async () => {\n${body}\n})()`, {
				filename: `workflow:${meta.name}`,
				lineOffset: -1
			});
		} catch (error) {
			throw new _deepseek_ai_dsh_workflow.WorkflowError(`workflow script does not parse: ${String(error)}`, "SCRIPT_PARSE", { cause: error });
		}
		this.context = node_vm.createContext({}, { name: `workflow:${meta.name}` });
		const globals = {
			agent: (prompt, opts) => this.contain(this.agent(prompt, opts)),
			parallel: (thunks) => this.contain(this.parallel(thunks)),
			pipeline: (items, ...stages) => this.contain(this.pipeline(items, stages)),
			phase: (title) => {
				this.phase(title);
			},
			log: (message) => {
				this.log(message);
			},
			args
		};
		for (const [key, value] of Object.entries(globals)) this.context[key] = typeof value === "function" ? Object.freeze(value) : value;
	}
	/**
	* Whether the run has been cancelled. A METHOD, not an inline property
	* read: `cancel()` mutates `cancelReason` concurrently (the session's
	* message handler), and an inline read after an `await` gets narrowed by
	* control flow into an always-false comparison.
	*/
	isCancelled() {
		return this.cancelReason !== void 0;
	}
	/**
	* Shared hook entry guard: after {@link cancel}, EVERY hook throws
	* `CANCELLED` at its next call — cancellation is the next HOOK boundary,
	* not just the next `agent()`, so a script that caught one cancelled
	* rejection cannot keep emitting progress through `phase`/`log` or enter a
	* combinator.
	*/
	throwIfCancelled() {
		if (this.isCancelled()) throw this.cancelledError();
	}
	/**
	* Cancel the run: waiting `agent()` slots reject and every future hook call
	* throws `CANCELLED` — the script dies at its next await. A script that
	* never settles anyway (parked on a promise no hook owns) is the HOST's
	* problem: its grace timer force-settles the run and terminates the
	* worker. Idempotent; the first reason wins.
	* @param reason - human-readable cause carried on the CANCELLED error. The
	* host independently aborts the required signal shared by every child.
	*/
	cancel(reason) {
		if (this.cancelReason !== void 0) return;
		this.cancelReason = reason;
		this.cancelError = new _deepseek_ai_dsh_workflow.WorkflowError(`workflow run cancelled: ${this.cancelReason}`, "CANCELLED");
		for (const waiter of this.slotWaiters.splice(0)) waiter.reject(this.cancelledError());
	}
	/**
	* Run the script to settlement. Resolves — never rejects — with the run's
	* {@link WorkflowResult}: the materialized return value on `completed`, the
	* failure message on `error`, and `cancelled` when the script died of
	* cancellation. This method only chooses the result; the session publishes
	* it and the host owns terminal child cancellation.
	* @returns the settled outcome — this promise NEVER rejects (the seam's
	* `result`-never-rejects contract); every failure maps to a variant.
	*/
	async drive() {
		try {
			if (this.isCancelled()) throw this.cancelledError();
			const scriptPromise = this.compiled.runInContext(this.context, { timeout: this.limits.syncTimeoutMs });
			const raw = await this.contain(Promise.resolve(scriptPromise));
			if (this.isCancelled()) throw this.cancelledError();
			return {
				value: raw === void 0 ? null : this.materializeResult(raw),
				stopReason: "completed",
				agentsStarted: this.started
			};
		} catch (error) {
			if (this.isCancelled()) return {
				value: null,
				stopReason: "cancelled",
				error: this.cancelledError().message,
				agentsStarted: this.started
			};
			return {
				value: null,
				stopReason: "error",
				error: renderThrown(error),
				agentsStarted: this.started
			};
		}
	}
	/**
	* Attach a no-op rejection consumer WITHOUT changing what the caller
	* receives: if the script drops the promise (no await), cancellation cannot
	* become an unhandled rejection (which would kill the worker thread); if
	* the script does await it, it still observes the rejection.
	*/
	contain(promise) {
		promise.catch(() => {});
		return promise;
	}
	cancelledError() {
		/* v8 ignore next */
		return this.cancelError ?? new _deepseek_ai_dsh_workflow.WorkflowError("workflow run cancelled", "CANCELLED");
	}
	/** Materialize the script's return value; violations become RESULT_UNSERIALIZABLE. */
	materializeResult(raw) {
		try {
			return materializeFromRealm(raw, "workflow result");
		} catch (error) {
			/* v8 ignore next -- defensive rethrow arm: materializeFromRealm only throws MaterializeError */
			if (!(error instanceof MaterializeError)) throw error;
			throw new _deepseek_ai_dsh_workflow.WorkflowError(`the workflow's return value is not plain JSON data — ${error.message}. Return only JSON-serializable objects/arrays/scalars.`, "RESULT_UNSERIALIZABLE", { cause: error });
		}
	}
	/**
	* Acquire one concurrency slot (FIFO). Cancellation rejects QUEUED waiters
	* (see {@link cancel}); the callers guard their own entry and post-acquire
	* windows, so no cancelled-precheck is duplicated here.
	*/
	acquireSlot() {
		if (this.activeSlots < this.limits.maxConcurrentAgents) {
			this.activeSlots += 1;
			return Promise.resolve();
		}
		return new Promise((resolve, reject) => {
			this.slotWaiters.push({
				resolve: () => {
					this.activeSlots += 1;
					resolve();
				},
				reject
			});
		});
	}
	releaseSlot() {
		this.activeSlots -= 1;
		const next = this.slotWaiters.shift();
		if (next) next.resolve();
	}
	/** The `agent(prompt, opts)` hook. */
	async agent(rawPrompt, rawOpts) {
		this.throwIfCancelled();
		if (typeof rawPrompt !== "string" || rawPrompt.length === 0) throw new _deepseek_ai_dsh_workflow.WorkflowError("agent() requires a non-empty prompt string", "INVALID_ARGUMENT");
		const opts = this.readAgentOptions(rawOpts);
		if (this.started >= this.limits.maxTotalAgents) throw new _deepseek_ai_dsh_workflow.WorkflowError(`this run reached its total agent cap (${this.limits.maxTotalAgents}) — a runaway-loop backstop; raise the applicable maxTotalAgents limit if the scale is intentional`, "AGENT_CAP");
		this.started += 1;
		const seq = this.started;
		const label = opts.label ?? defaultLabel(rawPrompt);
		const phase = opts.phase ?? this.currentPhase;
		await this.acquireSlot();
		try {
			this.throwIfCancelled();
			let run;
			try {
				run = await this.children.startAgent({
					prompt: rawPrompt,
					...opts.schema !== void 0 ? { schema: opts.schema } : {},
					...opts.provider !== void 0 ? { provider: opts.provider } : {},
					...opts.model !== void 0 ? { model: opts.model } : {}
				});
			} catch (error) {
				if (this.isCancelled()) throw this.cancelledError();
				throw new _deepseek_ai_dsh_workflow.WorkflowError(`agent() could not start a child: ${renderThrown(error)}`, "AGENT_START", { cause: error });
			}
			if (this.isCancelled()) {
				await run.dispose();
				throw this.cancelledError();
			}
			const info = {
				seq,
				label,
				...phase !== void 0 ? { phase } : {},
				childId: (0, _deepseek_ai_dsh_brand.brandString)(run.id)
			};
			this.observer.agentStart(info);
			try {
				let result;
				try {
					result = await run.result;
				} catch (error) {
					if (this.isCancelled()) {
						this.observer.agentEnd({
							...info,
							outcome: "cancelled"
						});
						throw this.cancelledError();
					}
					this.observer.agentEnd({
						...info,
						outcome: "failed"
					});
					throw new _deepseek_ai_dsh_workflow.WorkflowError(`child agent run failed: ${renderThrown(error)}`, "AGENT_RESULT", { cause: error });
				}
				if (result.stopReason === "completed") {
					if (opts.schema !== void 0) {
						if (result.structured === void 0) {
							this.observer.agentEnd({
								...info,
								outcome: "failed"
							});
							return null;
						}
						this.observer.agentEnd({
							...info,
							outcome: "completed"
						});
						return result.structured;
					}
					this.observer.agentEnd({
						...info,
						outcome: "completed"
					});
					return outputText(result.output);
				}
				if (this.isCancelled()) {
					this.observer.agentEnd({
						...info,
						outcome: "cancelled"
					});
					throw this.cancelledError();
				}
				this.observer.agentEnd({
					...info,
					outcome: "failed"
				});
				return null;
			} finally {
				await run.dispose();
			}
		} finally {
			this.releaseSlot();
		}
	}
	/** Materialize + validate the `agent()` options bag from the realm. */
	readAgentOptions(rawOpts) {
		if (rawOpts === void 0) return {};
		let opts;
		try {
			opts = materializeFromRealm(rawOpts, "agent() options");
		} catch (error) {
			/* v8 ignore next -- defensive rethrow arm: materializeFromRealm only throws MaterializeError */
			if (!(error instanceof MaterializeError)) throw error;
			throw new _deepseek_ai_dsh_workflow.WorkflowError(`agent() options must be plain JSON data — ${error.message}`, "INVALID_ARGUMENT", { cause: error });
		}
		if (typeof opts !== "object" || opts === null || Array.isArray(opts)) throw new _deepseek_ai_dsh_workflow.WorkflowError("agent() options must be an object", "INVALID_ARGUMENT");
		const record = opts;
		for (const key of Object.keys(record)) {
			if (SUPPORTED_AGENT_OPTIONS.has(key)) continue;
			if (DEFERRED_AGENT_OPTIONS.has(key)) throw new _deepseek_ai_dsh_workflow.WorkflowError(`agent() option "${key}" is deferred and not supported by this engine (supported: label, phase, schema, provider, model)`, "UNSUPPORTED_OPTION");
			throw new _deepseek_ai_dsh_workflow.WorkflowError(`agent() option "${key}" is not recognized (supported: label, phase, schema, provider, model)`, "UNSUPPORTED_OPTION");
		}
		for (const key of [
			"label",
			"phase",
			"provider",
			"model"
		]) if (record[key] !== void 0 && typeof record[key] !== "string") throw new _deepseek_ai_dsh_workflow.WorkflowError(`agent() option "${key}" must be a string`, "INVALID_ARGUMENT");
		let schema;
		if (record.schema !== void 0) try {
			(0, _deepseek_ai_dsh_tools.assertObjectJsonSchema)(record.schema);
			schema = record.schema;
		} catch (error) {
			/* v8 ignore next -- defensive rethrow arm: assertObjectJsonSchema only throws JsonSchemaError */
			if (!(error instanceof _deepseek_ai_dsh_tools.JsonSchemaError)) throw error;
			throw new _deepseek_ai_dsh_workflow.WorkflowError(`agent() schema is outside the supported subset — ${error.message}`, "UNSUPPORTED_SCHEMA", { cause: error });
		}
		return {
			...record.label !== void 0 ? { label: record.label } : {},
			...record.phase !== void 0 ? { phase: record.phase } : {},
			...record.provider !== void 0 ? { provider: record.provider } : {},
			...record.model !== void 0 ? { model: record.model } : {},
			...schema !== void 0 ? { schema } : {}
		};
	}
	/** The `parallel(thunks)` hook: each thunk caught → `null`; fatal errors propagate. */
	async parallel(rawThunks) {
		this.throwIfCancelled();
		if (!Array.isArray(rawThunks)) throw new _deepseek_ai_dsh_workflow.WorkflowError("parallel() requires an array of zero-argument functions", "INVALID_ARGUMENT");
		this.assertItemCap(rawThunks.length, "parallel()");
		const thunks = rawThunks.map((thunk, index) => {
			if (typeof thunk !== "function") throw new _deepseek_ai_dsh_workflow.WorkflowError(`parallel() item ${index} is not a function`, "INVALID_ARGUMENT");
			return thunk;
		});
		return Promise.all(thunks.map(async (thunk) => {
			try {
				return await thunk();
			} catch (error) {
				if ((0, _deepseek_ai_dsh_workflow.isFatalWorkflowError)(error)) throw error;
				return null;
			}
		}));
	}
	/** The `pipeline(items, ...stages)` hook: per-item stage chains, NO cross-stage barrier. */
	async pipeline(rawItems, rawStages) {
		this.throwIfCancelled();
		if (!Array.isArray(rawItems)) throw new _deepseek_ai_dsh_workflow.WorkflowError("pipeline() requires an items array", "INVALID_ARGUMENT");
		this.assertItemCap(rawItems.length, "pipeline()");
		if (rawStages.length === 0) throw new _deepseek_ai_dsh_workflow.WorkflowError("pipeline() requires at least one stage function", "INVALID_ARGUMENT");
		const stages = rawStages.map((stage, index) => {
			if (typeof stage !== "function") throw new _deepseek_ai_dsh_workflow.WorkflowError(`pipeline() stage ${index} is not a function`, "INVALID_ARGUMENT");
			return stage;
		});
		return Promise.all(rawItems.map(async (item, index) => {
			let value = item;
			try {
				for (const stage of stages) value = await stage(value, item, index);
				return value;
			} catch (error) {
				if ((0, _deepseek_ai_dsh_workflow.isFatalWorkflowError)(error)) throw error;
				return null;
			}
		}));
	}
	assertItemCap(length, hook) {
		if (length > this.limits.maxItemsPerCall) throw new _deepseek_ai_dsh_workflow.WorkflowError(`${hook} received ${length} items — over the per-call cap (${this.limits.maxItemsPerCall}); split the work or raise maxItemsPerCall in the engine config`, "ITEM_CAP");
	}
	/** The `phase(title)` hook: sets the current label for subsequent `agent()` calls and notifies observers. */
	phase(title) {
		this.throwIfCancelled();
		if (typeof title !== "string" || title.length === 0) throw new _deepseek_ai_dsh_workflow.WorkflowError("phase() requires a non-empty title string", "INVALID_ARGUMENT");
		this.currentPhase = title;
		this.observer.phase(title);
	}
	/** The `log(message)` hook: narration to observers. */
	log(message) {
		this.throwIfCancelled();
		if (typeof message !== "string") throw new _deepseek_ai_dsh_workflow.WorkflowError("log() requires a message string", "INVALID_ARGUMENT");
		this.observer.log(message);
	}
};
//#endregion
//#region lib/types/session.js
/**
* The worker-side half of the engine: {@link runWorkerSession} wires one MessagePort to one
* {@link WorkflowExecution} — hook progress and child starts go out as messages, run control
* and child lifecycle come back in — and posts the run's terminal result exactly once. Keeping it
* separate from `worker.ts` lets unit tests drive the session over a MessageChannel, because main
* process coverage cannot observe code inside a real Worker.
*
* The session announces ready and waits for `go`, so cancellation racing startup can prevent even
* the script's synchronous prefix. A cancel in place of `go` releases the gate into a cancelled
* drive without executing the body.
* @module @deepseek-ai/dsh-workflow-worker-thread/session
*/
/**
* The worker-side handle for one started child agent ({@link ChildHandle}):
* every member is an RPC to the host keyed by this call's `callId`, resolved
* by the session's message handler through the bridge's pending entry.
*/
var RpcChildHandle = class {
	post;
	callId;
	entry;
	id;
	result;
	constructor(post, callId, entry, id) {
		this.post = post;
		this.callId = callId;
		this.entry = entry;
		this.id = id;
		this.result = entry.settled.promise;
	}
	dispose() {
		this.post(WorkerToHostType.ChildDispose, { callId: this.callId });
		return this.entry.disposed.promise;
	}
};
/**
* The worker-side child-RPC bridge ({@link ChildPort}): allocates callIds,
* posts the start/dispose RPCs, and owns the per-call pending
* book-keeping the session's message handler settles via the `onChild*`
* entry points.
*/
var ChildRpcBridge = class {
	post;
	nextCallId = 0;
	pending = /* @__PURE__ */ new Map();
	constructor(post) {
		this.post = post;
	}
	async startAgent(request) {
		this.nextCallId += 1;
		const callId = this.nextCallId;
		const entry = {
			started: Promise.withResolvers(),
			settled: Promise.withResolvers(),
			disposed: Promise.withResolvers()
		};
		entry.settled.promise.catch(() => {});
		this.pending.set(callId, entry);
		this.post(WorkerToHostType.ChildStart, {
			callId,
			request
		});
		const childId = await entry.started.promise;
		return new RpcChildHandle(this.post, callId, entry, childId);
	}
	/** The host established a published child; releases the `startAgent` await. */
	onChildStarted(callId, childId) {
		this.pending.get(callId)?.started.resolve(childId);
	}
	/** Asynchronous provider start failed; reject and retire the pending RPC. */
	onChildStartError(callId, rendered) {
		const entry = this.pending.get(callId);
		this.pending.delete(callId);
		entry?.started.reject(new Error(rendered));
	}
	/** The child's terminal result arrived. */
	onChildSettled(callId, result) {
		this.pending.get(callId)?.settled.resolve(result);
	}
	/** The child's `result` rejected host-side (an infrastructure fault, relayed as fatal). */
	onChildFailed(callId, rendered) {
		this.pending.get(callId)?.settled.reject(new Error(rendered));
	}
	/** The host acked the dispose; the call's book-keeping is complete. */
	onChildDisposed(callId) {
		const entry = this.pending.get(callId);
		this.pending.delete(callId);
		entry?.disposed.resolve();
	}
};
/**
* Narrow the nullable `parentPort` the bootstrap reads from
* `node:worker_threads`.
* @param port - `parentPort` as imported (null on the main thread).
* @returns the port, non-null.
*/
function requireParentPort(port) {
	if (port === null) throw new Error("the workflow worker entry must be loaded inside a worker thread (no parentPort)");
	return port;
}
/**
* Run one workflow script to settlement against `port`, posting the terminal result message
* exactly once; resolves after that post (stray children may still be winding down through the
* port — the host owns their teardown and ultimately terminates the thread). It never rejects:
* constructor failure becomes an error result. Host pre-parse makes syntax failure here a likely
* Node-version skew, but the session still reports it instead of dying silently.
* @param port - the channel to the host (the real `parentPort`, or one side
*   of an in-process `MessageChannel` in tests).
* @param init - the run payload the host provided as `workerData`.
*/
async function runWorkerSession(port, init) {
	const post = (type, payload) => {
		port.postMessage({
			type,
			...payload
		});
	};
	const children = new ChildRpcBridge(post);
	const observer = {
		phase: (title) => {
			post(WorkerToHostType.Phase, { title });
		},
		log: (message) => {
			post(WorkerToHostType.Log, { message });
		},
		agentStart: (info) => {
			post(WorkerToHostType.AgentStart, { info });
		},
		agentEnd: (info) => {
			post(WorkerToHostType.AgentEnd, { info });
		}
	};
	let execution;
	try {
		execution = new WorkflowExecution(init.meta, init.body, init.args, init.limits, observer, children);
	} catch (error) {
		post(WorkerToHostType.Result, { result: {
			value: null,
			stopReason: "error",
			error: renderThrown(error),
			agentsStarted: 0
		} });
		return;
	}
	const gate = Promise.withResolvers();
	port.on("message", (message) => {
		switch (message.type) {
			case HostToWorkerType.Go:
				gate.resolve();
				break;
			case HostToWorkerType.Cancel:
				execution.cancel(message.reason);
				gate.resolve();
				break;
			case HostToWorkerType.ChildStarted:
				children.onChildStarted(message.callId, message.childId);
				break;
			case HostToWorkerType.ChildStartError:
				children.onChildStartError(message.callId, message.rendered);
				break;
			case HostToWorkerType.ChildSettled:
				children.onChildSettled(message.callId, message.result);
				break;
			case HostToWorkerType.ChildFailed:
				children.onChildFailed(message.callId, message.rendered);
				break;
			case HostToWorkerType.ChildDisposed:
				children.onChildDisposed(message.callId);
				break;
			/* v8 ignore next 2 -- closed engine-owned union; the arm only makes adding a message type a compile error */
			default: (0, _deepseek_ai_dsh_util_values.assertNever)(message, "host-to-worker message");
		}
	});
	post(WorkerToHostType.Ready, {});
	await gate.promise;
	const result = await execution.drive();
	post(WorkerToHostType.Result, { result });
}
//#endregion
//#region lib/types/worker.js
/**
* Single-statement worker entry that boots `runWorkerSession` on real `parentPort`. Logic remains in
* the session module for in-process MessageChannel coverage; importing this entry on the main thread
* exercises `requireParentPort`'s failure path.
* @module @deepseek-ai/dsh-workflow-worker-thread/worker
*/
runWorkerSession(requireParentPort(node_worker_threads.parentPort), node_worker_threads.workerData);
//#endregion

import { randomUUID } from "node:crypto";
import { availableParallelism, tmpdir } from "node:os";
import * as vm from "node:vm";
import z from "@deepseek-ai/schemastery";
import WorkflowEngine, { WorkflowError, WorkflowRunId } from "@deepseek-ai/dsh-workflow";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { assertNever, snapshotJsonValue } from "@deepseek-ai/dsh-util-values";
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
//#region lib/types/host.js
/**
* Host side of one workflow run. The first worker result, unexpected death, or
* cancellation-grace expiry owns settlement and closes message admission.
* Pending starts share one abort signal; published children share idempotent
* cleanup, and quiescence waits for both while synthesizing any missing end events.
* @module @deepseek-ai/dsh-workflow-worker-thread/host
*/
/**
* The scrubbed worker environment: no ambient credentials, no loader flags, and deliberately no
* proxy policy. A worker thread does not inherit the host's global dispatcher, so a workflow's own
* requests go direct — the alternative is handing the worker a proxy URL that may carry
* `user:password`, and this worker executes the model-authored script body. That is the same
* containment the code runtime keeps, and `docs/defensive-patterns.md` requires it.
* Windows derives `os.tmpdir()` from `TMP`/`TEMP` and falls back to the
* literal relative path `undefined\temp` when the environment is empty, so
* tsx's transform cache would land in a cwd-relative `undefined/temp`
* directory; the host's real temp path (not a credential) is injected there.
* The unbuilt shape additionally forwards `TSX_TSCONFIG_PATH` for path
* resolution.
* @param platform - host platform; overridable so tests exercise both peer arms.
* @param tsconfigPath - the tsconfig pin to forward; only the unbuilt caller
*   passes one, so the built worker never observes the host's pin.
* @returns the scrubbed worker environment object.
*/
function workerSpawnEnv(platform = process.platform, tsconfigPath) {
	const env = {};
	if (platform === "win32") {
		const tmp = tmpdir();
		env.TMP = tmp;
		env.TEMP = tmp;
	}
	if (tsconfigPath !== void 0) env.TSX_TSCONFIG_PATH = tsconfigPath;
	return env;
}
/**
* Resolve a built worker bundle or an unbuilt bootstrap that installs both tsx
* transforms inside the worker. Both shapes clear `execArgv` and the ambient
* environment (the worker only sees the platform temp path and, unbuilt,
* `TSX_TSCONFIG_PATH`).
* @param init - the run payload, passed as `workerData`.
* @returns the entry path or URL and the Worker options to spawn it with.
*/
function resolveWorkerSpawn(init) {
	/* v8 ignore next 3 -- the built-output arm: tests always run unbuilt (src/); the built-worker e2e exercises this shape for real */
	if (!import.meta.url.endsWith(".ts")) return {
		entry: fileURLToPath(new URL("./worker.cjs", import.meta.url)),
		options: {
			workerData: init,
			env: workerSpawnEnv(),
			execArgv: []
		}
	};
	const workerEntry = new URL("./worker.ts", import.meta.url);
	const tsxEsmApiEntry = import.meta.resolve("tsx/esm/api");
	const tsxCjsApiEntry = import.meta.resolve("tsx/cjs/api");
	const bootstrap = [
		`import { register as registerEsm } from ${JSON.stringify(tsxEsmApiEntry)}`,
		`import { register as registerCjs } from ${JSON.stringify(tsxCjsApiEntry)}`,
		"registerCjs()",
		"registerEsm()",
		`await import(${JSON.stringify(workerEntry.href)})`
	].join("\n");
	return {
		entry: new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`),
		options: {
			workerData: init,
			env: workerSpawnEnv(void 0, process.env.TSX_TSCONFIG_PATH),
			execArgv: []
		}
	};
}
/**
* One live worker-engine run — the seam's {@link WorkflowRun}, returned by
* `start()` directly. Owns the Worker, the child registry, and the result
* settlement; `result` never rejects. `meta` is trusted same-process data
* borrowed as immutable by the handle and lifecycle events. The holder-bound
* SubagentRuntime handle is captured before the
* engine returns this run, so unloading the engine removes only the ability to
* start another workflow; this run can still start and clean up its children.
*/
var WorkerRun = class {
	ctx;
	subagents;
	id;
	meta;
	parent;
	provider;
	disposeGraceMs;
	observer;
	/** Settles exactly once with the run's outcome; never rejects. */
	result;
	settleResolve;
	settled = false;
	/** A Result/death/grace outcome atomically won before teardown callbacks. */
	terminalClaimed = false;
	/** The first death signal closes worker-message admission and owns failure-time cleanup. */
	workerDeathObserved = false;
	cancelReason;
	graceTimer;
	worker;
	/** Set on `exit`: the thread is gone, so posting has nowhere to go. */
	workerGone = false;
	/** Accepted `child-start` messages — the terminate-path `agentsStarted` (see module doc). */
	hostStarted = 0;
	/** Published children by callId; an entry leaves only after disposal settles. */
	children = /* @__PURE__ */ new Map();
	/** Provider starts that have not yet fulfilled or rejected. */
	pendingStarts = /* @__PURE__ */ new Set();
	/** Started-but-not-ended agents by seq — the pairing ledger the HOST guarantees (see {@link endAgent}). */
	liveAgents = /* @__PURE__ */ new Map();
	quiescenceWaiters = [];
	/** The per-run abort fanout every child start request carries. */
	controller = new AbortController();
	/** External start signal and the exact callback installed on it, retained only until first settle/teardown. */
	inputSignal;
	inputSignalAbort;
	disposed;
	constructor(ctx, subagents, id, meta, parent, init, provider, disposeGraceMs, observer, signal) {
		this.ctx = ctx;
		this.subagents = subagents;
		this.id = id;
		this.meta = meta;
		this.parent = parent;
		this.provider = provider;
		this.disposeGraceMs = disposeGraceMs;
		this.observer = observer;
		this.result = new Promise((resolve) => {
			this.settleResolve = resolve;
		});
		const { entry, options } = resolveWorkerSpawn(init);
		this.worker = new Worker(entry, options);
		this.worker.on("message", (message) => {
			this.onMessage(message);
		});
		this.worker.on("error", (error) => {
			this.onWorkerDeath(`workflow worker failed: ${renderThrown(error)}`, false);
		});
		/* v8 ignore next -- messageerror: not constructible from the engine's own protocol (every payload is JSON data) */
		this.worker.on("messageerror", (error) => {
			this.onWorkerDeath(`workflow worker message failed to deserialize: ${renderThrown(error)}`, false);
		});
		this.worker.on("exit", (code) => {
			this.workerGone = true;
			this.onWorkerDeath(`workflow worker exited before the run settled (exit code ${code})`, true);
		});
		if (signal?.aborted) this.cancel("workflow start signal already aborted");
		else if (signal !== void 0) {
			const onAbort = () => {
				this.detachInputSignal();
				this.cancel("workflow signal aborted");
			};
			this.inputSignal = signal;
			this.inputSignalAbort = onAbort;
			signal.addEventListener("abort", onAbort, { once: true });
		}
	}
	/**
	* Cancel the run: the worker is told (its hooks start throwing and the
	* script dies at its next await), the required signal shared by every child
	* start is aborted, and the grace timer
	* arms: a run still unsettled `disposeGraceMs` later force-settles
	* `cancelled` and its worker is TERMINATED. Idempotent; the first reason
	* wins.
	* @param reason - human-readable cause (default `'workflow cancelled'`).
	*/
	cancel(reason) {
		if (this.settled || this.terminalClaimed || this.cancelReason !== void 0) return;
		this.cancelReason = reason ?? "workflow cancelled";
		this.post(HostToWorkerType.Cancel, { reason: this.cancelReason });
		this.abortChildren(this.cancelReason);
		this.graceTimer = setTimeout(() => {
			this.terminalClaimed = true;
			this.endStrandedAgents();
			this.settleResult(this.cancelledResult(this.hostStarted));
			this.worker.terminate();
		}, this.disposeGraceMs);
		this.graceTimer.unref();
	}
	/**
	* Cancel + bounded settle + termination. Host-drives every registered
	* child's disposal IMMEDIATELY — a wedged worker can relay no dispose RPC,
	* and deferring child teardown to the post-terminate reap would spend the
	* whole grace waiting for a quiescence that cannot start, then return with
	* the disposals still in flight — so child disposal overlaps the same
	* grace the worker gets to settle (the worker's own dispose RPCs join the
	* shared per-child disposal). Waits (at most the grace) for the result and
	* child quiescence, then terminates the worker unconditionally — the
	* thread never outlives its run — and reaps whatever children remain
	* (their disposal is contained, not awaited past the grace, the same
	* abandonment the seam documents for a slow-disposing child). Idempotent;
	* safe on every path.
	* @returns resolves when the run's resources are released or abandoned.
	*/
	dispose() {
		if (this.disposed !== void 0) return this.disposed;
		const claimed = Promise.withResolvers();
		this.disposed = claimed.promise;
		(async () => {
			this.detachInputSignal();
			this.cancel("workflow disposed");
			this.reapChildren("workflow disposed");
			await Promise.race([(async () => {
				await this.result;
				await this.childQuiescence();
			})(), sleep(this.disposeGraceMs)]);
			await this.worker.terminate();
			this.reapChildren("workflow disposed");
		})().then(
			() => {
				claimed.resolve(void 0);
			},
			/* v8 ignore next -- result/quiescence never reject and Worker.terminate is the only external promise */
			(error) => {
				claimed.reject(error);
			}
		);
		return this.disposed;
	}
	/** Post one message to the worker (payload looked up from the tag's map entry), tolerating a thread that is already gone. */
	post(type, payload) {
		if (this.workerGone || this.workerDeathObserved) return;
		try {
			this.worker.postMessage({
				type,
				...payload
			});
		} catch (error) {
			/* v8 ignore next -- postMessage teardown race (a throw between exit and its event): not constructible in-process */
			this.ctx.logger.warn(`workflow-worker-thread: postMessage failed: ${renderThrown(error)}`);
		}
	}
	onMessage(message) {
		if (this.workerDeathObserved) return;
		switch (message.type) {
			case WorkerToHostType.Ready:
				this.post(HostToWorkerType.Go, {});
				break;
			case WorkerToHostType.Phase:
				if (this.cancelReason === void 0) this.observer.phase(message.title);
				break;
			case WorkerToHostType.Log:
				if (this.cancelReason === void 0) this.observer.log(message.message);
				break;
			case WorkerToHostType.AgentStart:
				this.liveAgents.set(message.info.seq, message.info);
				this.observer.agentStart(message.info);
				break;
			case WorkerToHostType.AgentEnd:
				this.endAgent(message.info);
				break;
			case WorkerToHostType.ChildStart:
				this.onChildStart(message.callId, message.request);
				break;
			case WorkerToHostType.ChildDispose:
				this.onChildDispose(message.callId);
				break;
			case WorkerToHostType.Result:
				this.onResult(message.result);
				break;
			/* v8 ignore next 2 -- closed engine-owned union; the arm only makes adding a message type a compile error */
			default: assertNever(message, "worker-to-host message");
		}
	}
	/** Why a ready provider result may no longer be admitted to the worker. */
	childAdmissionFailure() {
		if (this.cancelReason !== void 0) return {
			reason: this.cancelReason,
			rendered: `workflow run cancelled: ${this.cancelReason}`
		};
		if (this.workerDeathObserved) return {
			reason: "workflow worker gone",
			rendered: "workflow worker is no longer available"
		};
		if (this.terminalClaimed) return {
			reason: "workflow settled",
			rendered: "workflow run already settled"
		};
	}
	onChildStart(callId, request) {
		const initialFailure = this.childAdmissionFailure();
		if (initialFailure !== void 0) {
			this.post(HostToWorkerType.ChildStartError, {
				callId,
				rendered: initialFailure.rendered
			});
			return;
		}
		this.hostStarted += 1;
		const task = this.startChild(callId, request);
		this.pendingStarts.add(task);
		task.then(
			() => {
				this.finishPendingStart(task);
			},
			/* v8 ignore next -- startChild contains provider and cleanup failures */
			() => {
				this.finishPendingStart(task);
			}
		);
	}
	/** Await one provider-owned startup transaction and publish only while admitted. */
	async startChild(callId, request) {
		let run;
		try {
			run = await this.subagents.start(this.provider, {
				prompt: [{
					type: "text",
					text: request.prompt
				}],
				parent: this.parent,
				signal: this.controller.signal,
				...request.schema !== void 0 ? { outputSchema: request.schema } : {},
				...request.provider !== void 0 || request.model !== void 0 ? { agentOptions: {
					...request.provider !== void 0 ? { provider: request.provider } : {},
					...request.model !== void 0 ? { model: request.model } : {}
				} } : {}
			});
		} catch (error) {
			const failure = this.childAdmissionFailure();
			this.post(HostToWorkerType.ChildStartError, {
				callId,
				rendered: failure?.rendered ?? renderThrown(error)
			});
			return;
		}
		const failure = this.childAdmissionFailure();
		if (failure !== void 0) {
			this.post(HostToWorkerType.ChildStartError, {
				callId,
				rendered: failure.rendered
			});
			try {
				await run.dispose();
			} catch (error) {
				this.ctx.logger.warn(`workflow-worker-thread: refused child dispose failed: ${renderThrown(error)}`);
			}
			return;
		}
		const record = { run };
		this.children.set(callId, record);
		const forwardResult = run.result.then((result) => {
			try {
				const snapshot = snapshotJsonValue({
					output: result.output,
					...result.structured !== void 0 ? { structured: result.structured } : {},
					stopReason: result.stopReason
				});
				if (snapshot === void 0) throw new TypeError("child result is not losslessly JSON-serializable");
				return () => {
					this.post(HostToWorkerType.ChildSettled, {
						callId,
						result: snapshot
					});
				};
			} catch (error) {
				const rendered = `workflow child result could not cross the worker boundary: ${renderThrown(error)}`;
				return () => {
					this.post(HostToWorkerType.ChildFailed, {
						callId,
						rendered
					});
				};
			}
		}, (error) => {
			const rendered = renderThrown(error);
			return () => {
				this.post(HostToWorkerType.ChildFailed, {
					callId,
					rendered
				});
			};
		});
		this.post(HostToWorkerType.ChildStarted, {
			callId,
			childId: run.id
		});
		forwardResult.then((forward) => {
			forward();
		});
	}
	onChildDispose(callId) {
		const record = this.children.get(callId);
		if (record === void 0) {
			this.post(HostToWorkerType.ChildDisposed, { callId });
			return;
		}
		this.disposeChild(callId, record).then(() => {
			this.post(HostToWorkerType.ChildDisposed, { callId });
		});
	}
	/**
	* Start (or join) one registered child's disposal; the registry entry
	* leaves when it settles. Memoized per callId: the worker's dispose RPC,
	* the dispose() host drive, and the reap can all land on the same child —
	* the child's `dispose()` runs once and every caller awaits that one
	* settlement. A rejection is contained (the subagent seam's dispose() is
	* not supposed to reject, but a backend that does anyway must not break
	* quiescence): logged, and the child still leaves the registry.
	* @param callId - the child's registry key.
	* @param record - the registered child (the caller looked it up).
	* @returns resolves when the disposal settled either way; never rejects.
	*/
	disposeChild(callId, record) {
		if (record.disposal !== void 0) return record.disposal;
		record.disposal = Promise.resolve().then(() => record.run.dispose()).catch((error) => {
			this.ctx.logger.warn(`workflow-worker-thread: child dispose failed: ${renderThrown(error)}`);
		}).then(() => {
			this.finishChild(callId);
		});
		return record.disposal;
	}
	/** Drop a child record and release quiescence waiters when all work ends. */
	finishChild(callId) {
		this.children.delete(callId);
		this.notifyChildQuiescence();
	}
	/** Retire one provider startup transaction. */
	finishPendingStart(task) {
		this.pendingStarts.delete(task);
		this.notifyChildQuiescence();
	}
	/** Release waiters only after both pending starts and published children end. */
	notifyChildQuiescence() {
		if (this.children.size !== 0 || this.pendingStarts.size !== 0) return;
		for (const waiter of this.quiescenceWaiters.splice(0)) waiter();
	}
	/** Resolves once every pending start and published child has reached quiescence. */
	childQuiescence() {
		if (this.children.size === 0 && this.pendingStarts.size === 0) return Promise.resolve();
		return new Promise((resolve) => {
			this.quiescenceWaiters.push(resolve);
		});
	}
	/** Abort + dispose every registered child (worker death / final teardown); disposal is contained, not awaited. */
	reapChildren(reason) {
		this.abortChildren(this.cancelReason ?? reason);
		for (const [callId, record] of [...this.children]) this.disposeChild(callId, record);
	}
	/** Abort the one canonical signal shared by pending and published children. */
	abortChildren(reason) {
		if (!this.controller.signal.aborted) this.controller.abort(reason);
	}
	onResult(result) {
		if (this.terminalClaimed) return;
		const cancellationWasRequested = this.cancelReason !== void 0;
		this.terminalClaimed = true;
		this.reapChildren("workflow settled");
		if (!cancellationWasRequested) {
			this.settleResult(result);
			return;
		}
		if (result.stopReason !== "cancelled") {
			this.settleResult(this.cancelledResult(result.agentsStarted));
			return;
		}
		this.settleResult(result);
	}
	/** Process an error/messageerror/exit signal; `exit` also performs the final disposal sweep. */
	onWorkerDeath(message, isExit) {
		if (!this.workerDeathObserved) {
			this.workerDeathObserved = true;
			const outcomeWasClaimed = this.terminalClaimed;
			const cancellationWasRequested = this.cancelReason !== void 0;
			if (!outcomeWasClaimed) this.terminalClaimed = true;
			if (this.children.size > 0 || this.pendingStarts.size > 0) this.reapChildren("workflow worker gone");
			this.endStrandedAgents();
			if (!outcomeWasClaimed) if (cancellationWasRequested) this.settleResult(this.cancelledResult(this.hostStarted));
			else this.settleResult({
				value: null,
				stopReason: "error",
				error: message,
				agentsStarted: this.hostStarted
			});
		}
		if (!isExit) return;
		for (const [callId, record] of [...this.children]) this.disposeChild(callId, record);
		this.endStrandedAgents();
	}
	/**
	* The single agent-end emission gate: forwards `end` iff its start is still
	* unpaired in the ledger, so every forwarded `workflow/agent-start` gets
	* EXACTLY one `workflow/agent-end` — the worker's own report where it can
	* speak, a host-synthesized one where it cannot ({@link endStrandedAgents}).
	* @param end - the settlement to emit (worker-reported or synthesized).
	*/
	endAgent(end) {
		/* v8 ignore next -- a real end still in flight across the grace force-settle: not orderable in-process */
		if (!this.liveAgents.delete(end.seq)) return;
		this.observer.agentEnd(end);
	}
	/**
	* Synthesize the missing `agent-end` for every started-but-unpaired agent,
	* outcome `'cancelled'`: the reap cancels every child, and a real
	* settlement racing the force-settle loses to that already-started external
	* cancellation. The atomic terminal boundaries in {@link onResult} and
	* {@link onWorkerDeath} deliberately exclude teardown callbacks as contenders.
	* Called where the worker can no longer speak (the grace force-settle,
	* worker death, physical exit). When grace/death is the terminal source it
	* runs before settleResult, so already-known pairs precede `workflow/end`;
	* after an earlier Result, exit cleanup may close a survivor afterward.
	* The ledger preserves exactly-once pairing in both orders.
	*/
	endStrandedAgents() {
		for (const info of [...this.liveAgents.values()]) this.endAgent({
			...info,
			outcome: "cancelled"
		});
	}
	cancelledResult(agentsStarted) {
		return {
			value: null,
			stopReason: "cancelled",
			error: `workflow run cancelled: ${this.cancelReason ?? "workflow cancelled"}`,
			agentsStarted
		};
	}
	/** Remove the exact abort callback installed on the caller's start signal. */
	detachInputSignal() {
		const signal = this.inputSignal;
		const onAbort = this.inputSignalAbort;
		if (signal === void 0 || onAbort === void 0) return;
		this.inputSignal = void 0;
		this.inputSignalAbort = void 0;
		signal.removeEventListener("abort", onAbort);
	}
	/** First settle wins; disarms the grace timer and releases the caller signal. */
	settleResult(result) {
		/* v8 ignore next -- defensive fallback outside the claimed state machine */
		if (this.settled) return;
		this.terminalClaimed = true;
		this.settled = true;
		this.detachInputSignal();
		clearTimeout(this.graceTimer);
		this.settleResolve(result);
	}
};
/** A plain timer sleep (the dispose grace); unref'd so it never holds the process open. */
function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms).unref();
	});
}
//#endregion
//#region lib/types/meta.js
/**
* Meta validation checks caller-provided DATA against the {@link WorkflowMeta}
* contract and rejects every violation by name. Meta arrives as schema-checked
* JSON data, never evaluated script text; evaluating it on the host could run getters outside the
* worker timeout that exists to isolate model-written code.
* @module @deepseek-ai/dsh-workflow-worker-thread/meta
*/
/** Collect shape violations for a meta value (plain JSON data by the seam contract). */
function validateMetaShape(meta) {
	const violations = [];
	if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return { violations: ["meta must be an object"] };
	const record = meta;
	const known = new Set([
		"name",
		"description",
		"whenToUse",
		"phases"
	]);
	for (const key of Object.keys(record)) if (!known.has(key)) violations.push(`meta.${key} is not a recognized field (name/description/whenToUse/phases)`);
	if (typeof record.name !== "string" || record.name.length === 0) violations.push("meta.name must be a non-empty string");
	if (typeof record.description !== "string" || record.description.length === 0) violations.push("meta.description must be a non-empty string");
	if (record.whenToUse !== void 0 && typeof record.whenToUse !== "string") violations.push("meta.whenToUse must be a string");
	const phases = [];
	if (record.phases !== void 0) if (!Array.isArray(record.phases)) violations.push("meta.phases must be an array");
	else record.phases.forEach((phase, index) => {
		if (typeof phase !== "object" || phase === null || Array.isArray(phase)) {
			violations.push(`meta.phases[${index}] must be an object`);
			return;
		}
		const entry = phase;
		for (const key of Object.keys(entry)) if (![
			"title",
			"detail",
			"provider",
			"model"
		].includes(key)) violations.push(`meta.phases[${index}].${key} is not a recognized field`);
		if (typeof entry.title !== "string" || entry.title.length === 0) violations.push(`meta.phases[${index}].title must be a non-empty string`);
		if (entry.detail !== void 0 && typeof entry.detail !== "string") violations.push(`meta.phases[${index}].detail must be a string`);
		if (entry.provider !== void 0 && typeof entry.provider !== "string") violations.push(`meta.phases[${index}].provider must be a string`);
		if (entry.model !== void 0 && typeof entry.model !== "string") violations.push(`meta.phases[${index}].model must be a string`);
		if (violations.length === 0) phases.push({
			title: entry.title,
			...entry.detail !== void 0 ? { detail: entry.detail } : {},
			...entry.provider !== void 0 ? { provider: entry.provider } : {},
			...entry.model !== void 0 ? { model: entry.model } : {}
		});
	});
	if (violations.length > 0) return { violations };
	return {
		violations,
		meta: {
			name: record.name,
			description: record.description,
			...record.whenToUse !== void 0 ? { whenToUse: record.whenToUse } : {},
			...record.phases !== void 0 ? { phases } : {}
		}
	};
}
/**
* Validate a caller-provided meta value against the {@link WorkflowMeta}
* contract. Throws `META_INVALID` naming every violation (unknown fields,
* missing/mistyped `name`/`description`, malformed `phases`); the returned
* meta is a NORMALIZED copy built from the validated fields, so the engine
* never aliases the caller's object.
* @param value - the meta data from the start request (plain JSON by the seam contract).
* @returns the validated, normalized meta block.
*/
function validateMeta(value) {
	const { meta, violations } = validateMetaShape(value);
	if (meta === void 0) throw new WorkflowError(`invalid meta: ${violations.join("; ")}`, "META_INVALID");
	return meta;
}
//#endregion
//#region lib/types/index.js
/**
* Worker-thread workflow engine. Each run executes its model-written script in
* an escapable vm context on a fresh worker and bridges `agent()` calls to host
* subagents. The thread prevents synchronous script work from blocking the host
* and permits forced termination, but it is containment rather than a security boundary.
* @module @deepseek-ai/dsh-workflow-worker-thread
*/
/** A body that still carries the Claude Code-style meta header (meta rides the seam as data here). */
const META_STATEMENT = /^\s*export\s+const\s+meta\b/;
/**
* Parse-check the body with the SAME wrapper the worker-side runtime
* compiles, so `start()` keeps the seam's synchronous `SCRIPT_PARSE` throw
* (the worker's own compile happens a thread away, after `start()` returned).
* One redundant parse per run, bought deliberately for the contract. A body
* opening with `export const meta` gets a pointed message instead of the
* wrapper's bare SyntaxError — the model's likeliest authoring slip.
*/
function assertBodyParses(body, name) {
	if (META_STATEMENT.test(body)) throw new WorkflowError("workflow meta rides the `meta` request field, not the script: remove the `export const meta = {...}` statement from the body", "SCRIPT_PARSE");
	try {
		new vm.Script(`(async () => {\n${body}\n})()`, {
			filename: `workflow:${name}`,
			lineOffset: -1
		});
	} catch (error) {
		throw new WorkflowError(`workflow script does not parse: ${String(error)}`, "SCRIPT_PARSE", { cause: error });
	}
}
/** Resolve one run's provider route before publishing work. */
function resolveSubagentProvider(ctx, configured, override) {
	const provider = override ?? configured;
	if (provider.length === 0 || provider !== provider.trim()) throw new WorkflowError("workflow subagentProvider must be a non-empty normalized string", "INVALID_ARGUMENT");
	if (ctx.subagents.getProvider(provider) === void 0) throw new WorkflowError(`no subagent provider registered for "${provider}"`, "AGENT_START");
	return provider;
}
/** Resolve one run's total-child cap against the engine deployment ceiling. */
function resolveMaxTotalAgents(requested, ceiling) {
	if (requested === void 0) return ceiling;
	if (!Number.isSafeInteger(requested) || requested < 1) throw new WorkflowError("workflow maxTotalAgents must be a positive safe integer", "INVALID_ARGUMENT");
	if (requested > ceiling) throw new WorkflowError(`workflow maxTotalAgents ${requested} exceeds the engine ceiling ${ceiling}`, "INVALID_ARGUMENT");
	return requested;
}
/**
* The worker-thread engine service. `start()` validates the script up front
* (meta + a host-side body parse) and returns a {@link WorkflowRun} whose
* `result` never rejects; the `workflow/*` events fire around the run per
* the seam contract.
*/
var WorkerThreadWorkflowEngine = class extends WorkflowEngine {
	static inject = ["subagents"];
	static Config = z.object({
		provider: z.string().default("spawn"),
		maxConcurrentAgents: z.natural().default(0),
		maxTotalAgents: z.natural().min(1).default(1e3),
		maxItemsPerCall: z.natural().min(1).default(4096),
		syncTimeoutMs: z.natural().min(1).default(5e3),
		disposeGraceMs: z.natural().default(5e3)
	});
	config;
	constructor(ctx, config) {
		super(ctx);
		this.config = config;
	}
	/**
	* Validate and execute a workflow script in a fresh worker thread. Throws
	* {@link WorkflowError} synchronously (`META_INVALID` for a malformed meta
	* block, `SCRIPT_PARSE` for a body that does not compile) for a request
	* that cannot begin; once a run is returned, every failure resolves through
	* `result.stopReason` instead.
	* @param request - the script body, its meta data and `args`, the parent
	*   agent, and an optional cancel signal.
	* @returns the live run (its `result` resolves when the script settles).
	*/
	start(request) {
		const meta = validateMeta(request.meta);
		assertBodyParses(request.script, meta.name);
		const subagentProvider = resolveSubagentProvider(this.ctx, this.config.provider, request.subagentProvider);
		const maxTotalAgents = resolveMaxTotalAgents(request.maxTotalAgents, this.config.maxTotalAgents);
		const id = WorkflowRunId(randomUUID());
		const info = {
			id,
			meta
		};
		const limits = {
			maxConcurrentAgents: this.config.maxConcurrentAgents === 0 ? Math.min(16, Math.max(1, availableParallelism() - 2)) : this.config.maxConcurrentAgents,
			maxTotalAgents,
			maxItemsPerCall: this.config.maxItemsPerCall,
			syncTimeoutMs: this.config.syncTimeoutMs
		};
		const init = {
			meta,
			body: request.script,
			...request.args !== void 0 ? { args: request.args } : {},
			limits
		};
		const runCtx = this.ctx;
		const subagents = runCtx.subagents;
		const workerRun = new WorkerRun(runCtx, subagents, id, meta, request.parent, init, subagentProvider, this.config.disposeGraceMs, {
			phase: (title) => {
				this.emitWorkflowEvent("workflow/phase", info, title);
			},
			log: (message) => {
				this.emitWorkflowEvent("workflow/log", info, message);
			},
			agentStart: (agent) => {
				this.emitWorkflowEvent("workflow/agent-start", info, agent);
			},
			agentEnd: (agent) => {
				this.emitWorkflowEvent("workflow/agent-end", info, agent);
			}
		}, request.signal);
		this.emitWorkflowEvent("workflow/start", info);
		workerRun.result.then((settled) => {
			this.emitWorkflowEvent("workflow/end", info, {
				stopReason: settled.stopReason,
				...settled.error !== void 0 ? { error: settled.error } : {},
				agentsStarted: settled.agentsStarted
			});
		});
		return workerRun;
	}
};
//#endregion
export { MaterializeError, WorkerThreadWorkflowEngine as default, materializeFromRealm, validateMeta };

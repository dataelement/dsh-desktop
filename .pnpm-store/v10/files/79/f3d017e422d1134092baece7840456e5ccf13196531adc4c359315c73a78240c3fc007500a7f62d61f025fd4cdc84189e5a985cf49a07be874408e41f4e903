import z from "@deepseek-ai/schemastery";
import { AnonymousEntries, ScopedLayers, scopeOf } from "@deepseek-ai/dsh-scope";
import { deadline, timeoutOf } from "@deepseek-ai/dsh-timeout";
import { JobId, JobRegistry } from "@deepseek-ai/dsh-jobs";
//#region lib/types/index.js
/**
* Process-local provider for the background-job capability seam
* (`ctx.jobs`). It keeps every record in memory and hands out fresh
* snapshots, never live state.
*
* Registrations outlive producer and controller fibers. Agent or service
* disposal cancels live work and awaits compliant producers; a throwing
* teardown cancel force-fails only the record and reports a possible orphan.
* @module @deepseek-ai/dsh-jobs-local
*/
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
/** Timeout code that distinguishes a bounded wait from caller cancellation. */
const TASK_WAIT_TIMEOUT = "TASK_WAIT_TIMEOUT";
/** Default maximum number of active jobs in one exact-owner bucket. */
const DEFAULT_MAX_CONCURRENT_TASKS_PER_OWNER = 10;
/** True for the three terminal {@link JobStatus} values. */
function isTerminal(status) {
	return status === "completed" || status === "killed" || status === "failed";
}
/**
* One scope's contributions: the job controllers attached from it and the
* completion listeners registered there. Both tables are anonymous because a
* contribution is identified by its own disposer, never by a name a second
* registrant could shadow.
*/
var JobLayer = class {
	controllers = new AnonymousEntries();
	listeners = new AnonymousEntries();
	changed = new AnonymousEntries();
	isEmpty() {
		return this.controllers.isEmpty() && this.listeners.isEmpty() && this.changed.isEmpty();
	}
};
/**
* The in-memory `jobs` registry. See the Service Definition contract in
* `@deepseek-ai/dsh-jobs` for the ownership, isolation, and lifecycle
* semantics this implementation honors.
*/
var LocalJobRegistry = class extends JobRegistry {
	static Config = z.object({ maxConcurrentJobsPerOwner: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_CONCURRENT_TASKS_PER_OWNER) });
	/** Schemastery-defaulted active-job limit. */
	maxConcurrentJobsPerOwner;
	store = /* @__PURE__ */ new Map();
	counters = /* @__PURE__ */ new Map();
	/**
	* Surfaces and listeners layered by the scope that registered them, in the
	* tools-registry shape: a contribution files into its registering context's
	* scope, and a read unions the global layer with the reader's scope chain.
	*
	* The registry is one process-wide instance serving every composition, so a
	* flat table would answer a per-owner question process-wide: one preset's
	* job controls would hold `start()` open for an agent whose own composition
	* loads none, and one settlement would reach every preset's notice listener.
	* Layers make both reads owner-relative. Nothing derives a cache from a
	* layer, so change notification is a no-op.
	*/
	layers = new ScopedLayers(() => new JobLayer(), () => {});
	listenersClosed = false;
	/** Owner agents with attached scope cleanup, mapped to the exact disposer. */
	ownerCleanups = /* @__PURE__ */ new Map();
	/** Service context used by detached settlement continuations and teardown. */
	selfCtx;
	constructor(ctx, config) {
		super(ctx);
		this.maxConcurrentJobsPerOwner = config.maxConcurrentJobsPerOwner;
		this.selfCtx = ctx;
		ctx.effect(() => () => this.disposeAll(), "jobs teardown");
	}
	start(spec) {
		if (!this.servesOwner(spec.owner)) throw new Error("background jobs unavailable: no job controller serves this agent (load @deepseek-ai/dsh-tool-jobs in its composition)");
		if (spec.kind.length === 0) throw new Error("invalid job kind: expected a non-empty string");
		if (spec.label.length === 0) throw new Error("invalid job label: expected a non-empty string");
		if (spec.outputLimitBytes !== void 0 && (!Number.isSafeInteger(spec.outputLimitBytes) || spec.outputLimitBytes <= 0)) throw new Error(`invalid outputLimitBytes: expected a positive safe integer, got ${JSON.stringify(spec.outputLimitBytes)}`);
		if (spec.owner !== void 0) this.ensureOwnerCleanup(spec.owner);
		if (this.activeTaskCount(spec.owner) >= this.maxConcurrentJobsPerOwner) throw new Error(`background job limit reached for this owner (limit: ${this.maxConcurrentJobsPerOwner}); use job_kill to stop an unneeded job, wait for it to finish, then retry`);
		const hooks = spec.run();
		const count = (this.counters.get(spec.kind) ?? 0) + 1;
		this.counters.set(spec.kind, count);
		const id = JobId(`${spec.kind}-${count}`);
		let markSettled;
		const settled = new Promise((resolve) => {
			markSettled = resolve;
		});
		const job = {
			id,
			kind: spec.kind,
			label: spec.label,
			outputLimitBytes: spec.outputLimitBytes,
			owner: spec.owner,
			cancel: hooks.cancel.bind(hooks),
			readOutput: hooks.readOutput?.bind(hooks),
			status: "running",
			detail: void 0,
			output: void 0,
			startedAt: Date.now(),
			finishedAt: void 0,
			reported: false,
			settled,
			markSettled,
			waiters: 0,
			waitResolvers: /* @__PURE__ */ new Set()
		};
		this.store.set(id, job);
		hooks.done.then((outcome) => {
			this.settle(job, outcome);
		}, (error) => {
			this.selfCtx.logger.warn(`jobs: job ${job.id} producer done promise rejected (producer contract violation): ${String(error)}`);
			this.settle(job, {
				status: "failed",
				detail: String(error)
			});
		});
		this.notifyChanged(job.owner);
		return id;
	}
	list(caller) {
		const session = caller?.id;
		return [...this.store.values()].filter((job) => job.owner === void 0 || job.owner.id === session).map((job) => this.snapshot(job));
	}
	get(id, caller) {
		const job = this.expect(id);
		this.assertAccess(job, caller);
		return this.snapshot(job);
	}
	read(id, caller) {
		const job = this.expect(id);
		this.assertAccess(job, caller);
		const text = job.readOutput !== void 0 ? job.readOutput() : isTerminal(job.status) ? job.output ?? "" : "";
		if (isTerminal(job.status)) job.reported = true;
		return {
			text,
			snapshot: this.snapshot(job)
		};
	}
	kill(id, caller, reason) {
		const job = this.expect(id);
		this.assertAccess(job, caller);
		if (isTerminal(job.status)) {
			job.reported = true;
			return "already-finished";
		}
		job.cancel(reason);
		job.status = "stopping";
		job.reported = true;
		this.notifyChanged(job.owner);
		return "requested";
	}
	async wait(id, timeoutMs, caller, signal) {
		const job = this.expect(id);
		this.assertAccess(job, caller);
		if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error(`invalid wait timeout: expected a positive number of milliseconds, got ${JSON.stringify(timeoutMs)}`);
		if (!isTerminal(job.status)) {
			if (signal?.aborted) throw new Error("wait aborted");
			job.waiters += 1;
			let counted = true;
			const uncount = () => {
				if (!counted) return;
				counted = false;
				job.waiters -= 1;
			};
			try {
				const env_1 = {
					stack: [],
					error: void 0,
					hasError: false
				};
				try {
					const d = __addDisposableResource(env_1, deadline(signal, timeoutMs, TASK_WAIT_TIMEOUT), false);
					await new Promise((resolve, reject) => {
						const onSettled = () => {
							job.waitResolvers.delete(onSettled);
							d.signal.removeEventListener("abort", onAbort);
							resolve();
						};
						const onAbort = () => {
							job.waitResolvers.delete(onSettled);
							if (timeoutOf(d.signal, "TASK_WAIT_TIMEOUT") !== void 0) resolve();
							else {
								uncount();
								reject(/* @__PURE__ */ new Error("wait aborted"));
							}
						};
						job.waitResolvers.add(onSettled);
						d.signal.addEventListener("abort", onAbort, { once: true });
					});
				} catch (e_1) {
					env_1.error = e_1;
					env_1.hasError = true;
				} finally {
					__disposeResources(env_1);
				}
			} finally {
				uncount();
			}
		}
		if (isTerminal(job.status)) job.reported = true;
		return this.snapshot(job);
	}
	onJobDone(listener) {
		return this.layers.effect(this.ctx, (layer) => layer.listeners.append(listener), { label: "jobs.onJobDone()" });
	}
	onJobsChanged(listener) {
		return this.layers.effect(this.ctx, (layer) => layer.changed.append(listener), { label: "jobs.onJobsChanged()" });
	}
	attachController(name) {
		const token = Symbol(name);
		return this.layers.effect(this.ctx, (layer) => layer.controllers.append(token), { label: "jobs.attachController()" });
	}
	/**
	* Whether an attached job controller can collect and stop work owned by
	* `owner`. The global layer holds every controller attached from an unscoped
	* context — a host composition's own controls — and therefore serves every
	* owner; a scoped controller serves exactly the agents composed under it.
	* @param owner - the job's owner, or undefined for unowned work.
	* @returns whether some reachable controller serves the owner.
	*/
	servesOwner(owner) {
		if (!this.layers.global.controllers.isEmpty()) return true;
		return this.layers.chainLayers(owner === void 0 ? void 0 : scopeOf(owner.ctx)).some((layer) => !layer.controllers.isEmpty());
	}
	/** Count authoritative active records for one exact owner or the shared unowned bucket. */
	activeTaskCount(owner) {
		let count = 0;
		for (const job of this.store.values()) if (job.owner === owner && (job.status === "running" || job.status === "stopping")) count += 1;
		return count;
	}
	/**
	* The completion listeners that own `owner`'s notices: the global layer's
	* first, then each scoped layer along the owner's chain. A listener outside
	* that chain belongs to another composition and must not deliver, or the
	* owner reads one notice per mounted preset.
	* @param owner - the settled job's owner, or undefined for unowned work.
	* @returns the listeners to notify, in registration order per layer.
	*/
	*listenersFor(owner) {
		yield* this.layers.global.listeners.values();
		const scope = owner === void 0 ? void 0 : scopeOf(owner.ctx);
		for (const layer of this.layers.chainLayers(scope)) yield* layer.listeners.values();
	}
	/** Look up a job or fail loud. */
	expect(id) {
		const job = this.store.get(id);
		if (job === void 0) throw new Error(`unknown job ${id}`);
		return job;
	}
	/**
	* The isolation fence: a job with an owner is reachable only by callers
	* whose session id matches (`!== undefined` semantics — an unowned job is
	* open, and a no-agent caller can never match an owned one).
	*/
	assertAccess(job, caller) {
		if (job.owner !== void 0 && job.owner.id !== caller?.id) throw new Error(`job ${job.id} belongs to another session`);
	}
	/** Project a fresh read-only snapshot from the mutable record. */
	snapshot(job) {
		const ownerSession = job.owner?.id;
		return {
			id: job.id,
			kind: job.kind,
			label: job.label,
			...job.outputLimitBytes !== void 0 ? { outputLimitBytes: job.outputLimitBytes } : {},
			...ownerSession !== void 0 ? { ownerSession } : {},
			status: job.status,
			...job.detail !== void 0 ? { detail: job.detail } : {},
			startedAt: job.startedAt,
			...job.finishedAt !== void 0 ? { finishedAt: job.finishedAt } : {},
			reported: job.reported
		};
	}
	/**
	* The change observers that own `owner`'s updates, resolved exactly like
	* {@link listenersFor}: the global layer — a host composition's own carrier,
	* which serves every owner — then each scoped layer along the owner's chain.
	* An observer outside that chain belongs to another composition and would
	* otherwise be told about agents it does not compose.
	* @param owner - the owner whose visible set moved, or undefined for unowned work.
	* @returns the observers to notify, in registration order per layer.
	*/
	*changedFor(owner) {
		yield* this.layers.global.changed.values();
		const scope = owner === void 0 ? void 0 : scopeOf(owner.ctx);
		for (const layer of this.layers.chainLayers(scope)) yield* layer.changed.values();
	}
	/**
	* Announce that one owner's visible set changed. Each listener is contained
	* so an observer cannot break a lifecycle commit that already happened.
	*/
	notifyChanged(owner) {
		for (const listener of this.changedFor(owner)) try {
			listener(owner);
		} catch (error) {
			this.selfCtx.logger.warn(`jobs: onJobsChanged listener threw: ${String(error)}`);
		}
	}
	/**
	* Record the first terminal outcome, release waiters, then announce
	* completion. First-wins preserves a teardown force-failure against late
	* producer settlement. Pending waits mark the job reported before listeners
	* run. Completion is announced last because a reporter may open a model turn
	* synchronously: every other observer of this settlement must already have
	* seen the committed record.
	*/
	settle(job, outcome) {
		if (isTerminal(job.status)) return;
		job.status = outcome.status;
		job.detail = outcome.detail;
		job.output = outcome.output;
		job.finishedAt = Date.now();
		if (job.waiters > 0) job.reported = true;
		const snapshot = this.snapshot(job);
		const waitResolvers = [...job.waitResolvers];
		job.waitResolvers.clear();
		for (const resolveWait of waitResolvers) resolveWait();
		job.markSettled();
		this.notifyChanged(job.owner);
		if (this.listenersClosed) return;
		for (const listener of this.listenersFor(job.owner)) try {
			const returned = listener(snapshot, job.owner);
			Promise.resolve(returned).catch((error) => {
				this.selfCtx.logger.warn(`jobs: onJobDone listener rejected for ${job.id}: ${String(error)}`);
			});
		} catch (error) {
			this.selfCtx.logger.warn(`jobs: onJobDone listener threw for ${job.id}: ${String(error)}`);
		}
	}
	/**
	* Attach one awaited cleanup through the exact owner's scope. This survives
	* producer reloads and joins agent quiescence; the retained disposer lets
	* service teardown detach the cross-fiber effect. Fails when the registry is
	* absent or the owner is not its currently registered instance.
	*/
	ensureOwnerCleanup(owner) {
		const ownerId = owner.id;
		const agents = this.selfCtx.get("agents");
		if (agents === void 0) throw new Error("background job ownership requires the agent registry (load @deepseek-ai/dsh-agent)");
		if (agents.get(ownerId) !== owner) throw new Error(`agent "${ownerId}" is not the registered agent instance (background job owner must be live)`);
		if (this.ownerCleanups.has(owner)) return;
		const detach = owner.ctx.effect(() => async () => {
			this.ownerCleanups.delete(owner);
			await this.disposeOwned(owner);
		}, "jobs.ownerCleanup()");
		this.ownerCleanups.set(owner, detach);
	}
	/** Cancel, await terminal records, and drop every job owned by one exact agent lifecycle. */
	async disposeOwned(owner) {
		const owned = [...this.store.values()].filter((job) => job.owner === owner);
		this.cancelForTeardown(owned, "owner disposed");
		await Promise.all(owned.map((job) => job.settled));
		for (const job of owned) this.store.delete(job.id);
		if (owned.length > 0) this.notifyChanged(owner);
	}
	/**
	* Close listeners, cancel live jobs, await settlement, and detach owner
	* effects. Throwing cancels are force-failed to avoid teardown deadlock.
	*/
	async disposeAll() {
		this.listenersClosed = true;
		const all = [...this.store.values()];
		this.cancelForTeardown(all, "jobs service disposed");
		await Promise.all(all.map((job) => job.settled));
		const emptied = new Set(all.map((job) => job.owner));
		this.store.clear();
		for (const owner of emptied) this.notifyChanged(owner);
		const ownerCleanups = [...this.ownerCleanups.values()];
		this.ownerCleanups.clear();
		await Promise.all(ownerCleanups.map((cleanup) => Promise.resolve(cleanup())));
	}
	/**
	* Cancel jobs during teardown with per-job containment. A throwing cancel
	* force-fails the record and reports a possible orphan; a cancel that returns
	* without settling remains indistinguishable from a slow stop and may stall.
	*/
	cancelForTeardown(jobs, reason) {
		for (const job of jobs) {
			if (isTerminal(job.status)) continue;
			job.reported = true;
			try {
				job.cancel(reason);
				job.status = "stopping";
				this.notifyChanged(job.owner);
			} catch (error) {
				const detail = `cancel threw during teardown; work may be orphaned: ${String(error)}`;
				this.selfCtx.logger.warn(`jobs: cancel of ${job.id} threw during teardown; job record forced failed and work may be orphaned: ${String(error)}`);
				this.settle(job, {
					status: "failed",
					detail
				});
			}
		}
	}
};
//#endregion
export { LocalJobRegistry, LocalJobRegistry as default, TASK_WAIT_TIMEOUT };

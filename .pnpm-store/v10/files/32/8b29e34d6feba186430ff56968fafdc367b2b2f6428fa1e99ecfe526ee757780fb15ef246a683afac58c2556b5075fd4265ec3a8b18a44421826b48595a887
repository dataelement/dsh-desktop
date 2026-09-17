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
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { JobRegistry, JobId } from '@deepseek-ai/dsh-jobs';
import type { JobDoneListener, JobRead, JobSnapshot, JobStart, JobsChangedListener } from '@deepseek-ai/dsh-jobs';
/** Timeout code that distinguishes a bounded wait from caller cancellation. */
export declare const TASK_WAIT_TIMEOUT = "TASK_WAIT_TIMEOUT";
/** Configuration for the process-local job registry. */
export interface Config {
    /**
     * Maximum `running` plus `stopping` jobs per exact owner or in the shared unowned bucket;
     * omission defaults to 10.
     */
    maxConcurrentJobsPerOwner?: number;
}
/**
 * The in-memory `jobs` registry. See the Service Definition contract in
 * `@deepseek-ai/dsh-jobs` for the ownership, isolation, and lifecycle
 * semantics this implementation honors.
 */
export declare class LocalJobRegistry extends JobRegistry {
    static Config: z<Config>;
    /** Schemastery-defaulted active-job limit. */
    private readonly maxConcurrentJobsPerOwner;
    private store;
    private counters;
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
    private readonly layers;
    private listenersClosed;
    /** Owner agents with attached scope cleanup, mapped to the exact disposer. */
    private ownerCleanups;
    /** Service context used by detached settlement continuations and teardown. */
    private readonly selfCtx;
    constructor(ctx: Context, config: Config);
    start(spec: JobStart): JobId;
    list(caller?: Agent): JobSnapshot[];
    get(id: JobId, caller?: Agent): JobSnapshot;
    read(id: JobId, caller?: Agent): JobRead;
    kill(id: JobId, caller?: Agent, reason?: string): 'requested' | 'already-finished';
    wait(id: JobId, timeoutMs: number, caller?: Agent, signal?: AbortSignal): Promise<JobSnapshot>;
    onJobDone(listener: JobDoneListener): () => void;
    onJobsChanged(listener: JobsChangedListener): () => void;
    attachController(name: string): () => void;
    /**
     * Whether an attached job controller can collect and stop work owned by
     * `owner`. The global layer holds every controller attached from an unscoped
     * context — a host composition's own controls — and therefore serves every
     * owner; a scoped controller serves exactly the agents composed under it.
     * @param owner - the job's owner, or undefined for unowned work.
     * @returns whether some reachable controller serves the owner.
     */
    private servesOwner;
    /** Count authoritative active records for one exact owner or the shared unowned bucket. */
    private activeTaskCount;
    /**
     * The completion listeners that own `owner`'s notices: the global layer's
     * first, then each scoped layer along the owner's chain. A listener outside
     * that chain belongs to another composition and must not deliver, or the
     * owner reads one notice per mounted preset.
     * @param owner - the settled job's owner, or undefined for unowned work.
     * @returns the listeners to notify, in registration order per layer.
     */
    private listenersFor;
    /** Look up a job or fail loud. */
    private expect;
    /**
     * The isolation fence: a job with an owner is reachable only by callers
     * whose session id matches (`!== undefined` semantics — an unowned job is
     * open, and a no-agent caller can never match an owned one).
     */
    private assertAccess;
    /** Project a fresh read-only snapshot from the mutable record. */
    private snapshot;
    /**
     * The change observers that own `owner`'s updates, resolved exactly like
     * {@link listenersFor}: the global layer — a host composition's own carrier,
     * which serves every owner — then each scoped layer along the owner's chain.
     * An observer outside that chain belongs to another composition and would
     * otherwise be told about agents it does not compose.
     * @param owner - the owner whose visible set moved, or undefined for unowned work.
     * @returns the observers to notify, in registration order per layer.
     */
    private changedFor;
    /**
     * Announce that one owner's visible set changed. Each listener is contained
     * so an observer cannot break a lifecycle commit that already happened.
     */
    private notifyChanged;
    /**
     * Record the first terminal outcome, release waiters, then announce
     * completion. First-wins preserves a teardown force-failure against late
     * producer settlement. Pending waits mark the job reported before listeners
     * run. Completion is announced last because a reporter may open a model turn
     * synchronously: every other observer of this settlement must already have
     * seen the committed record.
     */
    private settle;
    /**
     * Attach one awaited cleanup through the exact owner's scope. This survives
     * producer reloads and joins agent quiescence; the retained disposer lets
     * service teardown detach the cross-fiber effect. Fails when the registry is
     * absent or the owner is not its currently registered instance.
     */
    private ensureOwnerCleanup;
    /** Cancel, await terminal records, and drop every job owned by one exact agent lifecycle. */
    private disposeOwned;
    /**
     * Close listeners, cancel live jobs, await settlement, and detach owner
     * effects. Throwing cancels are force-failed to avoid teardown deadlock.
     */
    private disposeAll;
    /**
     * Cancel jobs during teardown with per-job containment. A throwing cancel
     * force-fails the record and reports a possible orphan; a cancel that returns
     * without settling remains indistinguishable from a slow stop and may stall.
     */
    private cancelForTeardown;
}
export default LocalJobRegistry;
//# sourceMappingURL=index.d.ts.map
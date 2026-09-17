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
import type { WorkflowAgentEndInfo, WorkflowAgentInfo, WorkflowMeta, WorkflowResult } from '@deepseek-ai/dsh-workflow';
import type { ChildPort, WorkerLimits } from './types.ts';
/** The observers the execution reports progress through (the session posts them to the host). */
export interface ExecutionObserver {
    phase(title: string): void;
    log(message: string): void;
    agentStart(info: WorkflowAgentInfo): void;
    agentEnd(info: WorkflowAgentEndInfo): void;
}
/**
 * One live script execution inside the worker. Constructed per run by the
 * session; `drive()` is called exactly once and NEVER rejects — every failure
 * becomes a {@link WorkflowResult} with a non-`completed` stop reason. The
 * host owns cancellation and cleanup of any dropped child work.
 */
export declare class WorkflowExecution {
    private readonly limits;
    private readonly observer;
    private readonly children;
    /** 1-based count of `agent()` calls started (the `agentsStarted` result field). */
    private started;
    private activeSlots;
    private readonly slotWaiters;
    private cancelReason;
    private cancelError;
    private currentPhase;
    private readonly context;
    private readonly compiled;
    constructor(meta: WorkflowMeta, body: string, args: unknown, limits: WorkerLimits, observer: ExecutionObserver, children: ChildPort);
    /**
     * Whether the run has been cancelled. A METHOD, not an inline property
     * read: `cancel()` mutates `cancelReason` concurrently (the session's
     * message handler), and an inline read after an `await` gets narrowed by
     * control flow into an always-false comparison.
     */
    private isCancelled;
    /**
     * Shared hook entry guard: after {@link cancel}, EVERY hook throws
     * `CANCELLED` at its next call — cancellation is the next HOOK boundary,
     * not just the next `agent()`, so a script that caught one cancelled
     * rejection cannot keep emitting progress through `phase`/`log` or enter a
     * combinator.
     */
    private throwIfCancelled;
    /**
     * Cancel the run: waiting `agent()` slots reject and every future hook call
     * throws `CANCELLED` — the script dies at its next await. A script that
     * never settles anyway (parked on a promise no hook owns) is the HOST's
     * problem: its grace timer force-settles the run and terminates the
     * worker. Idempotent; the first reason wins.
     * @param reason - human-readable cause carried on the CANCELLED error. The
     * host independently aborts the required signal shared by every child.
     */
    cancel(reason: string): void;
    /**
     * Run the script to settlement. Resolves — never rejects — with the run's
     * {@link WorkflowResult}: the materialized return value on `completed`, the
     * failure message on `error`, and `cancelled` when the script died of
     * cancellation. This method only chooses the result; the session publishes
     * it and the host owns terminal child cancellation.
     * @returns the settled outcome — this promise NEVER rejects (the seam's
     * `result`-never-rejects contract); every failure maps to a variant.
     */
    drive(): Promise<WorkflowResult>;
    /**
     * Attach a no-op rejection consumer WITHOUT changing what the caller
     * receives: if the script drops the promise (no await), cancellation cannot
     * become an unhandled rejection (which would kill the worker thread); if
     * the script does await it, it still observes the rejection.
     */
    private contain;
    private cancelledError;
    /** Materialize the script's return value; violations become RESULT_UNSERIALIZABLE. */
    private materializeResult;
    /**
     * Acquire one concurrency slot (FIFO). Cancellation rejects QUEUED waiters
     * (see {@link cancel}); the callers guard their own entry and post-acquire
     * windows, so no cancelled-precheck is duplicated here.
     */
    private acquireSlot;
    private releaseSlot;
    /** The `agent(prompt, opts)` hook. */
    private agent;
    /** Materialize + validate the `agent()` options bag from the realm. */
    private readAgentOptions;
    /** The `parallel(thunks)` hook: each thunk caught → `null`; fatal errors propagate. */
    private parallel;
    /** The `pipeline(items, ...stages)` hook: per-item stage chains, NO cross-stage barrier. */
    private pipeline;
    private assertItemCap;
    /** The `phase(title)` hook: sets the current label for subsequent `agent()` calls and notifies observers. */
    private phase;
    /** The `log(message)` hook: narration to observers. */
    private log;
}
//# sourceMappingURL=runtime.d.ts.map
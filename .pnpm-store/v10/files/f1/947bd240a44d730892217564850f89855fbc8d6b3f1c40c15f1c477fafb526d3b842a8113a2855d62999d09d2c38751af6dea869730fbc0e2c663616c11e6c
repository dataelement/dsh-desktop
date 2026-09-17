/**
 * Host side of one workflow run. The first worker result, unexpected death, or
 * cancellation-grace expiry owns settlement and closes message admission.
 * Pending starts share one abort signal; published children share idempotent
 * cleanup, and quiescence waits for both while synthesizing any missing end events.
 * @module @deepseek-ai/dsh-workflow-worker-thread/host
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type SubagentRuntime from '@deepseek-ai/dsh-subagent';
import type { WorkflowMeta, WorkflowResult, WorkflowRun, WorkflowRunId } from '@deepseek-ai/dsh-workflow';
import type { ExecutionObserver } from './runtime.ts';
import type { WorkerInit } from './types.ts';
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
export declare function workerSpawnEnv(platform?: NodeJS.Platform, tsconfigPath?: string): NodeJS.ProcessEnv;
/**
 * One live worker-engine run — the seam's {@link WorkflowRun}, returned by
 * `start()` directly. Owns the Worker, the child registry, and the result
 * settlement; `result` never rejects. `meta` is trusted same-process data
 * borrowed as immutable by the handle and lifecycle events. The holder-bound
 * SubagentRuntime handle is captured before the
 * engine returns this run, so unloading the engine removes only the ability to
 * start another workflow; this run can still start and clean up its children.
 */
export declare class WorkerRun implements WorkflowRun {
    private readonly ctx;
    private readonly subagents;
    readonly id: WorkflowRunId;
    readonly meta: WorkflowMeta;
    private readonly parent;
    private readonly provider;
    private readonly disposeGraceMs;
    private readonly observer;
    /** Settles exactly once with the run's outcome; never rejects. */
    readonly result: Promise<WorkflowResult>;
    private settleResolve;
    private settled;
    /** A Result/death/grace outcome atomically won before teardown callbacks. */
    private terminalClaimed;
    /** The first death signal closes worker-message admission and owns failure-time cleanup. */
    private workerDeathObserved;
    private cancelReason;
    private graceTimer;
    private readonly worker;
    /** Set on `exit`: the thread is gone, so posting has nowhere to go. */
    private workerGone;
    /** Accepted `child-start` messages — the terminate-path `agentsStarted` (see module doc). */
    private hostStarted;
    /** Published children by callId; an entry leaves only after disposal settles. */
    private readonly children;
    /** Provider starts that have not yet fulfilled or rejected. */
    private readonly pendingStarts;
    /** Started-but-not-ended agents by seq — the pairing ledger the HOST guarantees (see {@link endAgent}). */
    private readonly liveAgents;
    private readonly quiescenceWaiters;
    /** The per-run abort fanout every child start request carries. */
    private readonly controller;
    /** External start signal and the exact callback installed on it, retained only until first settle/teardown. */
    private inputSignal;
    private inputSignalAbort;
    private disposed;
    constructor(ctx: Context, subagents: SubagentRuntime, id: WorkflowRunId, meta: WorkflowMeta, parent: Agent, init: WorkerInit, provider: string, disposeGraceMs: number, observer: ExecutionObserver, signal: AbortSignal | undefined);
    /**
     * Cancel the run: the worker is told (its hooks start throwing and the
     * script dies at its next await), the required signal shared by every child
     * start is aborted, and the grace timer
     * arms: a run still unsettled `disposeGraceMs` later force-settles
     * `cancelled` and its worker is TERMINATED. Idempotent; the first reason
     * wins.
     * @param reason - human-readable cause (default `'workflow cancelled'`).
     */
    cancel(reason?: string): void;
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
    dispose(): Promise<void>;
    /** Post one message to the worker (payload looked up from the tag's map entry), tolerating a thread that is already gone. */
    private post;
    private onMessage;
    /** Why a ready provider result may no longer be admitted to the worker. */
    private childAdmissionFailure;
    private onChildStart;
    /** Await one provider-owned startup transaction and publish only while admitted. */
    private startChild;
    private onChildDispose;
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
    private disposeChild;
    /** Drop a child record and release quiescence waiters when all work ends. */
    private finishChild;
    /** Retire one provider startup transaction. */
    private finishPendingStart;
    /** Release waiters only after both pending starts and published children end. */
    private notifyChildQuiescence;
    /** Resolves once every pending start and published child has reached quiescence. */
    private childQuiescence;
    /** Abort + dispose every registered child (worker death / final teardown); disposal is contained, not awaited. */
    private reapChildren;
    /** Abort the one canonical signal shared by pending and published children. */
    private abortChildren;
    private onResult;
    /** Process an error/messageerror/exit signal; `exit` also performs the final disposal sweep. */
    private onWorkerDeath;
    /**
     * The single agent-end emission gate: forwards `end` iff its start is still
     * unpaired in the ledger, so every forwarded `workflow/agent-start` gets
     * EXACTLY one `workflow/agent-end` — the worker's own report where it can
     * speak, a host-synthesized one where it cannot ({@link endStrandedAgents}).
     * @param end - the settlement to emit (worker-reported or synthesized).
     */
    private endAgent;
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
    private endStrandedAgents;
    private cancelledResult;
    /** Remove the exact abort callback installed on the caller's start signal. */
    private detachInputSignal;
    /** First settle wins; disarms the grace timer and releases the caller signal. */
    private settleResult;
}
//# sourceMappingURL=host.d.ts.map
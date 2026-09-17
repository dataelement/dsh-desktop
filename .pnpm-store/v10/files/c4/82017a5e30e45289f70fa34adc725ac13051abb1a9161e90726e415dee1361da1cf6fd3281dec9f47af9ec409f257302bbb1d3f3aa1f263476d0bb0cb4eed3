/**
 * Worker-thread workflow engine. Each run executes its model-written script in
 * an escapable vm context on a fresh worker and bridges `agent()` calls to host
 * subagents. The thread prevents synchronous script work from blocking the host
 * and permits forced termination, but it is containment rather than a security boundary.
 * @module @deepseek-ai/dsh-workflow-worker-thread
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import WorkflowEngine from '@deepseek-ai/dsh-workflow';
import type { WorkflowRun, WorkflowStartRequest } from '@deepseek-ai/dsh-workflow';
export { validateMeta } from './meta.ts';
export { materializeFromRealm, MaterializeError } from './realm.ts';
export type { ChildHandle, ChildPort, ChildResult, ChildStartRequest, WorkerInit, WorkerLimits, } from './types.ts';
/** Plugin config (all optional — `static Config` supplies the defaults). */
export interface Config {
    /** The `ctx.subagents` provider children run on (default `spawn`). */
    provider?: string;
    /** Concurrent `agent()` ceiling; `0` (the default) auto-resolves to `min(16, max(1, cores - 2))`. */
    maxConcurrentAgents?: number;
    /** Total `agent()` calls one run may start — the runaway-loop backstop (default 1000). */
    maxTotalAgents?: number;
    /** Items accepted by a single `parallel()`/`pipeline()` call (default 4096). */
    maxItemsPerCall?: number;
    /** vm timeout for the script's initial synchronous slice, inside the worker (default 5000 ms). */
    syncTimeoutMs?: number;
    /**
     * How long after a cancellation an unsettled script may keep running before
     * the run force-settles `cancelled` and its worker is TERMINATED (default
     * 5000 ms); also bounds `dispose()`.
     */
    disposeGraceMs?: number;
}
/**
 * The worker-thread engine service. `start()` validates the script up front
 * (meta + a host-side body parse) and returns a {@link WorkflowRun} whose
 * `result` never rejects; the `workflow/*` events fire around the run per
 * the seam contract.
 */
declare class WorkerThreadWorkflowEngine extends WorkflowEngine {
    static inject: string[];
    static Config: z<Config>;
    private readonly config;
    constructor(ctx: Context, config: Config);
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
    start(request: WorkflowStartRequest): WorkflowRun;
}
export default WorkerThreadWorkflowEngine;
//# sourceMappingURL=index.d.ts.map
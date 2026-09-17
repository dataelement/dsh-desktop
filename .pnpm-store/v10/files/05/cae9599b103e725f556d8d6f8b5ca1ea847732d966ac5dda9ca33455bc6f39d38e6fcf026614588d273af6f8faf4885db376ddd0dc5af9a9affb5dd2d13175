/**
 * Worker-thread code runtime: a fresh worker runs each host-type-stripped TypeScript program
 * and bridges bindings over its message port. This is containment, not a security boundary:
 * model code has bash-equivalent trust despite an empty environment, a heap cap, measured
 * event-loop busy-time and wall-time budgets, and termination that also stops synchronous loops.
 * @module @deepseek-ai/dsh-code-runtime-worker-thread
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { CodeRuntime } from '@deepseek-ai/dsh-code-runtime';
import type { CodeRunRequest, CodeRunResult } from '@deepseek-ai/dsh-code-runtime';
/** Plugin config: every execution cap, changeable from `cordis.yml` (no hardcoded tunables). */
export interface Config {
    /**
     * Busy-time budget in milliseconds: the run fails with kind `'timeout'`
     * once the worker's MEASURED event-loop active time
     * (`worker.performance.eventLoopUtilization()`) exceeds this. Metering
     * measured busy time — not wall time, not host-side pending-call
     * bookkeeping — is what makes the budget both fair (a program awaiting a
     * slow tool accrues nothing) and ungameable (a hot loop accrues whether
     * or not a decoy dispatch is in flight).
     */
    computeMs?: number;
    /**
     * Wall-clock ceiling in milliseconds; never pauses for anything. The
     * backstop for what busy-time cannot see (a program awaiting a promise
     * nobody will resolve). At most `2_147_483_647` (Node's maximum
     * `setTimeout` delay, about 24.9 days): a longer value is rejected at load
     * because `setTimeout` would clamp it to 1 ms.
     */
    maxWallMs?: number;
    /**
     * Hard cap for serialized log-array, completion-value, and failure-message payloads;
     * fixed result-envelope syntax is excluded.
     */
    maxOutputBytes?: number;
    /** The worker's max old-generation heap in MiB (`resourceLimits`); overflow kills the worker, surfacing as kind `'worker-exit'`. */
    maxOldGenerationSizeMb?: number;
}
/**
 * The shipped {@link CodeRuntime} backend (`ctx.codeRuntime`). Registers as
 * the `codeRuntime` service; every cap comes from validated config. See the
 * module doc for the containment model and the Service Definition's class JSDoc for
 * the contract this implements (error-as-field, hostile-peer port,
 * no cross-run state, dispose to quiescence).
 */
export declare class WorkerThreadCodeRuntime extends CodeRuntime {
    static Config: z<Config>;
    readonly language = "typescript";
    readonly isolation = "worker-thread";
    private readonly config;
    private readonly live;
    private disposed;
    constructor(ctx: Context, config: Config);
    /**
     * Dispose to quiescence: mark the service unusable, fail every in-flight
     * run as aborted, and AWAIT each worker's exit so no worker outlives the
     * fiber.
     */
    private teardown;
    /**
     * Execute one program in a fresh worker. Program outcomes — including a
     * type-strip syntax error, which never spawns a worker — resolve with
     * `result.error`; the method rejects only for Service Definition contract misuse (a disposed
     * runtime, an invalid binding namespace).
     * @param request - the program, its bindings, and the abort signal.
     * @returns the run's outcome per the seam contract.
     */
    run(request: CodeRunRequest): Promise<CodeRunResult>;
    /** Apply the outer-output ledger to failures that occur before a worker owns one. */
    private failureBeforeWorker;
    /** Reject malformed binding globals or typed-error declarations as Service Definition contract misuse. */
    private validateBindings;
    /** Spawn the worker for one validated, type-stripped run and drive it to settlement. */
    private execute;
}
export default WorkerThreadCodeRuntime;
//# sourceMappingURL=index.d.ts.map
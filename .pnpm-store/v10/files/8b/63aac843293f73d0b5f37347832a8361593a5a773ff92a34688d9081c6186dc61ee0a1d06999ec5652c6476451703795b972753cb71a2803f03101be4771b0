/**
 * Disposable live timer projection for one exact root agent.
 * @module @deepseek-ai/dsh-schedule
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/** Largest delay that Node timers represent without clamping. */
export declare const MAX_TIMER_DELAY_MS = 2147483647;
/** One process-local, disposable projection of an exact agent's durable schedules. */
export declare class ScheduleRuntime {
    private readonly ctx;
    private readonly agent;
    private readonly stop;
    private timer;
    private idleWait;
    private run;
    private requested;
    private stopping;
    private faulted;
    private disposal;
    /**
     * Construct an inactive runtime; {@link start} begins the first preflight.
     * @param ctx - Global service context.
     * @param agent - Exact live root agent.
     */
    constructor(ctx: Context, agent: Agent);
    /** Begin the initial durability preflight and timer derivation. */
    start(): void;
    /** Recompute the live projection after a committed mutation or idle transition. */
    requestDrive(): void;
    /** Stop future work, cancel timers, and await every outstanding runtime promise. */
    dispose(): Promise<void>;
    /** Drain coalesced triggers serially. */
    private runRequested;
    /** Retire one exact run and honor a trigger that landed during its final microtask. */
    private retire;
    /** Whether this exact root lifecycle remains authoritative. */
    private isLive;
    /** Whether this runtime may start or continue Schedule work. */
    private isRunnable;
    /** Cancel the currently armed timer, if any. */
    private clearTimer;
    /** Arm one bounded timer segment; every wake rechecks the wall clock. */
    private arm;
    /** Await one public idle boundary without holding admission or creating a retry timer. */
    private waitForIdle;
    /** Fold the current exact runtime suffix and contain a corrupt durable stream. */
    private readFolded;
    /** Contain an invalid wall-clock decision without permanently faulting this runtime. */
    private decide;
    /** Preflight, fold, arm, or dispatch the next one-shot or fixed-rate batch. */
    private driveOnce;
}
//# sourceMappingURL=runtime.d.ts.map
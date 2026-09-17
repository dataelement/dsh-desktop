/** Live Session queue, jobs, and projection state with reconnect baselines. */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionControlFrame } from './types.ts';
/** Owns the Host-wide Session control stream. */
export declare class SessionControlController {
    private readonly ctx;
    private readonly streams;
    /** @param ctx - Host context carrying live Agent, projection, and jobs services. */
    constructor(ctx: Context);
    /**
     * Open one generation of Host-wide live control state.
     * @param signal - Remote stream cancellation.
     * @returns one complete baseline followed by live replacement frames.
     */
    control(signal: AbortSignal): AsyncIterable<SessionControlFrame>;
    private baseline;
    private projectionBaseline;
    private onJobsChanged;
    private jobsFor;
    private broadcast;
}
//# sourceMappingURL=control.d.ts.map
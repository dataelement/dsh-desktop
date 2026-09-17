/** Browser implementation of the Cordis timer Service. */
import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
declare module '@deepseek-ai/cordis' {
    interface Context extends Pick<ClientTimerService, 'interval' | 'timeout' | 'throttle' | 'debounce' | 'setTimeout' | 'setInterval'> {
        /** Browser timer Service used by the mixed-in Context helpers. */
        timer: ClientTimerService;
    }
}
type WithDispose<T> = T & {
    dispose: () => void;
};
/** Browser timer Service with the same public API as the Host Cordis TimerService. */
export declare class ClientTimerService extends Service {
    /** Register the Service and mix its lifecycle-safe helpers onto Context. */
    constructor(ctx: Context);
    /**
     * Run a callback once through {@link timeout}.
     * @param callback - Work to run after the delay.
     * @param delay - Delay in milliseconds.
     * @returns Disposer that cancels the pending callback early.
     * @deprecated Use `ctx.timeout()` instead.
     */
    setTimeout(callback: () => void, delay: number): () => void;
    /**
     * Run a callback repeatedly through {@link interval}.
     * @param callback - Work to run on each tick.
     * @param delay - Interval in milliseconds.
     * @returns Disposer that stops the interval early.
     * @deprecated Use `ctx.interval()` instead.
     */
    setInterval(callback: () => void, delay: number): () => void;
    /**
     * Run a callback once after a delay.
     * @param callback - work to run.
     * @param delay - delay in milliseconds.
     * @returns disposer that cancels the callback.
     */
    timeout(callback: () => void, delay: number): () => void;
    /**
     * Wait for a delay.
     * @param delay - delay in milliseconds.
     * @returns promise resolved after the delay.
     */
    timeout(delay: number): Promise<void>;
    /**
     * Run a callback repeatedly.
     * @param callback - work to run on each tick.
     * @param delay - interval in milliseconds.
     * @returns disposer that stops the interval.
     */
    interval(callback: () => void, delay: number): () => void;
    /**
     * Iterate over timer ticks.
     * @param delay - interval in milliseconds.
     * @returns async iterator of ticks.
     */
    interval<R = any>(delay: number): AsyncIterableIterator<void, R, void>;
    /** Build a delayed wrapper whose pending callback belongs to the calling Fiber. */
    private schedule;
    /**
     * Return a throttled function whose timer is disposed with the calling Fiber.
     * @param callback - Function to throttle.
     * @param delay - Minimum interval between calls in milliseconds.
     * @param noTrailing - Whether to suppress a delayed trailing call.
     * @returns Throttled function with an early disposer.
     */
    throttle<F extends (...args: any[]) => void>(callback: F, delay: number, noTrailing?: boolean): WithDispose<F>;
    /**
     * Return a debounced function whose timer is disposed with the calling Fiber.
     * @param callback - Function to debounce.
     * @param delay - Quiet period in milliseconds.
     * @returns Debounced function with an early disposer.
     */
    debounce<F extends (...args: any[]) => void>(callback: F, delay: number): WithDispose<F>;
}
/**
 * Install the browser timer Service on one Client composition.
 * @param ctx - Client context that owns the Service and mixed-in helpers.
 * @returns Nothing after registering the Service.
 */
export declare function provideClientTimer(ctx: Context): void;
export {};
//# sourceMappingURL=timer.d.ts.map
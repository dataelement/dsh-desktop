import { Context, Service } from '@deepseek-ai/cordis';
declare module '@deepseek-ai/cordis' {
    interface Context extends Pick<TimerService, 'interval' | 'timeout' | 'throttle' | 'debounce' | 'setTimeout' | 'setInterval'> {
        timer: TimerService;
    }
}
type WithDispose<T> = T & {
    dispose: () => void;
};
/** Disposable timer helpers mixed into Cordis contexts. */
export declare class TimerService extends Service {
    constructor(ctx: Context);
    /** @deprecated use `ctx.timeout()` instead */
    setTimeout(callback: () => void, delay: number): () => void;
    /** @deprecated use `ctx.interval()` instead */
    setInterval(callback: () => void, delay: number): () => void;
    /** Run a callback once, or return a promise that resolves after `delay`. */
    timeout(callback: () => void, delay: number): () => void;
    timeout(delay: number): Promise<void>;
    /** Run a callback repeatedly, or return an async iterator of ticks. */
    interval(callback: () => void, delay: number): () => void;
    interval<R = any>(delay: number): AsyncIterableIterator<void, R, void>;
    private _schedule;
    /** Return a throttled function whose timer is disposed with the current fiber. */
    throttle<F extends (...args: any[]) => void>(callback: F, delay: number, noTrailing?: boolean): WithDispose<F>;
    /** Return a debounced function whose timer is disposed with the current fiber. */
    debounce<F extends (...args: any[]) => void>(callback: F, delay: number): WithDispose<F>;
}
export default TimerService;
//# sourceMappingURL=index.d.ts.map
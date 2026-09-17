import { Service } from "@deepseek-ai/cordis";
//#region lib/types/index.js
/** Disposable timer helpers mixed into Cordis contexts. */
var TimerService = class extends Service {
	constructor(ctx) {
		super(ctx, "timer");
		ctx.mixin("timer", [
			"timeout",
			"interval",
			"throttle",
			"debounce",
			"setTimeout",
			"setInterval"
		]);
	}
	/** @deprecated use `ctx.timeout()` instead */
	setTimeout(callback, delay) {
		return this.timeout(callback, delay);
	}
	/** @deprecated use `ctx.interval()` instead */
	setInterval(callback, delay) {
		return this.interval(callback, delay);
	}
	timeout(...args) {
		const callback = typeof args[0] === "function" ? args.shift() : void 0;
		const delay = args[0];
		if (callback) {
			const dispose = this.ctx.effect(() => {
				const timer = setTimeout(() => {
					dispose();
					callback();
				}, delay);
				return () => clearTimeout(timer);
			}, "ctx.timeout()");
			return dispose;
		} else {
			const { promise, resolve, reject } = Promise.withResolvers();
			const dispose = this.ctx.effect(() => {
				const timer = setTimeout(resolve, delay);
				return () => {
					clearTimeout(timer);
					reject(/* @__PURE__ */ new Error("Context has been disposed"));
				};
			}, "ctx.timeout()");
			return promise.finally(dispose);
		}
	}
	interval(...args) {
		const callback = typeof args[0] === "function" ? args.shift() : void 0;
		const delay = args[0];
		if (callback) return this.ctx.effect(() => {
			const timer = setInterval(callback, delay);
			return () => clearInterval(timer);
		}, "ctx.interval()");
		else {
			let done;
			let nextTask;
			const dispose = this.ctx.effect(() => {
				const timer = setInterval(() => {
					nextTask?.resolve({
						done: false,
						value: void 0
					});
				}, delay);
				return () => {
					clearInterval(timer);
					if (done) return;
					done = {
						kind: "throw",
						reason: /* @__PURE__ */ new Error("Context has been disposed")
					};
					nextTask?.reject(done.reason);
				};
			}, "ctx.interval()");
			return {
				next: () => {
					if (!done) return (nextTask = Promise.withResolvers()).promise;
					if (done.kind === "return") return Promise.resolve({
						done: true,
						value: done.value
					});
					return Promise.reject(done.reason);
				},
				return: (value) => {
					if (!done) done = {
						kind: "return",
						value
					};
					nextTask?.resolve({
						done: true,
						value
					});
					dispose();
					return Promise.resolve({
						done: true,
						value
					});
				},
				throw: (reason) => {
					if (!done) done = {
						kind: "throw",
						reason
					};
					nextTask?.reject(reason);
					dispose();
					return Promise.resolve({
						done: true,
						value: void 0
					});
				},
				[Symbol.asyncIterator]() {
					return this;
				}
			};
		}
	}
	_schedule(label, trigger, isDisposed = false) {
		let timer;
		const dispose = this.ctx.effect(() => () => {
			isDisposed = true;
			clearTimeout(timer);
		}, label);
		const wrapper = (...args) => {
			clearTimeout(timer);
			timer = trigger(args, isDisposed);
		};
		wrapper.dispose = dispose;
		return wrapper;
	}
	/** Return a throttled function whose timer is disposed with the current fiber. */
	throttle(callback, delay, noTrailing) {
		let lastCall = -Infinity;
		const execute = (...args) => {
			lastCall = Date.now();
			callback(...args);
		};
		return this._schedule("ctx.throttle()", (args, isDisposed) => {
			const remaining = delay - Date.now() + lastCall;
			if (remaining <= 0) execute(...args);
			else if (!isDisposed) return setTimeout(execute, remaining, ...args);
		}, noTrailing);
	}
	/** Return a debounced function whose timer is disposed with the current fiber. */
	debounce(callback, delay) {
		return this._schedule("ctx.debounce()", (args, isDisposed) => {
			if (isDisposed) return;
			return setTimeout(callback, delay, ...args);
		});
	}
};
//#endregion
export { TimerService, TimerService as default };

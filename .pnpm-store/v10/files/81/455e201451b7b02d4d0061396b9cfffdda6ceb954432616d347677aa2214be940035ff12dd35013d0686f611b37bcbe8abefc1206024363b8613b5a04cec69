export function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        signal.throwIfAborted();
        const onAbort = () => {
            clearTimeout(timeout);
            reject(signal.reason);
        };
        const timeout = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal.addEventListener("abort", onAbort, { once: true });
    });
}
//# sourceMappingURL=sleep.js.map
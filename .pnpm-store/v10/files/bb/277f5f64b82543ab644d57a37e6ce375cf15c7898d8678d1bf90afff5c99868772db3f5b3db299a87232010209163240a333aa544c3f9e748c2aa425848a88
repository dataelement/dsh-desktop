const DEFAULT_MAX_RETRY_DELAY_MS = 60_000;
function isProviderError(error) {
    if (!(error instanceof Error) || !("status" in error) || !("headers" in error))
        return false;
    return ((error.status === undefined || typeof error.status === "number") &&
        (error.headers === undefined || error.headers instanceof Headers));
}
/** Mirrors the pinned OpenAI/Anthropic SDK retry policy; review when either SDK is upgraded. */
function isRetryableProviderError(error) {
    const shouldRetry = error.headers?.get("x-should-retry");
    if (shouldRetry === "true")
        return true;
    if (shouldRetry === "false")
        return false;
    if (error.status === undefined)
        return true;
    return (error.status === 408 ||
        error.status === 409 ||
        error.status === 429 ||
        (typeof error.status === "number" && error.status >= 500));
}
function validateServerRetryDelayMs(delayMs, maxRetryDelayMs, providerErrorMessage) {
    const maxDelayMs = maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
    if (maxDelayMs > 0 && delayMs > maxDelayMs) {
        throw new Error(`Server requested ${Math.ceil(delayMs / 1000)}s retry delay (max: ${Math.ceil(maxDelayMs / 1000)}s). ${providerErrorMessage}`);
    }
    return delayMs;
}
function getRetryDelayMs(error, retryIndex, maxRetryDelayMs) {
    const retryAfterMs = error.headers?.get("retry-after-ms");
    if (retryAfterMs) {
        const value = Number.parseFloat(retryAfterMs);
        if (!Number.isNaN(value))
            return validateServerRetryDelayMs(value, maxRetryDelayMs, error.message);
    }
    const retryAfter = error.headers?.get("retry-after");
    if (retryAfter) {
        const seconds = Number.parseFloat(retryAfter);
        const delayMs = Number.isNaN(seconds) ? Date.parse(retryAfter) - Date.now() : seconds * 1000;
        return validateServerRetryDelayMs(delayMs, maxRetryDelayMs, error.message);
    }
    const exponentialDelay = Math.min(0.5 * 2 ** retryIndex, 8) * 1000;
    return exponentialDelay * (1 - Math.random() * 0.25);
}
function createAbortError() {
    const error = new Error("Request aborted");
    error.name = "AbortError";
    return error;
}
function abortableSleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(createAbortError());
            return;
        }
        const onAbort = () => {
            clearTimeout(timeout);
            reject(createAbortError());
        };
        const timeout = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, Math.max(0, ms));
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}
/**
 * Reproduce the retry behavior used by the OpenAI and Anthropic SDKs while making
 * their backoff sleep interruptible. Their built-in retry timers ignore the
 * request AbortSignal, so callers must invoke the SDK with `maxRetries: 0` and
 * wrap the request with this helper. Provider-requested delays above
 * `maxRetryDelayMs` fail immediately (60 seconds by default); set it to zero to
 * disable the limit.
 */
export async function retryProviderRequest(request, options = {}) {
    const maxRetries = options.maxRetries ?? 0;
    let retriesRemaining = maxRetries;
    for (;;) {
        try {
            // Each retry is a fresh SDK request, so X-Stainless-Retry-Count remains zero.
            return await request();
        }
        catch (error) {
            if (options.signal?.aborted)
                throw createAbortError();
            if (retriesRemaining <= 0 || !isProviderError(error) || !isRetryableProviderError(error))
                throw error;
            const retryIndex = maxRetries - retriesRemaining;
            retriesRemaining--;
            await abortableSleep(getRetryDelayMs(error, retryIndex, options.maxRetryDelayMs), options.signal);
        }
    }
}
//# sourceMappingURL=provider-retry.js.map
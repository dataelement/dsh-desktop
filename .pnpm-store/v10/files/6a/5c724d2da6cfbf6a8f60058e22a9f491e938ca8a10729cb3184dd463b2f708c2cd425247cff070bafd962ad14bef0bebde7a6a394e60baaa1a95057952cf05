interface ProviderRetryOptions {
    maxRetries?: number;
    maxRetryDelayMs?: number;
    signal?: AbortSignal;
}
/**
 * Reproduce the retry behavior used by the OpenAI and Anthropic SDKs while making
 * their backoff sleep interruptible. Their built-in retry timers ignore the
 * request AbortSignal, so callers must invoke the SDK with `maxRetries: 0` and
 * wrap the request with this helper. Provider-requested delays above
 * `maxRetryDelayMs` fail immediately (60 seconds by default); set it to zero to
 * disable the limit.
 */
export declare function retryProviderRequest<T>(request: () => Promise<T>, options?: ProviderRetryOptions): Promise<T>;
export {};
//# sourceMappingURL=provider-retry.d.ts.map
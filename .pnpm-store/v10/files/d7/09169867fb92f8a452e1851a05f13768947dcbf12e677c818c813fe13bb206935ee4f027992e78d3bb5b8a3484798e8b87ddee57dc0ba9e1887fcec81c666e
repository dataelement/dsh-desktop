import type { AssistantMessage } from "../types.ts";
/**
 * Retry policy: bounded attempts with exponential backoff (`baseDelayMs * 2^(attempt-1)`).
 * Matches `settings.retry` (`enabled`, `maxRetries`, `baseDelayMs`) in coding-agent; kept
 * here so the classifier and the policy-driven retry loop live together and stay reusable
 * by the SDK and other callers.
 */
export interface RetryPolicy {
    enabled: boolean;
    /** Max retry attempts (0 = no retries). The initial call never counts as a retry. */
    maxRetries: number;
    /** Base delay in ms. Per-attempt delay is `baseDelayMs * 2^(attempt-1)` before jitter. */
    baseDelayMs: number;
}
/** Optional callbacks emitted by {@link retryAssistantCall} around each retry. */
export interface RetryCallbacks {
    /** Emitted before the backoff sleep of each retry attempt (1-indexed). */
    onRetryScheduled?: (attempt: number, maxAttempts: number, delayMs: number, errorMessage: string) => void | Promise<void>;
    /** Emitted after the backoff sleep, immediately before the retried call starts. */
    onRetryAttemptStart?: () => void | Promise<void>;
    /** Emitted once when the loop ends: success if a later call completed normally. */
    onRetryFinished?: (success: boolean, attempt: number, finalError?: string) => void | Promise<void>;
}
/**
 * Run a single assistant-producing call with bounded retry on transient errors.
 *
 * Behavior:
 * - A successful response is returned immediately. Aborts are terminal and never
 *   retried, but reported as unsuccessful if they happen after a retry was scheduled.
 *   Aborts during the backoff sleep are normalized to an aborted `AssistantMessage`
 *   too, so callers do not need to care when cancellation happened.
 * - A non-retryable error (per {@link isRetryableAssistantError}, including quota/
 *   billing exhaustion) is returned immediately so deterministic errors fail fast.
 * - Otherwise retries up to `maxRetries` times with exponential backoff, emitting
 *   `onRetryScheduled` before each sleep, `onRetryAttemptStart` after each sleep before
 *   the retried call starts, and `onRetryFinished` once at the end (whether the loop
 *   ends in success, exhausted retries, or an aborted backoff).
 *
 * When `policy` is undefined or disabled, the first response is returned unchanged
 * (equivalent to calling `produce()` directly).
 */
export declare function retryAssistantCall(produce: () => Promise<AssistantMessage>, policy: RetryPolicy | undefined, signal: AbortSignal | undefined, callbacks?: RetryCallbacks): Promise<AssistantMessage>;
/**
 * Classifies whether a failed assistant message looks like a transient provider
 * or transport error, so callers can decide if the last assistant turn should be
 * restarted.
 *
 * This does not implement retry policy. Callers should first handle context
 * overflow separately, then apply their own retry budget, backoff, and reporting
 * before restarting the assistant turn.
 */
export declare function isRetryableAssistantError(message: AssistantMessage): boolean;
//# sourceMappingURL=retry.d.ts.map
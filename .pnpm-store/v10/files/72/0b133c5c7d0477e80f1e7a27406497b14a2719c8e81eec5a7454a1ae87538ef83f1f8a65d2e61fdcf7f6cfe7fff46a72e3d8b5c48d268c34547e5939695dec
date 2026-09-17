/** Shared validation for Host-configured and browser-local connection recovery. */
import z from '@deepseek-ai/schemastery';
/** Timing for generation readiness and automatic reconnection. */
export interface ConnectionRecoveryConfig {
    /** First-retry delay cap in ms; actual delay is 50–100% of the cap. Default: 500. */
    backoffBaseMs?: number;
    /** Finite growth factor of at least 1 per failed attempt; 1 keeps a fixed cap. Default: 2. */
    backoffFactor?: number;
    /** Maximum retry delay cap in ms; retries continue at this cap. Default: 10000. */
    backoffMaxMs?: number;
    /**
     * Delay before reporting a slow handshake, without cancelling it. Default: 3000.
     * Omitted when readiness, failure, cancellation, or the hard deadline occurs first.
     */
    generationReadyWarnMs?: number;
    /** Deadline in ms for readiness, including physical connection setup. Default: 15000. */
    generationReadyTimeoutMs?: number;
}
/** Schema shared by the Host plugin and the Client's recovery input parser. */
export declare const ConnectionRecoveryConfigSchema: z<ConnectionRecoveryConfig>;
/**
 * Validate recovery input and supply every timing default before starting work.
 * @param config - Host configuration, page bootstrap data, or direct loop options.
 * @returns validated, complete recovery timing.
 */
export declare function resolveConnectionConfig(config?: unknown): Required<ConnectionRecoveryConfig>;
//# sourceMappingURL=recovery-config.d.ts.map
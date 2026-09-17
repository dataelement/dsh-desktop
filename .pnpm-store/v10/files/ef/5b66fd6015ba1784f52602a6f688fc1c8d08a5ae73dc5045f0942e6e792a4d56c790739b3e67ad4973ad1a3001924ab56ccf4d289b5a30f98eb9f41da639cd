/**
 * Connection supervisor: owns the MCP client/transport generations for one
 * plugin instance, keeps the harness tool registry in sync with the live
 * generation, and — when the connection drops — restarts the configured
 * server with bounded exponential backoff.
 *
 * One outage shares one attempt budget (`maxAttempts` consecutive failed
 * attempts, delays doubling from `initialDelayMs` up to `maxDelayMs`). A
 * connection that stays up past the stability window closes the outage, so
 * the next disconnect starts a fresh budget while a crash-looping server —
 * even one whose connects briefly succeed — still exhausts the cap instead of
 * restarting forever. Exhaustion unregisters the server's tools and stops;
 * disposal (including HMR) is the only way back from that state.
 *
 * @module
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './index.ts';
/** Automatic reconnect policy for one MCP server connection. */
export interface ReconnectConfig {
    /** Reconnect automatically after a lost connection (default true). */
    enabled?: boolean;
    /** First reconnect delay in milliseconds; doubles per consecutive failed attempt (default 500). */
    initialDelayMs?: number;
    /** Backoff ceiling in milliseconds; also the uptime after which the attempt budget resets (default 30000). */
    maxDelayMs?: number;
    /** Consecutive failed attempts per outage before giving up for good (default 10). */
    maxAttempts?: number;
}
/** Defaults shared by the Config schema and {@link resolveReconnectPolicy}. */
export declare const RECONNECT_DEFAULTS: Required<ReconnectConfig>;
/** Fully resolved reconnect policy captured at plugin load. */
export type ResolvedReconnectPolicy = Readonly<Required<ReconnectConfig>>;
/**
 * The one explicit resolve step from raw reconnect config to the policy the
 * supervisor runs. Programmatic construction may bypass Schemastery
 * normalization, so every default and bound is re-judged here — misconfiguration
 * fails the plugin instance at load.
 *
 * @param config - Raw `reconnect` config; omission uses the defaults.
 * @param path - Diagnostic prefix naming the config location in thrown messages.
 * @returns The frozen resolved policy.
 */
export declare function resolveReconnectPolicy(config: ReconnectConfig | undefined, path: string): ResolvedReconnectPolicy;
/** Result from the initial connection attempt, for startup-await semantics. */
export interface ConnectionOutcome {
    /** If the initial connection or tool sync failed, the error; otherwise absent. */
    error?: unknown;
}
/** Handle for one plugin instance's supervised connection. */
export interface ConnectionHandle {
    /**
     * Settles when the first connection attempt completes (success or failure).
     * The supervisor enters its reconnect loop regardless; the caller decides
     * whether a failed startup is fatal via `failOnStartupError`.
     */
    ready: Promise<ConnectionOutcome>;
    /**
     * Stop reconnection, close the live client, wait for the in-flight attempt
     * and queued tool syncs to quiesce, then unregister every tool this server
     * still owns.
     */
    dispose(): Promise<void>;
}
/**
 * Start the supervised connection for one MCP server and keep it alive per
 * the reconnect policy.
 *
 * @param ctx - Cordis context providing the `tools` registry and logger.
 * @param config - Resolved plugin config selecting the transport and server identity.
 * @param policy - Resolved reconnect policy from {@link resolveReconnectPolicy}.
 * @returns Handle with a `ready` promise for startup-await and a `dispose` for teardown.
 */
export declare function startConnection(ctx: Context, config: Config, policy: ResolvedReconnectPolicy): ConnectionHandle;
//# sourceMappingURL=connection.d.ts.map
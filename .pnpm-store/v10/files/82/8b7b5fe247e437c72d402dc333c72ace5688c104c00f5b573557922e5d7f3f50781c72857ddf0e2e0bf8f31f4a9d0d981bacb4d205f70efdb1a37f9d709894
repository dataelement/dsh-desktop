import type { AgentConnectOptions, AgentConnectionLifecycle, AgentConnector } from "./connection.js";
import type { WireStream as Stream } from "./stream.js";
/**
 * Routes a client connection to a version-specific ACP agent implementation,
 * including the experimental draft ACP v2 API.
 *
 * The router consumes the first wire item, which must be an `initialize`
 * request or a single-entry batch containing one. It selects the highest
 * configured protocol version that does not exceed the client's requested
 * version. Only the initialize params and optional batch framing are
 * normalized; every later wire item is forwarded unchanged.
 *
 * @experimental
 */
export declare class AgentProtocolRouter implements AgentConnector {
    private v1?;
    private v2?;
    /** Configures the ACP v1 agent implementation. */
    withV1(agent: AgentConnector): this;
    /**
     * Configures the experimental draft ACP v2 agent implementation.
     *
     * @experimental
     */
    withV2(agent: AgentConnector): this;
    /** Routes one ACP transport connection. */
    connect(stream: Stream, options?: AgentConnectOptions): AgentConnectionLifecycle;
    private route;
    private highestCompatible;
    private supportedDescription;
}
/**
 * Creates an empty agent protocol router with experimental ACP v2 support.
 *
 * @experimental
 */
export declare function agentProtocolRouter(): AgentProtocolRouter;

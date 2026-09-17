/** Standard ACP MCP-server declarations translated into Agent-scoped DSH MCP clients. */
import type { Context } from '@deepseek-ai/cordis';
import type { McpServer } from '@agentclientprotocol/sdk';
/** Caller-correctable MCP declaration failure. */
export declare class AcpMcpConfigError extends Error {
    constructor(message: string);
}
/**
 * Validate and mount one session's complete standard MCP server list before Agent publication.
 * @param agentCtx - unpublished Agent scope that owns the MCP clients and tools.
 * @param servers - stable ACP stdio or HTTP server declarations.
 * @param sessionCwd - canonical primary workspace used by stdio servers.
 */
export declare function mountAcpMcpServers(agentCtx: Context, servers: readonly McpServer[], sessionCwd: string): Promise<void>;
//# sourceMappingURL=mcp.d.ts.map
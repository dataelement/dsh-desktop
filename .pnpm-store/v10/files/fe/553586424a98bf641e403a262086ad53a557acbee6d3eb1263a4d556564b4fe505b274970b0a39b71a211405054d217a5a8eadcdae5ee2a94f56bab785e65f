/**
 * MCP client bridge plugin: connects to an external MCP server and registers
 * its tools on `ctx.tools` under server-qualified public names
 * (`mcp__<serverName>__<rawName>`). Each plugin instance connects to one MCP
 * server; load multiple instances in `cordis.yml` for multiple servers.
 *
 * Namespace plugin (named exports, no default export). Lifecycle is
 * effect-scoped: disposal disconnects from the server, unregisters all tools,
 * and releases the `serverName` namespace reservation. HMR hot-swaps by
 * disposing the old instance and creating a new one; identical `serverName`
 * reproduces identical public tool names.
 *
 * @module @deepseek-ai/dsh-mcp-client
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { ReconnectConfig } from './connection.ts';
export type { McpResult } from './tools.ts';
export type { ReconnectConfig, ResolvedReconnectPolicy } from './connection.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "mcp-client";
/** Services required by this plugin. */
export declare const inject: string[];
/** Config for connecting to an MCP server via a spawned child process over stdio. */
export interface StdioConfig {
    /** Selects child-process stdio transport. */
    transport: 'stdio';
    /**
     * Stable local namespace for this server's model-facing tool names
     * (`mcp__<serverName>__<rawName>`). Must match `[A-Za-z0-9_-]{1,32}` and be
     * unique across live mcp-client instances.
     */
    serverName: string;
    /** Executable used to start the server. */
    command: string;
    /** Arguments passed directly, without shell interpolation. */
    args: string[];
    /** Extra env vars merged on top of scrubbed ambient env. */
    env: Record<string, string>;
    /** Working directory for the child process. */
    cwd: string;
    /** Per-tool-call timeout in milliseconds. */
    toolCallTimeoutMs: number;
    /** Fail plugin activation when the initial connection or tool synchronization fails. */
    failOnStartupError: boolean;
    /** Automatic reconnect policy after a lost connection; omission uses the defaults. */
    reconnect?: ReconnectConfig;
}
/** Config for connecting to an MCP server over Streamable HTTP (SSE). */
export interface StreamableHttpConfig {
    /** Selects Streamable HTTP transport. */
    transport: 'streamable-http';
    /**
     * Stable local namespace for this server's model-facing tool names
     * (`mcp__<serverName>__<rawName>`). Must match `[A-Za-z0-9_-]{1,32}` and be
     * unique across live mcp-client instances.
     */
    serverName: string;
    /** MCP endpoint URL. */
    url: string;
    /** Additional headers attached to MCP requests. */
    headers: Record<string, string>;
    /** Per-tool-call timeout in milliseconds. */
    toolCallTimeoutMs: number;
    /** Fail plugin activation when the initial connection or tool synchronization fails. */
    failOnStartupError: boolean;
    /** Automatic reconnect policy after a lost connection; omission uses the defaults. */
    reconnect?: ReconnectConfig;
}
/** Configuration for one stdio or Streamable HTTP MCP server. */
export type Config = StdioConfig | StreamableHttpConfig;
type StdioConfigInput = Omit<StdioConfig, 'args' | 'env' | 'cwd' | 'toolCallTimeoutMs' | 'failOnStartupError'> & Partial<Pick<StdioConfig, 'args' | 'env' | 'cwd' | 'toolCallTimeoutMs' | 'failOnStartupError'>>;
type StreamableHttpConfigInput = Omit<StreamableHttpConfig, 'headers' | 'toolCallTimeoutMs' | 'failOnStartupError'> & Partial<Pick<StreamableHttpConfig, 'headers' | 'toolCallTimeoutMs' | 'failOnStartupError'>>;
type ConfigInput = StdioConfigInput | StreamableHttpConfigInput;
export declare const Config: z<ConfigInput, Config>;
/**
 * Connect one MCP server and publish its initial tool generation before activation.
 * This entry remains explicitly `async`: Cordis treats a prototype-bearing
 * ordinary function as a constructor, whose returned Promise is not startup work.
 * @param ctx - plugin context carrying the tool registry.
 * @param config - resolved transport and server namespace configuration.
 * @returns startup readiness after connection and initial tool discovery settle.
 */
export declare function apply(ctx: Context, config: Config): Promise<void>;
//# sourceMappingURL=index.d.ts.map
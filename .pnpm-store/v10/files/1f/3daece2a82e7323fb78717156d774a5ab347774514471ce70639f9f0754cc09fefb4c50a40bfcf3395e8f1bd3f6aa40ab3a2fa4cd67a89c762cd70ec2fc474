/**
 * SDK-facing JSON-RPC plugin over stdio. The selected dsh profile decides
 * whether to load it; see the single-launch Agent Note and package README.
 * Stdout is reserved for protocol frames, so the tree must not load a stdout logger.
 * This plugin answers `shutdown`, disposes the complete root runtime, and exits 0; the app bin
 * owns EOF and signal exits. Keep named plugin exports with no default export so
 * Loader `unwrapExports` preserves `name`, `inject`, `Config`, and `apply`.
 *
 * @module @deepseek-ai/dsh-sdk-jsonrpc-server
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Readable, Writable } from 'node:stream';
import Schema from '@deepseek-ai/schemastery';
export * from './server.ts';
export declare const name = "sdk-jsonrpc-server";
export declare const inject: string[];
/** JSON-RPC deployment config plus runtime-only test hooks. */
export interface JsonRpcConfig {
    /** Report max-token turn/subagent termination as a successful SDK result. */
    maxTokensAsSuccess?: boolean;
    /** Transport input override; production uses `process.stdin`. */
    input?: Readable;
    /** Transport output override; production uses `process.stdout`. */
    output?: Writable;
    /** Process-exit override; production uses `process.exit`. */
    exit?: (code: number) => void;
}
export declare const Config: Schema<JsonRpcConfig>;
/**
 * Serve SDK requests over the configured streams. Effect disposal shuts down
 * SDK-created agents and closes the transport. A `shutdown` response is flushed
 * before the root runtime is disposed and the process exits 0; the app bin
 * owns root-context disposal for EOF and signals.
 */
export declare function apply(ctx: Context, config: JsonRpcConfig): void;
//# sourceMappingURL=index.d.ts.map
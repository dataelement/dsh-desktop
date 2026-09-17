/**
 * Model-facing UTF-8 read. It performs one provider stat for type, routing, and observed version,
 * streams large or size-unknown files, renders a bounded window, then emits the observation.
 * @module @deepseek-ai/dsh-tool-fs/src/read
 */
import type { Context } from '@deepseek-ai/cordis';
/** Default and maximum number of lines returned by one `read` call (the `readLimit` config). */
export declare const READ_LIMIT = 2000;
/**
 * Default streaming threshold (the `readStreamMinSize` config): files at or
 * above this size stream; smaller files read whole into memory.
 */
export declare const STREAM_MIN_SIZE: number;
/** Resolved read-tool caps — plugin config after defaulting (see `Config` in index.ts). */
export interface ReadToolCaps {
    /** Default and maximum number of lines returned by one call. */
    limit: number;
    /** Maximum characters returned for a single line. */
    maxLineLength: number;
    /** Maximum bytes returned for selected file lines. */
    maxBytes: number;
    /** Files at or above this size stream; smaller files read whole into memory. */
    streamMinSize: number;
}
/** Validated `read` arguments after defaulting. */
interface ReadInput {
    filePath: string;
    offset: number;
    limit: number;
}
/**
 * Validate value constraints the schema DSL can't express. `maxLimit` is the deployment's line cap.
 * @param args - the schema-validated raw tool arguments; `offset`/`limit` must be positive integers when given.
 * @param maxLimit - the configured line cap: both the default `limit` and the largest one accepted.
 * @returns the validated input with `offset` defaulted to 1 and `limit` to `maxLimit`.
 */
export declare function parseReadArgs(args: {
    file_path: string;
    offset?: number;
    limit?: number;
}, maxLimit: number): ReadInput;
/**
 * Register the `read` tool and its scope-aware system-prompt guidance.
 * @param ctx - the plugin context; registrations are effects scoped to it, and execution uses its `fs` service.
 * @param caps - the deployment's resolved read caps (plugin config after defaulting).
 */
export declare function applyReadTool(ctx: Context, caps: ReadToolCaps): void;
export {};
//# sourceMappingURL=read.d.ts.map
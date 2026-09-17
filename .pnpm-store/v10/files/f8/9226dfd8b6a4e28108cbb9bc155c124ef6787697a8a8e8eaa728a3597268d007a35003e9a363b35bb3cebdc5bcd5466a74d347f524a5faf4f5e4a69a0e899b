/**
 * Workspace instruction loader for AGENTS.md-compatible files.
 *
 * Baseline instructions enter durable context before the first request; successful fs
 * tool touches project nested, changed, and removed instructions into the inbox.
 * Plugin lifecycle reads use the optional `ctx.fs` provider, so providerless products
 * mount it as a no-op.
 *
 * @module @deepseek-ai/dsh-agent-instructions
 */
import type { Context } from '@deepseek-ai/cordis';
import { Config } from './config.ts';
import { name } from './state.ts';
export { Config, name };
/** Services required by workspace instruction projection. */
export declare const inject: string[];
export { discoverBaselineInstructionFiles, loadBaselineInstructions, } from './files.ts';
export type { InstructionFile, LoadedInstructionFile, } from './files.ts';
export { renderWorkspaceContext } from './render.ts';
export type { RenderedWorkspaceContext, TruncatedInstruction } from './render.ts';
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
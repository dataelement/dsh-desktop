/**
 * Model-facing persistent `pwsh` tool over the owner-scoped PTY seam.
 * @module @deepseek-ai/dsh-tool-pwsh-persistent
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "tool-pwsh-persistent";
export declare const inject: string[];
/** Configuration for the persistent pwsh tool. */
export interface Config {
    /** PTY backend used for each owner-isolated persistent shell (default `shell`). */
    backendType?: string;
    /** Wall-clock limit for one command (default 300000). */
    timeoutMs?: number;
    /** Maximum returned command-output characters before clipping (default 16000). */
    maxOutputChars?: number;
    /** Model-facing tool description; deployments may describe their environment. */
    description?: string;
}
/** Runtime configuration schema for the persistent pwsh tool. */
export declare const Config: z<Config>;
/** Register one owner-scoped persistent `pwsh` tool. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
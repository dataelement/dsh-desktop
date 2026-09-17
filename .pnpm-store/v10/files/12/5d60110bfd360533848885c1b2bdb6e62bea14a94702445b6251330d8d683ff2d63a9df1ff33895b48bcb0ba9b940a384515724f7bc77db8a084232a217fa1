/**
 * Model-facing persistent `bash` tool over the owner-scoped PTY seam.
 * @module @deepseek-ai/dsh-tool-bash-persistent
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "tool-bash-persistent";
export declare const inject: string[];
/** Configuration for the persistent Bash tool. */
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
/** Runtime configuration schema for the persistent Bash tool. */
export declare const Config: z<Config>;
/** Register one owner-scoped persistent `bash` tool. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
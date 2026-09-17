/**
 * Model-facing foreground Ralph loop over the workflow and subagent seams. A
 * fixed script starts one fresh structured-output child per round, carrying
 * only the immutable objective and the previous bounded handoff between them.
 * @module @deepseek-ai/dsh-tool-ralph
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "tool-ralph";
export declare const inject: string[];
/** Deployment policy for the fixed Ralph workflow. */
export interface Config {
    /** Fresh structured-output provider used for every round (default `spawn`). */
    subagentProvider?: string;
    /** Default and deployment ceiling for one call's round count (default 256). */
    maxRounds?: number;
    /** Maximum serialized characters in one structured handoff (default 16384). */
    maxHandoffChars?: number;
    /** Maximum characters in a successful parent-facing terminal text (default 16384). */
    maxResultChars?: number;
}
/** Schemastery configuration for the Ralph tool. */
export declare const Config: z<Config>;
/** Register the fixed Ralph tool and its explicit-ask usage policy. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
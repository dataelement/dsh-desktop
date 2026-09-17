/** Scoped tool that declares filesystem deliveries in their owning Session. */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Stable Loader identity. */
export declare const name = "tool-present";
/** Per-call delivery limit. */
export interface Config {
    /** Maximum number of files in one call. */
    maxFiles: number;
}
/** Validated delivery limit. */
export declare const Config: z<Config>;
/** Services used by the scoped delivery tool. */
export declare const inject: string[];
/**
 * Register present with durable file references in its tool result.
 * @param ctx - agent-scoped services.
 * @param config - maximum files per call.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
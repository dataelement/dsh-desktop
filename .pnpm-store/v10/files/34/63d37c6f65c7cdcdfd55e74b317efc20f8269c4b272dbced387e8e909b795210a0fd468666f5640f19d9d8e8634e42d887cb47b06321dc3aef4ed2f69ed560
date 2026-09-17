/**
 * Model-facing `get_goal`, `create_goal`, and `update_goal` tools over the
 * persisted same-session goal domain.
 * @module @deepseek-ai/dsh-tool-goal
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "tool-goal";
export declare const inject: string[];
/** Model policy and hard lower bounds for goal-state updates. */
export interface Config {
    /** Minimum admitted goal rounds before the model may self-report `blocked`. */
    blockedAfterConsecutiveRounds?: number;
}
/** Schemastery config for the goal-tool policy. */
export declare const Config: z<Config>;
/** Register the three Codex-shaped goal tools and their shared policy section. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
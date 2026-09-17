/**
 * Load-time validation and routed-model policy resolution for compaction-basic.
 *
 * @module @deepseek-ai/dsh-compaction-basic/config
 */
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm';
import type { BasicCompactionConfig, ResolvedCompactSpec, ResolvedConfig, ResolvedTargetPolicy } from './types.ts';
/** Target-specific pressure configuration failure eligible for warning suppression. */
export declare class TargetPressureConfigError extends Error {
    readonly targetKey: string;
    /**
     * @param targetKey - exact provider/model route used as the warning key.
     * @param message - actionable configuration failure detail.
     */
    constructor(targetKey: string, message: string);
}
/**
 * Resolve and validate service defaults plus exact-target partial overrides.
 * @param config - untrusted plugin configuration after Loader normalization.
 * @returns detached immutable defaults and validated exact-target overrides.
 */
export declare function resolveConfig(config?: BasicCompactionConfig): ResolvedConfig;
/**
 * Merge the exact provider/model override over the validated default policy.
 * @param config - validated service defaults and override table.
 * @param target - exact durable provider/model route to match.
 * @returns detached immutable policy before model-capacity scaling.
 */
export declare function resolveTargetPolicy(config: ResolvedConfig, target: Pick<LlmCallConfig, 'provider' | 'model'>): ResolvedTargetPolicy;
/**
 * Scale one routed policy into concrete token budgets for its model capacity.
 * @param policy - merged policy for the exact routed target.
 * @param contextWindow - positive adapter-owned capacity for that target.
 * @returns detached immutable pressure and retention budgets.
 */
export declare function resolveCompactSpec(policy: ResolvedTargetPolicy, contextWindow: number): ResolvedCompactSpec;
//# sourceMappingURL=config.d.ts.map
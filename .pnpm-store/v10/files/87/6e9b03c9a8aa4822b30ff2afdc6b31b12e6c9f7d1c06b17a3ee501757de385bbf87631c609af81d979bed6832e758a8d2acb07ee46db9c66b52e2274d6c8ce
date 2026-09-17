/** Child LLM route selection for the subagent tool. */
import type { LlmRuntime } from '@deepseek-ai/dsh-llm';
import type { AgentOptions } from '@deepseek-ai/dsh-agent';
import z from '@deepseek-ai/schemastery';
/** One exact child LLM route authorized by a user setting. */
export interface AllowedModelRoute {
    /** Registered LLM provider id. */
    readonly provider: string;
    /** Provider-owned exact model id. */
    readonly model: string;
}
/** Schema shared by the Host setting and its deployment base. */
export declare const AllowedModelRouteSchema: z<AllowedModelRoute>;
/** Route-selection authority captured by one delegation definition. */
export interface ModelSelectionPolicy {
    /** Exact provider/model routes authorized for explicit selection. */
    readonly routes: readonly AllowedModelRoute[];
}
/**
 * Stable identity for one provider/model pair.
 * @param route - Exact provider/model route.
 * @returns Opaque key for equality checks.
 */
export declare function modelRouteKey(route: AllowedModelRoute): string;
/**
 * Reject malformed or duplicate route policy entries at a durable or configuration boundary.
 * @param routes - Candidate exact routes to validate.
 * @returns an assertion that the candidate is a validated exact-route array.
 */
export declare function assertAllowedModelRoutes(routes: unknown): asserts routes is readonly AllowedModelRoute[];
/** Model-facing child LLM route fields. */
export interface DelegationModelRequest {
    readonly provider?: string;
    readonly model?: string;
    readonly reasoning_effort?: string;
}
/**
 * Whether a call explicitly selects any child LLM value.
 * @param request - Model-facing route fields from the tool call.
 * @returns Whether at least one route or effort field is present.
 */
export declare function hasDelegationModelRequest(request: DelegationModelRequest): boolean;
/**
 * Merge model-supplied selection fields over configured child defaults.
 * Provider and model form one route and must be supplied together. Changing
 * that route without an effort clears the configured route-owned effort.
 * @param parentOptions - Current parent values that supply missing child values.
 * @param configured - Tool-instance child defaults.
 * @param request - Model-facing route override.
 * @param enabled - Whether this tool instance permits model-facing selection.
 * @returns Child Agent options, preserving omission when no layer contributes one.
 */
export declare function requestedAgentOptions(parentOptions: AgentOptions, configured: AgentOptions | undefined, request: DelegationModelRequest, enabled: boolean): AgentOptions | undefined;
/**
 * Enforce a settings-owned route list at the operation that creates the child.
 * Pure inheritance remains outside this policy because no model-facing choice
 * occurred; any explicit route or effort field must resolve to an allowed route.
 * @param policy - Selection authority captured for this Session.
 * @param parentOptions - Current parent values that supply missing child values.
 * @param requested - Effective child options after request/config merging.
 * @param request - Model-facing selection fields from the tool call.
 */
export declare function assertAllowedModelSelection(policy: ModelSelectionPolicy | undefined, parentOptions: AgentOptions, requested: AgentOptions | undefined, request: DelegationModelRequest): void;
/**
 * Whether configured Agent options require route validation before delegation.
 * @param options - Tool-instance child defaults.
 * @returns Whether configured provider, model, or effort values must be resolved.
 */
export declare function hasConfiguredLlmSelection(options: AgentOptions | undefined): boolean;
/**
 * Resolve an effective child route through its live adapter before the child is
 * created. The LLM runtime owns provider lookup, exact-model metadata, effort
 * validation, and adapter defaults.
 * @param llm - Live LLM runtime.
 * @param parentOptions - Current parent values whose compatible fields the child inherits.
 * @param requested - Per-child options after request/config merging.
 * @param signal - Tool-call cancellation signal.
 * @param inheritParentReasoningEffort - Whether an omitted effort may inherit from the parent route.
 */
export declare function preflightChildLlmRoute(llm: LlmRuntime, parentOptions: AgentOptions, requested: AgentOptions | undefined, signal: AbortSignal, inheritParentReasoningEffort?: boolean): Promise<void>;
//# sourceMappingURL=model-selection.d.ts.map
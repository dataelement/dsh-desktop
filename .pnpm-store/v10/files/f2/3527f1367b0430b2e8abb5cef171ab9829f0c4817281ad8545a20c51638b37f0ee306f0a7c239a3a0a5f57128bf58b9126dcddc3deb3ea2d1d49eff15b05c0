/** Durable per-session state for the user-controlled model-selection opt-in. */
import { z as zod } from 'zod';
import type { Session } from '@deepseek-ai/dsh-session';
import type SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection';
import { type AllowedModelRoute } from './model-selection.ts';
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        /**
         * Records that this session's delegation tool exposes child provider,
         * model, and reasoning-effort selection. Appended before the first model
         * request; absence means the fixed-route definition. Log-only: it carries
         * no `surfaceOp` and never enters model history.
         */
        'subagent/model-selection-policy': {
            /** Exact routes this Session may select explicitly for a child. */
            allowedModels: AllowedModelRoute[];
        };
    }
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        /** Exact routes authorized for child LLM selection, or null when disabled. */
        subagentModelSelectionPolicy: AllowedModelRoute[] | null;
    }
}
/** Host-only projection of the durable model-selection policy. */
export declare const subagentModelSelectionProjectionDefinition: {
    key: "subagentModelSelectionPolicy";
    stateVersion: number;
    stateSchema: zod.ZodType<AllowedModelRoute[] | null, unknown, zod.core.$ZodTypeInternals<AllowedModelRoute[] | null, unknown>>;
    init: () => null;
    apply: (policy: NoInfer<AllowedModelRoute[] | null>, event: import("@deepseek-ai/dsh-session").SessionEvent) => AllowedModelRoute[] | null;
};
/**
 * Read the exact route list captured for a model-selectable definition.
 * @param projections - registry that owns the policy projection.
 * @param session - session whose durable decision is read.
 * @returns a detached route list, or undefined for the fixed-route definition.
 */
export declare function subagentModelSelectionPolicy(projections: Pick<SessionProjectionRegistry, 'stateOf'>, session: Session): AllowedModelRoute[] | undefined;
/**
 * Append the route policy once, before its definition can reach a model request.
 * @param projections - registry that owns the policy projection.
 * @param session - session receiving the model-selectable definition.
 * @param allowedModels - exact routes the definition may select explicitly.
 */
export declare function recordSubagentModelSelection(projections: Pick<SessionProjectionRegistry, 'stateOf'>, session: Session, allowedModels: readonly AllowedModelRoute[]): void;
//# sourceMappingURL=model-selection-state.d.ts.map
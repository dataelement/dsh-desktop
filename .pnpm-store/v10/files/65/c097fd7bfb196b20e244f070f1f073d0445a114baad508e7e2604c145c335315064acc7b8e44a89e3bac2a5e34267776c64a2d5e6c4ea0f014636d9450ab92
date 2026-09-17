/**
 * Pure session projections for subagent identity (mode/label) and active-turn
 * duration.
 *
 * @module @deepseek-ai/dsh-subagent/projection
 */
import { z } from 'zod';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { SubagentIdentityProjection, SubagentTimingProjection } from './projection-types.ts';
/** Fold state for a subagent's latest timing snapshot. */
export interface TimingState {
    /** Milliseconds accumulated across completed post-descriptor turns. */
    settledMs: number;
    /** Current open interval kept paired inside the fold. */
    active?: {
        since: number;
        through: number;
    } | undefined;
    /** Latest pre-descriptor turn start, promoted when the child's own descriptor arrives. */
    pendingTurnStart?: number | undefined;
    /** Whether the fold has crossed a descriptor in this logical log. */
    descriptorSeen: boolean;
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        subagentTiming: TimingState;
        subagent: IdentityState;
    }
}
/**
 * Fold turn boundaries around the child's own durable descriptor.
 *
 * A fork seed may contain an ancestor descriptor and completed turns. Every
 * descriptor therefore resets the accumulated state; the healthy catalog
 * admits only a child with exactly one descriptor in its own suffix, making
 * the final reset the child's authoritative timing origin.
 */
export declare const subagentTimingProjectionDefinition: {
    key: "subagentTiming";
    stateSchema: z.ZodType<TimingState, unknown, z.core.$ZodTypeInternals<TimingState, unknown>>;
    init: () => {
        descriptorSeen: false;
        settledMs: number;
    };
    apply: (state: NoInfer<TimingState>, event: SessionEvent) => {
        /** Milliseconds accumulated across completed post-descriptor turns. */
        settledMs: number;
        /** Current open interval kept paired inside the fold. */
        active?: {
            since: number;
            through: number;
        } | undefined;
        /** Whether the fold has crossed a descriptor in this logical log. */
        descriptorSeen: boolean;
    };
    wire: {
        viewSchema: z.ZodType<SubagentTimingProjection, unknown, z.core.$ZodTypeInternals<SubagentTimingProjection, unknown>>;
        view: (state: NoInfer<TimingState>) => {
            active?: {
                since: number;
                through: number;
            };
            settledMs: number;
        };
    };
    stateVersion: number;
};
interface IdentityState {
    /** Identity from the last valid descriptor; absent before one, and after an invalid one. */
    identity?: SubagentIdentityProjection | undefined;
}
/**
 * Fold the durable mode/label identity from `subagent/descriptor` events,
 * last-wins: a fork seed may replay an ancestor's descriptor, and the child's
 * own descriptor must override it — the same reset discipline as
 * {@link subagentTimingProjectionDefinition}. A malformed or unknown-version
 * payload resets to the `null` sentinel instead of throwing, so a fork of a
 * healthy ancestor never inherits an identity its own descriptor failed to
 * establish — and the reset survives every JSON push frame, so a consumer
 * holding the earlier identity replaces it instead of keeping it stale;
 * `null` ⟺ no valid descriptor, with the causes deliberately undistinguished.
 */
export declare const subagentIdentityProjectionDefinition: {
    key: "subagent";
    stateSchema: z.ZodType<IdentityState, unknown, z.core.$ZodTypeInternals<IdentityState, unknown>>;
    init: () => {};
    apply: (state: NoInfer<IdentityState>, event: SessionEvent) => IdentityState;
    wire: {
        viewSchema: z.ZodNullable<z.ZodType<SubagentIdentityProjection, unknown, z.core.$ZodTypeInternals<SubagentIdentityProjection, unknown>>>;
        view: (state: NoInfer<IdentityState>) => SubagentIdentityProjection | null;
    };
    stateVersion: number;
};
export {};
//# sourceMappingURL=projection.d.ts.map
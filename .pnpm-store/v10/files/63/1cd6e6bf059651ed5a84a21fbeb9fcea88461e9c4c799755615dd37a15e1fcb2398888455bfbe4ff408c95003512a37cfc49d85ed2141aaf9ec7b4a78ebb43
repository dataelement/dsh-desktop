/** Goal activation observable that orders Remote reads and live activation events. */
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { GoalActivationChanged, GoalProjection, GoalView } from '@deepseek-ai/dsh-goal/client';
import type { GoalActivationSnapshot } from './slots.ts';
/** Live inputs for one Session's goal activation source. */
export interface GoalActivationDeps {
    /** Durable projection used to derive the current active goal ref. */
    readonly projection: HostObservable<GoalProjection | null | undefined>;
    /** Session snapshot; running flips trigger a fresh authoritative read. */
    readonly session: HostObservable<{
        readonly running: boolean;
    }>;
    /** Read the current live goal at call time. */
    readonly getGoal: () => Promise<RemoteResult<GoalView | undefined>>;
    /** Subscribe to activation edges after the transport delivers them. */
    readonly subscribeActivation: (listener: (goal: GoalActivationChanged['goal']) => void) => () => void;
    /** Refresh after a connection-generation reset. */
    readonly subscribeReset: (listener: () => void) => () => void;
}
/**
 * Create one registrant-private activation source. The source subscribes only
 * while a framework hook observes it, so unmount releases the Remote event,
 * projection, running-snapshot, and reset listeners.
 * @param deps - projection, session, Remote read, and live-event inputs.
 * @returns stable snapshot source consumed by `useGoalActivation`.
 */
export declare function createGoalActivationSource(deps: GoalActivationDeps): HostObservable<GoalActivationSnapshot>;
//# sourceMappingURL=activation-source.d.ts.map
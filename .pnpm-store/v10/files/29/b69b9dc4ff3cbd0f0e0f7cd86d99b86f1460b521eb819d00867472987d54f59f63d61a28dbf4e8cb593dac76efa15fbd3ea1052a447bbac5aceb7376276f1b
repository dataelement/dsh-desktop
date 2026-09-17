import type { Context } from '@deepseek-ai/cordis';
import type { ConversationViewBuilder, ConversationViewDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { TrajectoryConversationViewNode, TrajectorySnapshot } from './trajectory-contract.ts';
/** Stable empty target used until a Session has assembled Trajectory records. */
export declare const EMPTY_TRAJECTORY_SNAPSHOT: TrajectorySnapshot;
/** Simple keyed adapter retaining the old Trajectory snapshot and stage layout. */
export declare class TrajectorySnapshotBuilder implements ConversationViewBuilder<TrajectoryConversationViewNode, TrajectorySnapshot> {
    private readonly nodes;
    private readonly positions;
    private contributions;
    readonly empty: TrajectorySnapshot;
    replace(input: {
        readonly nodes: readonly TrajectoryConversationViewNode[];
    }): TrajectorySnapshot;
    apply(input: {
        readonly upserts: readonly TrajectoryConversationViewNode[];
    }): TrajectorySnapshot;
    private snapshot;
    private rebuildContributions;
}
/** Trajectory target factory preserving the existing stage-oriented view model. */
export declare const trajectoryViewDefinition: ConversationViewDefinition<TrajectoryConversationViewNode, TrajectorySnapshot>;
/**
 * Register the stage-oriented Trajectory target builder.
 *
 * @param ctx - Plugin context receiving the view Definition.
 */
export declare function registerTrajectoryConversationView(ctx: Context): void;
//# sourceMappingURL=trajectory-snapshot-builder.d.ts.map
import type { Context } from '@deepseek-ai/cordis';
import type { SystemPromptState } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { TrajectoryRequestHeaderState } from './trajectory-contract.ts';
/** Loaded system surface plus the latest request facts changed by an append or compaction. */
export interface TrajectorySystemMessageState extends SystemPromptState {
    /**
     * Latest synthetic header, retained across unrelated replacements. Only the
     * Context whose start seq equals this header's seq contributes a view Node.
     */
    readonly header?: TrajectoryRequestHeaderState;
}
/**
 * Register Trajectory system-prompt node and request-header facts.
 *
 * @param ctx - Plugin context receiving the Definitions.
 */
export declare function registerTrajectoryRequestHeaderDefinition(ctx: Context): void;
//# sourceMappingURL=trajectory-request-header-definition.d.ts.map
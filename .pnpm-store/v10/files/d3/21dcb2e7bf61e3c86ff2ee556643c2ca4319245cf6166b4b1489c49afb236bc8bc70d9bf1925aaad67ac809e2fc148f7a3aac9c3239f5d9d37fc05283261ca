/**
 * Strict Session projection of the Schedule domain's active reminder set.
 * @module @deepseek-ai/dsh-schedule/projection
 */
import { z } from 'zod';
import { SessionLogOffset } from '@deepseek-ai/dsh-session';
import type { SessionLogOffset as SessionLogOffsetType } from '@deepseek-ai/dsh-session';
import type { FoldedSchedules } from './domain.ts';
import type { ScheduleRecord } from './types.ts';
/** Persisted projection state: the immutable inherited cut plus the complete Schedule fold. */
export interface ScheduleProjectionState extends FoldedSchedules {
    readonly inheritedEventCount: SessionLogOffsetType;
}
/** Projection definition sharing the Schedule domain's strict transition authority. */
export declare const scheduleProjectionDefinition: {
    key: "schedule";
    stateSchema: z.ZodType<ScheduleProjectionState, unknown, z.core.$ZodTypeInternals<ScheduleProjectionState, unknown>>;
    init: (_header: import("@deepseek-ai/dsh-session").SessionHeader, inheritedEventCount: SessionLogOffset) => {
        inheritedEventCount: SessionLogOffset;
        active: never[];
        seenIds: never[];
    };
    apply: (state: NoInfer<ScheduleProjectionState>, event: import("@deepseek-ai/dsh-session").SessionEvent) => ScheduleProjectionState;
    wire: {
        viewSchema: z.ZodType<readonly ScheduleRecord[], unknown, z.core.$ZodTypeInternals<readonly ScheduleRecord[], unknown>>;
        view: (state: NoInfer<ScheduleProjectionState>) => readonly ScheduleRecord[];
    };
    stateVersion: number;
};
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        schedule: ScheduleProjectionState;
    }
}
//# sourceMappingURL=projection.d.ts.map
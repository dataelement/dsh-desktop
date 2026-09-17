/**
 * Strict Session projection of the Schedule domain's active reminder set.
 * @module @deepseek-ai/dsh-schedule/projection
 */
import { z } from 'zod';
import { SessionLogOffset } from '@deepseek-ai/dsh-session';
import { applyScheduleChanges, decodeScheduleChange } from "./domain.js";
const scheduleId = z.unknown().transform((value, context) => {
    try {
        const change = decodeScheduleChange({ version: 1, operation: 'delete', id: value });
        return change.id;
    }
    catch {
        context.addIssue({ code: 'custom', message: 'invalid Schedule id' });
        return z.NEVER;
    }
});
const scheduleRecord = z.unknown().transform((value, context) => {
    try {
        const change = decodeScheduleChange({ version: 1, operation: 'create', schedule: value });
        return change.schedule;
    }
    catch {
        context.addIssue({ code: 'custom', message: 'invalid Schedule record' });
        return z.NEVER;
    }
});
const scheduleRecords = z.array(scheduleRecord);
const scheduleProjectionStateSchema = z.object({
    inheritedEventCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).transform(SessionLogOffset),
    active: scheduleRecords,
    seenIds: z.array(scheduleId),
}).strict().superRefine((state, context) => {
    const seen = new Set(state.seenIds);
    if (seen.size !== state.seenIds.length) {
        context.addIssue({ code: 'custom', message: 'seen Schedule ids must be unique' });
    }
    const active = new Set();
    for (const record of state.active) {
        if (!seen.has(record.id)) {
            context.addIssue({ code: 'custom', message: 'every active Schedule id must have been seen' });
        }
        if (active.has(record.id)) {
            context.addIssue({ code: 'custom', message: 'active Schedule ids must be unique' });
        }
        active.add(record.id);
    }
});
/** Projection definition sharing the Schedule domain's strict transition authority. */
export const scheduleProjectionDefinition = {
    key: 'schedule',
    stateSchema: scheduleProjectionStateSchema,
    init: (_header, inheritedEventCount) => ({ inheritedEventCount, active: [], seenIds: [] }),
    apply: (state, event) => {
        if (event.seq < state.inheritedEventCount || event.type !== 'schedule/change')
            return state;
        return {
            inheritedEventCount: state.inheritedEventCount,
            ...applyScheduleChanges(state, [decodeScheduleChange(event.data)]),
        };
    },
    wire: {
        viewSchema: scheduleRecords,
        view: state => state.active,
    },
    stateVersion: 2,
};
//# sourceMappingURL=projection.js.map
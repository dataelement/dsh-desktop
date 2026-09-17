/**
 * Agent-scoped durable one-shot and fixed-rate reminders over the session event log.
 * @module @deepseek-ai/dsh-schedule
 */
import type { Context } from '@deepseek-ai/cordis';
export type * from './types.ts';
export { SCHEDULE_CHANGE_VERSION, MIN_EVERY_INTERVAL_SECONDS, ScheduleId, ScheduleInputError, ScheduleLogError, allocateScheduleId, createAfterScheduleRecord, createAtScheduleRecord, createEveryScheduleRecord, decodeScheduleChange, foldScheduleEvents, renderReminderFraming, renderEveryReminderBatchFraming, resolveEveryOccurrence, scheduleView, } from './domain.ts';
export { registerScheduleTools } from './tools.ts';
/** Cordis function-plugin name. */
export declare const name = "schedule";
/** Services required before future root agents can receive Schedule. */
export declare const inject: string[];
/** Install Schedule only for root agents published after this plugin loads. */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map
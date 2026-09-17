/**
 * Agent-scoped durable one-shot and fixed-rate reminders over the session event log.
 * @module @deepseek-ai/dsh-schedule
 */
import { scheduleProjectionDefinition } from "./projection.js";
import { ScheduleRuntime } from "./runtime.js";
import { registerScheduleTools } from "./tools.js";
export { SCHEDULE_CHANGE_VERSION, MIN_EVERY_INTERVAL_SECONDS, ScheduleId, ScheduleInputError, ScheduleLogError, allocateScheduleId, createAfterScheduleRecord, createAtScheduleRecord, createEveryScheduleRecord, decodeScheduleChange, foldScheduleEvents, renderReminderFraming, renderEveryReminderBatchFraming, resolveEveryOccurrence, scheduleView, } from "./domain.js";
export { registerScheduleTools } from "./tools.js";
/** Cordis function-plugin name. */
export const name = 'schedule';
/** Services required before future root agents can receive Schedule. */
export const inject = ['agents', 'sessions', 'tools', 'sessionPersistence'];
/** Install Schedule only for root agents published after this plugin loads. */
export function apply(ctx) {
    ctx.inject(['sessionProjections'], (projectionCtx) => {
        projectionCtx.sessionProjections.register(scheduleProjectionDefinition);
    });
    const runtimes = new Map();
    let stopping = false;
    ctx.effect(() => {
        const stopCreated = ctx.on('agent/created', ({ agent }) => {
            if (stopping || runtimes.has(agent) || !ctx.agents.roots().includes(agent))
                return;
            const runtime = new ScheduleRuntime(ctx, agent);
            const cleanup = agent.ctx.effect(() => {
                const disposeTools = registerScheduleTools(ctx, agent.ctx, agent, () => { runtime.requestDrive(); });
                const stopStatus = agent.ctx.on('agent/status', ({ status }) => {
                    if (status === 'idle' && agent.session.snapshotEvents().some(event => event.type === 'schedule/change')) {
                        runtime.requestDrive();
                    }
                });
                runtime.start();
                return async () => {
                    stopStatus();
                    disposeTools();
                    try {
                        await runtime.dispose();
                    }
                    finally {
                        if (runtimes.get(agent) === cleanup)
                            runtimes.delete(agent);
                    }
                };
            }, 'schedule.runtime()');
            runtimes.set(agent, cleanup);
        });
        return async () => {
            stopping = true;
            stopCreated();
            const cleanups = [...runtimes.values()];
            runtimes.clear();
            await Promise.allSettled(cleanups.map(cleanup => Promise.resolve(cleanup())));
        };
    }, 'schedule.lifecycle()');
}
//# sourceMappingURL=index.js.map
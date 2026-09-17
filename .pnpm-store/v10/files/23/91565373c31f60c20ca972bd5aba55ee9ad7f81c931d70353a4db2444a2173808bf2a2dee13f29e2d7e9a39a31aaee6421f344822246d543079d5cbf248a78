/**
 * Package-owned strict Schedule stream invariant.
 * @module @deepseek-ai/dsh-schedule/invariant
 */
import { foldScheduleEvents, ScheduleLogError } from "./domain.js";
const PACKAGE_NAME = '@deepseek-ai/dsh-schedule';
/** Cordis invariant-companion plugin name. */
export const name = 'tool-schedule-invariant';
/** Service required before reserving this package's invariant ownership. */
export const inject = ['invariants'];
/** Validate a complete exact-session stream under its fork suffix policy. */
function validate(events, fail) {
    try {
        foldScheduleEvents(events);
    }
    catch (error) {
        /* v8 ignore next -- foldScheduleEvents normalizes every rejected stream to ScheduleLogError. */
        if (!(error instanceof ScheduleLogError))
            throw error;
        fail(error.message);
    }
}
/* jscpd:ignore-start -- package companions share replay and dispatch plumbing */
/** Install replay and pre-append validation for the owned event stream. */
const install = Object.assign((ctx, fail) => {
    for (const session of ctx.sessions.list()) {
        validate(session.ownEvents(), fail);
    }
    ctx.on('session/created', (session) => {
        validate(session.ownEvents(), fail);
    }, { global: true });
    ctx.on('internal/dispatch', (_mode, eventName, args) => {
        if (eventName !== 'session/event')
            return;
        const [session, event] = args;
        if (event.type !== 'schedule/change')
            return;
        validate([...session.ownEvents(), event], fail);
    }, { global: true });
}, { inject: ['sessions'] });
/* jscpd:ignore-end */
/**
 * Register the package-owned invariant companion.
 * @param ctx - Cordis context carrying the invariant registry.
 * @returns Exact registration disposer after child setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map
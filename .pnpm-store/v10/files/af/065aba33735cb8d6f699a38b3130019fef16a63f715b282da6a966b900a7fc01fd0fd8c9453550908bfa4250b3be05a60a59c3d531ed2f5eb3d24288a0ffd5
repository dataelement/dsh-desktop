/** Package-owned durable plan-mode invariants. @module @deepseek-ai/dsh-plan-mode/invariant */
const PACKAGE_NAME = '@deepseek-ai/dsh-plan-mode';
/** Cordis companion plugin name. */
export const name = 'plan-mode-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * Validate one `plan/mode` event before it reaches the durable log.
 * `plan/mode` is a standalone whole-value event: an idle selection commits
 * between turns and a mid-turn selection commits at the step boundary, so
 * no turn-enclosure relation exists — only the payload shape is checkable.
 */
function validateEvent(event, fail) {
    if (event.type !== 'plan/mode')
        return;
    const active = event.data.active;
    if (typeof active !== 'boolean') {
        fail(`plan/mode carries invalid active state ${JSON.stringify(active)}; expected a boolean`);
    }
}
/** Install validation for loaded and newly appended plan-mode state. */
const install = Object.assign((ctx, fail) => {
    const seed = (session) => {
        for (const event of session.snapshotEvents())
            validateEvent(event, fail);
    };
    for (const session of ctx.sessions.list())
        seed(session);
    ctx.on('session/created', (session) => { seed(session); }, { global: true });
    ctx.on('internal/dispatch', (_mode, eventName, args) => {
        if (eventName !== 'session/event')
            return;
        const [, event] = args;
        validateEvent(event, fail);
    }, { global: true });
}, { inject: ['sessions'] });
/**
 * Register the plan-mode invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map
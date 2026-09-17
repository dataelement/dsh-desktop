/** Package-owned permission-preset event invariants. @module @deepseek-ai/dsh-permission-presets/invariant */
const PACKAGE_NAME = '@deepseek-ai/dsh-permission-presets';
/** Cordis companion plugin name. */
export const name = 'permission-presets-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/** Validate the package-owned event fields and ignore unrelated events. */
function validateEvent(ctx, event, fail) {
    if (event.type === 'permission/preset' && !ctx.permissionPresets.names.includes(event.data.preset)) {
        fail(`permission/preset names unknown preset ${JSON.stringify(event.data.preset)}`);
    }
}
/** Install validation that loaded and newly appended preset events remain resolvable. */
const install = Object.assign((ctx, fail) => {
    for (const session of ctx.sessions.list()) {
        for (const event of session.snapshotEvents())
            validateEvent(ctx, event, fail);
    }
    ctx.on('internal/dispatch', (_mode, eventName, args) => {
        if (eventName !== 'session/event')
            return;
        const event = args[1];
        validateEvent(ctx, event, fail);
    }, { global: true });
}, { inject: ['permissionPresets', 'sessions'] });
/**
 * Register the permission invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map
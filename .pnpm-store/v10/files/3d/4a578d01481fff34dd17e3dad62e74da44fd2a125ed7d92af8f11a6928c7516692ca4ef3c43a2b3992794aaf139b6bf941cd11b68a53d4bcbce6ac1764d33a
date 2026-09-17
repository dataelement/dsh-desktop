/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-authorization`.
 * @module @deepseek-ai/dsh-authorization/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-authorization';
/** Cordis companion plugin name. */
export const name = 'authorization-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * Install the single-flight release contract: `authorization/settled` names a
 * finished attempt, and the seam admits one attempt per key, so the key must
 * already be free when the event fires. A slot still held at settlement is
 * unrecoverable — every later `begin()` for that key is refused as
 * `ALREADY_IN_FLIGHT` until the process restarts — and it is invisible from the
 * outside, because a wedged key looks exactly like a busy one.
 */
const install = (ctx, fail) => {
    ctx.on('authorization/settled', (key) => {
        const authorization = ctx.get('authorization');
        if (authorization === undefined) {
            fail(`authorization/settled for "${key}" emitted without a live authorization service`);
            return;
        }
        // A flow withdrawn during its own attempt settles with nothing left to
        // describe, which is the disposer's documented behavior rather than a leak.
        if (authorization.describe(key)?.inFlight === true) {
            fail(`authorization/settled for "${key}" left the key in flight, wedging every later attempt`);
        }
    });
};
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map
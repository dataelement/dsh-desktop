/** Package-owned relationship invariant for webhook-origin prompt admission. */
const PACKAGE_NAME = '@deepseek-ai/dsh-webhook';
/** Cordis invariant-companion plugin name. */
export const name = 'webhook-invariant';
/** Registry required before reserving this package's invariant ownership. */
export const inject = ['invariants'];
/** Verify that one webhook-origin message already belongs to its cwd Workspace. */
const install = Object.assign(function installWebhookMessages(ctx, fail) {
    ctx.on('internal/dispatch', (_mode, eventName, args) => {
        if (eventName !== 'session/event')
            return;
        const [session, event] = args;
        if (event.type !== 'agent/inbox/spliced')
            return;
        const webhookMessages = event.data.inserted.filter(message => message.source.kind === 'webhook');
        if (webhookMessages.length === 0)
            return;
        const cwd = session.header.cwd;
        if (cwd === undefined)
            return fail(`webhook Session "${session.id}" has no cwd`);
        const owners = ctx.workspaceRegistry.list().filter(workspace => workspace.sessionIds.includes(session.id));
        if (owners.length !== 1) {
            return fail(`webhook Session "${session.id}" belongs to ${owners.length} Workspaces at prompt admission`);
        }
        if (owners[0]?.path !== cwd) {
            fail(`webhook Session "${session.id}" cwd ${JSON.stringify(cwd)} differs from its Workspace path`);
        }
    }, { global: true });
}, {
    inject: ['workspaceRegistry'],
});
/**
 * Register this package's relationship invariant.
 * @param ctx - Cordis context carrying the invariant registry.
 * @returns the invariant registration disposer.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map
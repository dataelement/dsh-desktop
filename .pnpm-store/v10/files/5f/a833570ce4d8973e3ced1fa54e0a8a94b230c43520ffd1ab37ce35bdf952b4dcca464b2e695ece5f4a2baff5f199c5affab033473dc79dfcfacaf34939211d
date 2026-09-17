/** Client Session object layer, Agent scopes, and Remote lifecycle wiring. */
import { createSessionControlStream } from "./transport.js";
import { ClientSessions } from "./sessions/service.js";
export { createSessionControlStream, SessionEventStream, SESSION_SEARCH_RESULT_LIMIT, SESSION_SEARCH_SNIPPET_MAX_CODE_POINTS, } from "./transport.js";
export { createScope, scopeOf } from "./scope.js";
export { SessionCreateError, SessionForkError } from "./sessions/service.js";
export { MutableSessionEventSource } from "./contract/events.js";
/** Required Remote and Context projection services. */
export const inject = [
    'connection',
    'fileUpload',
    'typert',
    'remote',
    'remote.commands',
    'remote.session',
    'remote.subagents',
];
/**
 * Install Client Session state and its reconnecting control stream.
 * @param ctx - Client Cordis context.
 */
export function apply(ctx) {
    const remotes = ctx.remote;
    const sessions = new ClientSessions(ctx, remotes);
    ctx.remote.$on('api-session/added', (summary) => { sessions.handleSessionAdded(summary); });
    ctx.remote.$on('api-session/removed', (sessionId) => { sessions.handleSessionRemoved(sessionId); });
    ctx.remote.$on('api-session/status', (sessionId, running) => {
        sessions.handleSessionStatus(sessionId, running);
    });
    ctx.remote.$on('api-session/activity', (sessionId, updatedAt) => {
        sessions.handleSessionActivity(sessionId, updatedAt);
    });
    ctx.remote.$on('api-session/error', (sessionId, message) => {
        sessions.handleSessionError(sessionId, message);
    });
    const control = createSessionControlStream(remotes, {
        accept: (frame) => { sessions.handleControlFrame(frame); },
        failed: (error) => { console.error('[session-controller] control stream failed:', error); },
    });
    control.start();
    ctx.on('connection/reset', () => { sessions.handleConnected(); });
    if (ctx.remote.$host.home !== undefined)
        sessions.handleConnected();
    ctx.typert.contexts.registerClient('agent', {
        identity: candidate => sessions.scopeOf(candidate),
        resolve: sessionId => sessions.resolveAgentScope(sessionId),
    });
    ctx.effect(() => async () => { await control.dispose(); }, 'session-controller.client.control');
}
//# sourceMappingURL=index.js.map
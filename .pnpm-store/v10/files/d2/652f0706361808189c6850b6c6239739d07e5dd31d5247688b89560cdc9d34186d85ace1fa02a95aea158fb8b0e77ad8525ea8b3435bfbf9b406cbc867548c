/**
 * Incremental session-log contribution for official DeepSeek LLM API requests.
 * Accepted sequence watermarks live in the canonical log, so restart recovery
 * can conservatively resend uncertain tails without maintaining another store.
 * @module @deepseek-ai/dsh-session-log-deepseek
 */
import z from '@deepseek-ai/schemastery';
import { brandString } from '@deepseek-ai/dsh-brand';
import { KNOWN_SESSION_EVENT_TYPES, SessionLogOffset, SessionSeq } from '@deepseek-ai/dsh-session';
/** Cordis plugin name. */
export const name = 'session-log-deepseek';
/** Services required to resolve sessions and contribute the provider request field. */
export const inject = ['deepseekLlmApiExtensions', 'sessions'];
/** Validated Session-log request contribution configuration. */
export const Config = z.object({
    enabled: z.boolean().default(false),
});
const acceptanceFolds = new WeakMap();
/** Translate logical Session metadata to raw external request fields. */
function wireHeader(session) {
    const header = session.header;
    return {
        version: header.version,
        id: String(header.id),
        createdAt: header.createdAt,
        ...header.cwd === undefined ? {} : { cwd: header.cwd },
        ...header.parentSession === undefined ? {} : { parentSession: String(header.parentSession) },
        ...header.isSeeded ? { seedLength: Number(session.inheritedEventCount) } : {},
        ...header.origin === undefined ? {} : { origin: header.origin },
        ...header.delegationDepth === undefined ? {} : { delegationDepth: header.delegationDepth },
        ...header.agentPreset === undefined ? {} : { agentPreset: header.agentPreset },
    };
}
/** Translate compile-time sequence brands to raw numeric request fields. */
function wireEvent(event) {
    const common = {
        seq: Number(event.seq),
        time: event.time,
        data: event.data,
        ...event.ignorable === undefined ? {} : { ignorable: event.ignorable },
    };
    switch (event.type) {
        case 'system/message':
        case 'user/message':
        case 'tool/result':
            return {
                ...common,
                type: event.type,
                surfaceOp: wireSurfaceOp(event.surfaceOp),
                ...event.sourceEventSeqs === undefined ? {} : { sourceEventSeqs: event.sourceEventSeqs.map(Number) },
            };
        case 'assistant/message':
            return { ...common, type: event.type, surfaceOp: wireSurfaceOp(event.surfaceOp) };
        default: {
            // Restored unknown ignorable records are opaque, not current surface events.
            if (!KNOWN_SESSION_EVENT_TYPES.has(event.type) && event.ignorable === true) {
                const opaque = event;
                return {
                    ...common, type: event.type, ignorable: true,
                    ...opaque.surfaceOp === undefined ? {} : { surfaceOp: opaque.surfaceOp },
                    ...opaque.sourceEventSeqs === undefined ? {} : { sourceEventSeqs: opaque.sourceEventSeqs },
                };
            }
            return { ...common, type: event.type };
        }
    }
}
function wireSurfaceOp(op) {
    return op === 'append'
        ? op
        : { op: 'replace', startSeq: Number(op.startSeq), endSeq: Number(op.endSeq) };
}
/**
 * Highest confirmed sequence for this exact Session format generation.
 * @param session - canonical log whose matching acceptance events are folded.
 * @returns greatest accepted sequence, or `-1` before any accepted request.
 */
export function acceptedThrough(session) {
    const previous = acceptanceFolds.get(session);
    let throughSeq = previous?.throughSeq ?? -1;
    const length = session.seq;
    const start = previous?.scannedEvents ?? SessionLogOffset(0);
    for (let index = start; index < length; index++) {
        const event = session.eventAt(SessionSeq(index));
        if (event === undefined) {
            throw new Error(`session-log-deepseek: missing event ${String(index)} below captured length ${String(length)}`);
        }
        if (event.type !== 'session-log-deepseek/delivery-accepted')
            continue;
        const acceptedFormatVersion = event.data.sessionFormatVersion ?? 0;
        if (!Number.isSafeInteger(acceptedFormatVersion)
            || acceptedFormatVersion < 0
            || Object.is(acceptedFormatVersion, -0)) {
            throw new Error(`session-log-deepseek: malformed acceptance format version at seq ${event.seq}`);
        }
        if (acceptedFormatVersion !== session.header.version)
            continue;
        let acceptedSeq;
        try {
            acceptedSeq = SessionSeq(event.data.throughSeq);
        }
        catch {
            throw new Error(`session-log-deepseek: malformed acceptance watermark at seq ${event.seq}`);
        }
        if (typeof event.data.sessionId !== 'string' || event.data.sessionId.length === 0
            || acceptedSeq >= event.seq) {
            throw new Error(`session-log-deepseek: malformed acceptance watermark at seq ${event.seq}`);
        }
        if (event.data.sessionId !== session.id)
            continue;
        if (acceptedSeq > throughSeq)
            throughSeq = acceptedSeq;
    }
    acceptanceFolds.set(session, { scannedEvents: length, throughSeq });
    return throughSeq;
}
/**
 * Register the incremental `dsh_session_log` request contribution when enabled.
 * @param ctx - plugin context carrying Sessions and the DeepSeek request-extension registry.
 * @param config - validated opt-in configuration.
 */
export function apply(ctx, config) {
    if (config.enabled !== true)
        return;
    ctx.deepseekLlmApiExtensions.register('dsh_session_log', {
        prepare: (request) => {
            // TODO: Define an explicit wire result for direct or stale-session calls if they become a supported product path.
            if (request.sessionId === undefined)
                return undefined;
            const session = ctx.sessions.get(brandString(request.sessionId));
            if (session === undefined)
                return undefined;
            const afterSeq = acceptedThrough(session);
            const snapshot = session.snapshotEvents();
            const throughSeq = snapshot.at(-1)?.seq;
            if (throughSeq === undefined)
                return undefined;
            const suffix = session.snapshotEvents(SessionLogOffset(afterSeq + 1));
            const value = {
                version: 1,
                sessionFormatVersion: session.header.version,
                session: wireHeader(session),
                afterSeq: Number(afterSeq),
                throughSeq: Number(throughSeq),
                events: suffix.map(wireEvent),
            };
            return {
                value,
                accept: () => {
                    session.append('session-log-deepseek/delivery-accepted', {
                        sessionId: session.id,
                        sessionFormatVersion: session.header.version,
                        throughSeq,
                    });
                    // TODO: Add an immediate lightweight checkpoint if duplicate replay after a 2xx crash window becomes unacceptable.
                },
            };
        },
    });
}
//# sourceMappingURL=index.js.map
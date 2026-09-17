/** Wire messages for Gateway-owned Remote streams and event-result RPCs. */
/** Exact WebSocket route carrying every Typert Remote stream. */
export const REMOTE_STREAM_MUX_PATH = '/api/remote.mux';
/** Gateway-internal logical stream carrying application-selected Cordis events. */
export const REMOTE_EVENT_STREAM_ENDPOINT = '$events';
/** Gateway-internal unary endpoint returning one Client Remote Event outcome. */
export const REMOTE_EVENT_RESULT_ENDPOINT = '$events/result';
/** Empty standard Remote payload used to open the forwarded-event stream. */
export const REMOTE_EVENT_STREAM_PAYLOAD = { args: {} };
/** Discriminator for the first item proving the Host event source is ready. */
export const REMOTE_EVENT_STREAM_READY = { type: 'ready' };
/**
 * Parse one result sent through the Client's `$events/result` HTTP RPC.
 * @param value - untrusted result payload.
 * @returns validated event correlation and outcome fields.
 */
export function parseRemoteEventResult(value) {
    if (!isRecord(value)
        || !exactKeys(value, ['clientId', 'eventId', 'outcome'])
        || !isRemoteEventClientId(value.clientId)
        || !isRemoteEventId(value.eventId)
        || !isRecord(value.outcome)) {
        throw new Error('api gateway: invalid Remote event result');
    }
    const outcome = value.outcome;
    if (outcome.kind === 'next' && exactKeys(outcome, ['kind'])) {
        return {
            clientId: value.clientId,
            eventId: value.eventId,
            outcome: { kind: 'next' },
        };
    }
    if (outcome.kind === 'result'
        && (exactKeys(outcome, ['kind']) || exactKeys(outcome, ['kind', 'value']))
        && (!Object.hasOwn(outcome, 'value') || isRemoteJsonValue(outcome.value))) {
        return {
            clientId: value.clientId,
            eventId: value.eventId,
            outcome: Object.hasOwn(outcome, 'value')
                ? { kind: 'result', value: outcome.value }
                : { kind: 'result' },
        };
    }
    if (outcome.kind === 'rejected'
        && exactKeys(outcome, ['kind', 'error'])) {
        return {
            clientId: value.clientId,
            eventId: value.eventId,
            outcome: { kind: 'rejected', error: parseRemoteEventRejection(outcome.error) },
        };
    }
    throw new Error('api gateway: invalid Remote event result');
}
/**
 * Remove the direct Agent and cancellation fields from one waterfall request.
 * @param value - request object before the waterfall's `next` callback.
 * @param subject - Agent used by the Cordis scope carrier.
 * @returns JSON-safe request fields and the optional Host cancellation signal.
 */
export function projectRemoteEventRequest(value, subject) {
    if (!isPlainRecord(value) || !Object.hasOwn(value, 'agent') || value.agent !== subject) {
        throw new TypeError('api gateway: Remote event request must carry its scoped Agent directly');
    }
    const signal = value.signal;
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
        throw new TypeError('api gateway: Remote event request signal must be an AbortSignal');
    }
    const request = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
        if (key === 'agent' || key === 'signal')
            continue;
        const descriptor = typeof key === 'string' ? Object.getOwnPropertyDescriptor(value, key) : undefined;
        if (typeof key !== 'string' || descriptor?.enumerable !== true) {
            throw new TypeError('api gateway: Remote event request has a non-JSON property');
        }
        request[key] = Reflect.get(value, key);
    }
    if (!isRemoteJsonValue(request)) {
        throw new TypeError('api gateway: Remote event request is not lossless JSON data');
    }
    return {
        request,
        ...(signal === undefined ? {} : { signal }),
    };
}
/**
 * Project an arbitrary rejection to stable, JSON-safe error fields.
 * @param reason - value thrown or rejected by a Client listener.
 * @returns wire-safe rejection fields.
 */
export function projectRemoteEventRejection(reason) {
    const record = typeof reason === 'object' && reason !== null ? reason : undefined;
    const name = stringProperty(record, 'name') ?? 'Error';
    const message = stringProperty(record, 'message') ?? String(reason);
    const code = stringProperty(record, 'code');
    const details = record === undefined ? undefined : Reflect.get(record, 'details');
    return {
        name,
        message,
        ...(code === undefined ? {} : { code }),
        ...(details === undefined || !isRemoteJsonValue(details) ? {} : { details }),
    };
}
/**
 * Recreate a Client rejection for the Host continuation.
 * @param rejection - validated wire-safe error fields.
 * @returns an Error preserving the remote name, code, and JSON-safe details.
 */
export function restoreRemoteEventRejection(rejection) {
    const error = new Error(rejection.message);
    error.name = rejection.name;
    if (rejection.code !== undefined)
        error.code = rejection.code;
    if (rejection.details !== undefined)
        error.details = rejection.details;
    return error;
}
/**
 * Test whether a value crosses JSON transport without coercion or omission.
 * @param value - candidate boundary value.
 * @returns whether the value is losslessly JSON-compatible.
 */
export function isRemoteJsonValue(value) {
    return visitJsonValue(value, new Set());
}
/**
 * Recognize a non-empty Remote Event correlation id at a wire boundary.
 * @param value - untrusted wire value.
 * @returns whether the value is a valid Remote Event id.
 */
export function isRemoteEventId(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * Recognize a non-empty Remote Event Client id at a wire boundary.
 * @param value - untrusted wire value.
 * @returns whether the value identifies one event-stream generation.
 */
export function isRemoteEventClientId(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * Recognize the direct Agent identity used by a scoped Remote Event.
 * @param value - untrusted wire value.
 * @returns whether the value is a non-empty Agent identity.
 */
export function isRemoteEventAgentId(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * Parse and validate one browser-to-Host text message.
 * @param text - complete WebSocket text message.
 * @returns the validated logical-stream request.
 */
export function parseRemoteStreamClientMessage(text) {
    return parseMessage(text, (value) => {
        if (value.type === 'cancel' && exactKeys(value, ['type', 'streamId']) && validId(value.streamId)) {
            return value;
        }
        if (value.type === 'open'
            && exactKeys(value, ['type', 'streamId', 'endpoint', 'payload'])
            && validId(value.streamId)
            && typeof value.endpoint === 'string'
            && value.endpoint.length > 0) {
            return value;
        }
        throw new Error('api gateway: invalid Remote stream client message');
    });
}
/**
 * Parse and validate one Host-to-browser text message.
 * @param text - complete WebSocket text message.
 * @returns the validated logical-stream frame.
 */
export function parseRemoteStreamServerMessage(text) {
    return parseMessage(text, (value) => {
        if (value.type === 'item'
            && (exactKeys(value, ['type', 'streamId']) || exactKeys(value, ['type', 'streamId', 'value']))
            && validId(value.streamId)) {
            return value;
        }
        if (value.type === 'end' && exactKeys(value, ['type', 'streamId']) && validId(value.streamId)) {
            return value;
        }
        if (value.type === 'error'
            && exactKeys(value, ['type', 'streamId', 'error'])
            && validId(value.streamId)
            && isRecord(value.error)
            && exactKeys(value.error, ['code', 'message', 'details'])
            && typeof value.error.code === 'string'
            && typeof value.error.message === 'string'
            && isRecord(value.error.details)) {
            return value;
        }
        throw new Error('api gateway: invalid Remote stream server message');
    });
}
function parseMessage(text, validate) {
    let decoded;
    try {
        decoded = JSON.parse(text);
    }
    catch (cause) {
        throw new Error('api gateway: Remote stream message is not JSON', { cause });
    }
    if (!isRecord(decoded))
        throw new Error('api gateway: Remote stream message must be an object');
    return validate(decoded);
}
function isRecord(value) {
    return typeof value === 'object'
        && value !== null
        && !Array.isArray(value);
}
function isPlainRecord(value) {
    if (!isRecord(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, expected) {
    const keys = Reflect.ownKeys(value);
    return keys.length === expected.length && expected.every(key => Object.hasOwn(value, key));
}
function validId(value) {
    return typeof value === 'string' && value.length > 0;
}
function parseRemoteEventRejection(value) {
    if (!isRecord(value)
        || !hasOnlyKeys(value, ['name', 'message'], ['code', 'details'])
        || typeof value.name !== 'string'
        || value.name.length === 0
        || typeof value.message !== 'string'
        || (Object.hasOwn(value, 'code') && typeof value.code !== 'string')
        || (Object.hasOwn(value, 'details') && !isRemoteJsonValue(value.details))) {
        throw new Error('api gateway: invalid Remote event rejection');
    }
    return {
        name: value.name,
        message: value.message,
        ...(typeof value.code === 'string' ? { code: value.code } : {}),
        ...(Object.hasOwn(value, 'details') ? { details: value.details } : {}),
    };
}
function hasOnlyKeys(value, required, optional) {
    const keys = Reflect.ownKeys(value);
    return required.every(key => Object.hasOwn(value, key))
        && keys.every(key => typeof key === 'string' && (required.includes(key) || optional.includes(key)));
}
function stringProperty(value, key) {
    if (value === undefined)
        return undefined;
    const candidate = Reflect.get(value, key);
    return typeof candidate === 'string' ? candidate : undefined;
}
function visitJsonValue(value, ancestors) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean')
        return true;
    if (typeof value === 'number')
        return Number.isFinite(value) && !Object.is(value, -0);
    if (typeof value !== 'object')
        return false;
    if (ancestors.has(value))
        return false;
    ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            if (Object.getPrototypeOf(value) !== Array.prototype
                || Reflect.ownKeys(value).length !== value.length + 1)
                return false;
            for (let index = 0; index < value.length; index++) {
                if (!Object.hasOwn(value, index) || !visitJsonValue(value[index], ancestors))
                    return false;
            }
            return true;
        }
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null)
            return false;
        for (const key of Reflect.ownKeys(value)) {
            if (typeof key !== 'string')
                return false;
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (descriptor?.enumerable !== true || !visitJsonValue(Reflect.get(value, key), ancestors))
                return false;
        }
        return true;
    }
    finally {
        ancestors.delete(value);
    }
}
//# sourceMappingURL=stream-protocol.js.map
import { RequestError, isNotificationMessage, isRequestMessage, isResponseBatch, isResponseMessage, isResponseShapedMessage, } from "./jsonrpc.js";
import { zInitializeRequest as zV1InitializeRequest } from "./schema/zod.gen.js";
import { zInitializeRequest as zV2InitializeRequest } from "./v2/schema/zod.gen.js";
const INITIALIZE_METHOD = "initialize";
const PROTOCOL_V1 = 1;
const PROTOCOL_V2 = 2;
const MAX_PROTOCOL_VERSION = 0xffff;
/**
 * Routes a client connection to a version-specific ACP agent implementation,
 * including the experimental draft ACP v2 API.
 *
 * The router consumes the first wire item, which must be an `initialize`
 * request or a single-entry batch containing one. It selects the highest
 * configured protocol version that does not exceed the client's requested
 * version. Only the initialize params and optional batch framing are
 * normalized; every later wire item is forwarded unchanged.
 *
 * @experimental
 */
export class AgentProtocolRouter {
    v1;
    v2;
    /** Configures the ACP v1 agent implementation. */
    withV1(agent) {
        this.v1 = agent;
        return this;
    }
    /**
     * Configures the experimental draft ACP v2 agent implementation.
     *
     * @experimental
     */
    withV2(agent) {
        this.v2 = agent;
        return this;
    }
    /** Routes one ACP transport connection. */
    connect(stream, options = {}) {
        const lifecycle = new RoutedAgentConnection(options.deferConnectHandlers !== true);
        void this.route(stream, lifecycle).catch(async (error) => {
            try {
                await abortWritable(stream.writable, error);
            }
            catch {
                // The routing failure already owns shutdown. An output abort failure
                // must not keep the connection lifecycle open or escape unobserved.
            }
            finally {
                lifecycle.finish();
            }
        });
        return lifecycle;
    }
    async route(stream, lifecycle) {
        const reader = stream.readable.getReader();
        let first;
        try {
            first = await reader.read();
        }
        catch (error) {
            reader.releaseLock();
            throw error;
        }
        if (first.done) {
            reader.releaseLock();
            await closeWritable(stream.writable);
            lifecycle.finish();
            return;
        }
        const firstMessage = first.value;
        if (shouldCloseWithoutResponse(firstMessage)) {
            await closeWithoutResponse(reader, stream.writable, RequestError.invalidRequest("first ACP message must be an initialize request"));
            lifecycle.finish();
            return;
        }
        let batchedInitialize = false;
        let message = firstMessage;
        if (Array.isArray(firstMessage)) {
            if (firstMessage.length === 1 &&
                isRequestMessage(firstMessage[0]) &&
                firstMessage[0].method === INITIALIZE_METHOD) {
                batchedInitialize = true;
                message = firstMessage[0];
            }
            else {
                await rejectInitialize(reader, stream.writable, null, RequestError.invalidRequest("first ACP message must be an initialize request"));
                lifecycle.finish();
                return;
            }
        }
        if (!isRequestMessage(message)) {
            await rejectInitialize(reader, stream.writable, null, RequestError.invalidRequest("first ACP message must be an initialize request"));
            lifecycle.finish();
            return;
        }
        if (message.method !== INITIALIZE_METHOD) {
            await rejectInitialize(reader, stream.writable, message.id, RequestError.invalidRequest("first ACP request must be initialize"), batchedInitialize);
            lifecycle.finish();
            return;
        }
        if (!isJsonObject(message.params)) {
            await rejectInitialize(reader, stream.writable, message.id, invalidProtocolVersion(), batchedInitialize);
            lifecycle.finish();
            return;
        }
        const requested = message.params["protocolVersion"];
        if (!isProtocolVersion(requested)) {
            await rejectInitialize(reader, stream.writable, message.id, invalidProtocolVersion(), batchedInitialize);
            lifecycle.finish();
            return;
        }
        const selected = this.highestCompatible(requested);
        if (!selected) {
            await rejectInitialize(reader, stream.writable, message.id, RequestError.invalidRequest(`unsupported ACP protocol version ${requested}; this endpoint supports ${this.supportedDescription()}`), batchedInitialize);
            lifecycle.finish();
            return;
        }
        let params;
        try {
            params = rewriteInitializeParams(message.params, requested, selected);
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            await rejectInitialize(reader, stream.writable, message.id, RequestError.invalidParams(`invalid initialize params: ${detail}`), batchedInitialize);
            lifecycle.finish();
            return;
        }
        const initialize = { ...message, params };
        const routedInitialize = batchedInitialize && selected === PROTOCOL_V2
            ? [initialize]
            : initialize;
        const routedStream = {
            readable: routedReadable(reader, routedInitialize, lifecycle),
            writable: batchedInitialize && selected === PROTOCOL_V1
                ? batchInitializeResponseWritable(stream.writable, message.id)
                : stream.writable,
        };
        const agent = selected === PROTOCOL_V2 ? this.v2 : this.v1;
        if (!agent) {
            throw new Error("selected ACP protocol implementation is not configured");
        }
        try {
            const connection = agent.connect(routedStream, {
                deferConnectHandlers: true,
            });
            lifecycle.attach(connection);
        }
        catch (error) {
            try {
                await reader.cancel(error);
            }
            catch {
                // Preserve the connector failure as the routing error.
            }
            finally {
                reader.releaseLock();
            }
            throw error;
        }
    }
    highestCompatible(requested) {
        if (this.v2 && requested >= PROTOCOL_V2) {
            return PROTOCOL_V2;
        }
        if (this.v1 && requested >= PROTOCOL_V1) {
            return PROTOCOL_V1;
        }
        return undefined;
    }
    supportedDescription() {
        if (this.v1 && this.v2) {
            return "ACP protocol versions 1 and 2";
        }
        if (this.v1) {
            return "ACP protocol version 1";
        }
        if (this.v2) {
            return "ACP protocol version 2";
        }
        return "no ACP protocol versions";
    }
}
function shouldCloseWithoutResponse(message) {
    if (!Array.isArray(message)) {
        return isNotificationMessage(message) || isResponseShapedMessage(message);
    }
    return (message.length > 0 &&
        (isResponseBatch(message) ||
            message.every((item) => isNotificationMessage(item) || isResponseMessage(item))));
}
/**
 * Creates an empty agent protocol router with experimental ACP v2 support.
 *
 * @experimental
 */
export function agentProtocolRouter() {
    return new AgentProtocolRouter();
}
class RoutedAgentConnection {
    closed;
    resolveClosed = () => { };
    isFinished = false;
    startRequested;
    connectHandlersStarted = false;
    selected;
    constructor(startConnectHandlers) {
        this.startRequested = startConnectHandlers;
        this.closed = new Promise((resolve) => {
            this.resolveClosed = resolve;
        });
    }
    startConnectHandlers() {
        this.startRequested = true;
        this.maybeStartConnectHandlers();
    }
    attach(connection) {
        this.selected = asAgentConnectionLifecycle(connection);
        this.maybeStartConnectHandlers();
        if (this.selected?.closed) {
            void this.selected.closed.then(() => this.finish(), () => this.finish());
        }
    }
    finish() {
        if (this.isFinished) {
            return;
        }
        this.isFinished = true;
        this.resolveClosed();
    }
    maybeStartConnectHandlers() {
        if (!this.startRequested ||
            this.connectHandlersStarted ||
            !this.selected?.startConnectHandlers) {
            return;
        }
        this.connectHandlersStarted = true;
        this.selected.startConnectHandlers();
    }
}
function asAgentConnectionLifecycle(value) {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }
    const lifecycle = value;
    if (lifecycle.closed === undefined &&
        lifecycle.startConnectHandlers === undefined) {
        return undefined;
    }
    return lifecycle;
}
function routedReadable(source, initialize, lifecycle) {
    let next = initialize;
    let released = false;
    const release = () => {
        if (released) {
            return;
        }
        released = true;
        source.releaseLock();
    };
    return new ReadableStream({
        async pull(controller) {
            if (next !== undefined) {
                controller.enqueue(next);
                next = undefined;
                return;
            }
            try {
                const result = await source.read();
                if (result.done) {
                    release();
                    controller.close();
                    lifecycle.finish();
                    return;
                }
                controller.enqueue(result.value);
            }
            catch (error) {
                release();
                controller.error(error);
                lifecycle.finish();
            }
        },
        async cancel(reason) {
            try {
                await source.cancel(reason);
            }
            finally {
                release();
                lifecycle.finish();
            }
        },
    });
}
function batchInitializeResponseWritable(destination, initializeId) {
    let responseFramed = false;
    return new WritableStream({
        async write(message) {
            let outgoing = message;
            if (!responseFramed &&
                !Array.isArray(message) &&
                isResponseShapedMessage(message) &&
                "id" in message &&
                message.id === initializeId) {
                responseFramed = true;
                outgoing = [message];
            }
            const writer = destination.getWriter();
            try {
                await writer.write(outgoing);
            }
            finally {
                writer.releaseLock();
            }
        },
        close: () => closeWritable(destination),
        abort: (reason) => abortWritable(destination, reason),
    });
}
async function rejectInitialize(reader, writable, id, error, batched = false) {
    const response = {
        jsonrpc: "2.0",
        id,
        error: errorResponse(error),
    };
    const writer = writable.getWriter();
    try {
        await writer.write((batched ? [response] : response));
        await writer.close();
    }
    finally {
        writer.releaseLock();
        try {
            await reader.cancel(error);
        }
        finally {
            reader.releaseLock();
        }
    }
}
async function closeWithoutResponse(reader, writable, reason) {
    const writer = writable.getWriter();
    try {
        await writer.close();
    }
    finally {
        writer.releaseLock();
        try {
            await reader.cancel(reason);
        }
        finally {
            reader.releaseLock();
        }
    }
}
function errorResponse(error) {
    return {
        code: error.code,
        message: error.message,
        ...(error.data === undefined ? {} : { data: error.data }),
    };
}
function invalidProtocolVersion() {
    return RequestError.invalidParams("initialize.protocolVersion must be a valid ACP protocol version");
}
async function closeWritable(writable) {
    const writer = writable.getWriter();
    try {
        await writer.close();
    }
    finally {
        writer.releaseLock();
    }
}
async function abortWritable(writable, reason) {
    if (writable.locked) {
        return;
    }
    const writer = writable.getWriter();
    try {
        await writer.abort(reason);
    }
    finally {
        writer.releaseLock();
    }
}
function isProtocolVersion(value) {
    return (typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= MAX_PROTOCOL_VERSION);
}
function rewriteInitializeParams(params, requested, selected) {
    if (selected === PROTOCOL_V1) {
        return requested >= PROTOCOL_V2
            ? v2InitializeToV1(zV2InitializeRequest.parse(params))
            : normalizeInitialize(zV1InitializeRequest.parse(params), PROTOCOL_V1);
    }
    return normalizeInitialize(zV2InitializeRequest.parse(params), PROTOCOL_V2);
}
function normalizeInitialize(initialize, protocolVersion) {
    return canonicalJsonObject({ ...initialize, protocolVersion });
}
function v2InitializeToV1(initialize) {
    return canonicalJsonObject({
        protocolVersion: PROTOCOL_V1,
        clientCapabilities: v2ClientCapabilitiesToV1(initialize.capabilities),
        clientInfo: initialize.info,
        _meta: initialize._meta,
    });
}
function v2ClientCapabilitiesToV1(capabilities) {
    const result = {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
        session: { configOptions: { boolean: {} } },
        plan: {},
        auth: v2AuthCapabilitiesToV1(capabilities?.auth),
    };
    if (capabilities?.elicitation != null) {
        result.elicitation = capabilities.elicitation;
    }
    if (capabilities?.nes != null) {
        result.nes = capabilities.nes;
    }
    if (capabilities?.positionEncodings?.length) {
        result.positionEncodings = capabilities.positionEncodings;
    }
    if (capabilities?._meta != null) {
        result._meta = capabilities._meta;
    }
    return result;
}
function v2AuthCapabilitiesToV1(capabilities) {
    const terminal = capabilities?.terminal;
    if (terminal?._meta != null) {
        throw new Error("v2 AuthCapabilities.terminal metadata cannot be represented in v1");
    }
    return {
        terminal: terminal != null,
        ...(capabilities?._meta == null ? {} : { _meta: capabilities._meta }),
    };
}
/** Mirrors serde's canonical output for the initialize schema. */
function canonicalJsonObject(value) {
    const result = {};
    for (const [key, member] of Object.entries(value)) {
        if (member == null) {
            continue;
        }
        if (key === "_meta") {
            result[key] = member;
            continue;
        }
        if (Array.isArray(member)) {
            if (member.length > 0) {
                result[key] = member.map(canonicalJsonValue);
            }
            continue;
        }
        result[key] = isJsonObject(member) ? canonicalJsonObject(member) : member;
    }
    return result;
}
function canonicalJsonValue(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalJsonValue);
    }
    return isJsonObject(value) ? canonicalJsonObject(value) : value;
}
function isJsonObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=protocol-router.js.map
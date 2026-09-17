import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
/** Browser owner for the Gateway multiplexed Remote stream socket. */
import { parseRemoteStreamServerMessage, REMOTE_STREAM_MUX_PATH, } from "../stream-protocol.js";
import { Deque } from '@deepseek-ai/dsh-deque';
import { randomUUID } from '@deepseek-ai/dsh-util-crypto';
const INTERNAL_BASE = 'http://dsh.internal';
/** Physical Remote stream socket failure that may be retried by a domain transport. */
export class RemoteStreamCarrierError extends Error {
    /**
     * @param message - physical carrier failure description.
     * @param options - optional causal error.
     */
    constructor(message, options) {
        super(message, options);
        this.name = 'RemoteStreamCarrierError';
    }
}
/** Keep one physical WebSocket and share it among independently cancellable Remote streams. */
export class RemoteStreamMuxClient {
    socket;
    cancelCandidate;
    keepAlive;
    revision = 0;
    streams = new Map();
    waiters = new Set();
    running = false;
    disposed = false;
    /** Ensure a physical attempt exists, following the current attempt once if needed. */
    start() {
        if (this.disposed)
            return;
        this.running = true;
        if (this.socket?.readyState === WebSocket.OPEN)
            return;
        const pending = this.keepAlive;
        if (pending === undefined)
            this.maintain();
        else
            void pending.then(() => { this.maintain(); });
    }
    /** Cancel the current socket or retry wait and start a fresh attempt immediately. */
    reconnect() {
        if (!this.running || this.disposed)
            return;
        const failure = new RemoteStreamCarrierError('api gateway: Remote stream reconnect requested');
        const pending = this.keepAlive;
        this.revision++;
        this.cancelCandidate?.(failure);
        const socket = this.socket;
        if (socket !== undefined) {
            this.socket = undefined;
            this.failAll(failure);
            socket.close(4000, 'reconnect requested');
        }
        if (pending === undefined)
            this.maintain();
        else
            void pending.then(() => { this.maintain(); });
    }
    /**
     * Open one logical stream on the persistent physical connection.
     * If no physical attempt is active, opening waits for Connection to request
     * one or for the signal to abort.
     * @param endpoint - Typert Remote stream endpoint.
     * @param payload - endpoint request encoded on the wire.
     * @param signal - cancellation for this logical stream.
     * @returns Host items until completion, cancellation, or failure.
     */
    async *open(endpoint, payload, signal) {
        signal.throwIfAborted();
        const streamId = randomUUID();
        const inbox = new StreamInbox();
        let carrier;
        let opened = false;
        let terminal = false;
        const abort = () => { inbox.fail(signal.reason); };
        signal.addEventListener('abort', abort, { once: true });
        try {
            const socket = await this.waitForSocket(signal);
            signal.throwIfAborted();
            carrier = socket;
            this.streams.set(streamId, inbox);
            this.send(socket, { type: 'open', streamId, endpoint, payload });
            opened = true;
            while (true) {
                const frame = await inbox.next();
                signal.throwIfAborted();
                if (frame.type === 'item') {
                    yield frame.value;
                    continue;
                }
                terminal = true;
                if (frame.type === 'error') {
                    throw new RemoteError(frame.error.code, frame.error.message, frame.error.details);
                }
                return;
            }
        }
        finally {
            signal.removeEventListener('abort', abort);
            this.streams.delete(streamId);
            if (opened && !terminal && carrier?.readyState === WebSocket.OPEN) {
                this.send(carrier, { type: 'cancel', streamId });
            }
        }
    }
    /**
     * Permanently stop the carrier, close the physical socket, and fail every
     * active logical stream.
     * @returns once the active connection attempt has stopped.
     */
    async close() {
        if (!this.disposed) {
            this.disposed = true;
            this.running = false;
            const error = new Error('api gateway: Remote stream client disposed');
            this.failAll(error);
            for (const waiter of [...this.waiters])
                waiter.reject(error);
            this.cancelCandidate?.(error);
            const socket = this.socket;
            this.socket = undefined;
            socket?.close(1000, 'disposed');
        }
        await this.keepAlive;
    }
    connect() {
        const socket = new WebSocket(remoteStreamUrl());
        const connecting = new Promise((resolve, reject) => {
            let settled = false;
            const rejectCandidate = (error) => {
                settled = true;
                socket.removeEventListener('open', opened);
                socket.removeEventListener('error', failed);
                socket.removeEventListener('message', received);
                socket.removeEventListener('close', closed);
                this.cancelCandidate = undefined;
                socket.close();
                reject(error);
            };
            const opened = () => {
                settled = true;
                this.cancelCandidate = undefined;
                this.socket = socket;
                for (const waiter of [...this.waiters])
                    waiter.resolve(socket);
                resolve(socket);
            };
            const failed = () => {
                if (!settled) {
                    rejectCandidate(new RemoteStreamCarrierError('api gateway: Remote stream WebSocket failed to open'));
                    return;
                }
                const error = new RemoteStreamCarrierError('api gateway: Remote stream WebSocket failed');
                this.lost(socket, error);
                socket.close();
            };
            const closed = () => {
                if (!settled) {
                    rejectCandidate(new RemoteStreamCarrierError('api gateway: Remote stream WebSocket closed before opening'));
                    return;
                }
                this.lost(socket);
            };
            const received = (event) => { this.receive(socket, event.data); };
            this.cancelCandidate = rejectCandidate;
            socket.addEventListener('open', opened, { once: true });
            socket.addEventListener('error', failed, { once: true });
            socket.addEventListener('message', received);
            socket.addEventListener('close', closed, { once: true });
        });
        return connecting;
    }
    waitForSocket(signal) {
        signal.throwIfAborted();
        if (this.socket?.readyState === WebSocket.OPEN)
            return Promise.resolve(this.socket);
        if (this.disposed)
            return Promise.reject(new Error('api gateway: Remote stream client disposed'));
        if (!this.running)
            return Promise.reject(new Error('api gateway: Remote stream client not started'));
        return new Promise((resolve, reject) => {
            const aborted = () => { waiter.reject(signal.reason); };
            const cleanup = () => {
                this.waiters.delete(waiter);
                signal.removeEventListener('abort', aborted);
            };
            const waiter = {
                revision: this.revision,
                resolve: (socket) => {
                    cleanup();
                    resolve(socket);
                },
                reject: (error) => {
                    cleanup();
                    // AbortSignal.reason belongs to the caller and may intentionally be a non-Error sentinel.
                    // oxlint-disable-next-line typescript/prefer-promise-reject-errors
                    reject(error);
                },
            };
            this.waiters.add(waiter);
            signal.addEventListener('abort', aborted, { once: true });
        });
    }
    receive(socket, data) {
        if (socket !== this.socket)
            return;
        try {
            if (typeof data !== 'string')
                throw new Error('api gateway: Remote stream WebSocket requires text messages');
            const frame = parseRemoteStreamServerMessage(data);
            this.streams.get(frame.streamId)?.push(frame);
        }
        catch (error) {
            const failure = new RemoteStreamCarrierError('api gateway: invalid Remote stream frame', { cause: error });
            this.failAll(failure);
            this.lost(socket, failure);
            socket.close(4002, 'invalid Remote stream frame');
        }
    }
    lost(socket, error = new RemoteStreamCarrierError('api gateway: Remote stream WebSocket closed')) {
        if (this.socket !== socket)
            return;
        this.socket = undefined;
        this.failAll(error);
    }
    maintain() {
        if (!this.running || this.disposed)
            return;
        if (this.socket?.readyState === WebSocket.OPEN || this.keepAlive !== undefined)
            return;
        const revision = this.revision;
        const task = this.connect().then(() => undefined, (error) => {
            if (!this.running)
                return;
            for (const waiter of [...this.waiters]) {
                if (waiter.revision <= revision)
                    waiter.reject(error);
            }
        });
        this.keepAlive = task;
        void task.then(() => {
            this.keepAlive = undefined;
        });
    }
    failAll(error) {
        for (const stream of this.streams.values())
            stream.fail(error);
    }
    send(socket, message) {
        socket.send(JSON.stringify(message));
    }
}
class StreamInbox {
    frames = new Deque();
    wake;
    failure;
    push(frame) {
        if (this.failure !== undefined)
            return;
        this.frames.pushBack(frame);
        this.wake?.();
        this.wake = undefined;
    }
    fail(error) {
        if (this.failure !== undefined)
            return;
        this.failure = error instanceof Error ? error : new Error(String(error), { cause: error });
        this.frames.clear();
        this.wake?.();
        this.wake = undefined;
    }
    async next() {
        while (this.frames.size === 0) {
            if (this.failure !== undefined)
                throw this.failure;
            await new Promise((resolve) => { this.wake = resolve; });
        }
        return this.frames.popFront();
    }
}
function remoteStreamUrl() {
    const location = globalThis.location;
    const base = location?.origin !== undefined && location.origin !== 'null' ? location.origin : INTERNAL_BASE;
    const url = new URL(REMOTE_STREAM_MUX_PATH, base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.href;
}
//# sourceMappingURL=stream-client.js.map
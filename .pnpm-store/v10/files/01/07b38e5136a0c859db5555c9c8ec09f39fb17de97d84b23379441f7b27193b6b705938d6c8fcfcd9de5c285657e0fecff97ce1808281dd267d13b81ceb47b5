/** Host WebSocket owner for multiplexed Typert Remote streams. */
import WebSocket, { WebSocketServer } from 'ws';
import { parseRemoteStreamClientMessage, } from "./stream-protocol.js";
const MAX_MISSED_HEARTBEATS = 2;
/** Own the no-server WebSocket acceptor and every active logical stream. */
export class RemoteStreamMuxServer {
    open;
    failure;
    heartbeatIntervalMs;
    server = new WebSocketServer({ noServer: true });
    connections = new Set();
    missedHeartbeats = new WeakMap();
    heartbeatTimer;
    /**
     * @param open - Gateway stream dispatcher.
     * @param failure - Gateway error-to-wire mapper.
     * @param heartbeatIntervalMs - interval between WebSocket Ping control frames.
     */
    constructor(open, failure, heartbeatIntervalMs) {
        this.open = open;
        this.failure = failure;
        this.heartbeatIntervalMs = heartbeatIntervalMs;
    }
    /**
     * Upgrade one trusted request and begin serving its logical streams.
     * @param req - authenticated HTTP upgrade request.
     * @param socket - carrier socket transferred to the WebSocket server.
     * @param head - bytes already read after the HTTP upgrade headers.
     */
    handleUpgrade(req, socket, head) {
        this.server.handleUpgrade(req, socket, head, (websocket) => {
            this.missedHeartbeats.set(websocket, 0);
            websocket.on('pong', () => { this.missedHeartbeats.set(websocket, 0); });
            this.startHeartbeat();
            const connection = new RemoteStreamMuxConnection(websocket, this.open, this.failure);
            const done = connection.run();
            this.connections.add(done);
            void done.then(() => { this.connections.delete(done); });
        });
    }
    /** Terminate all sockets and wait until every iterator has returned. */
    async close() {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
        for (const socket of this.server.clients)
            socket.terminate();
        const closed = Promise.withResolvers();
        this.server.close((error) => {
            if (error === undefined)
                closed.resolve();
            else
                closed.reject(error);
        });
        await closed.promise;
        await Promise.all(this.connections);
    }
    /** Start one `unref()` timer after the first upgrade; it spans empty-client periods until close(). */
    startHeartbeat() {
        if (this.heartbeatTimer !== undefined)
            return;
        this.heartbeatTimer = setInterval(() => {
            for (const socket of this.server.clients) {
                if (socket.readyState !== WebSocket.OPEN)
                    continue;
                const missed = this.missedHeartbeats.get(socket);
                if (missed >= MAX_MISSED_HEARTBEATS) {
                    setImmediate(() => {
                        if (this.missedHeartbeats.get(socket) >= MAX_MISSED_HEARTBEATS) {
                            socket.terminate();
                        }
                    });
                    continue;
                }
                this.missedHeartbeats.set(socket, missed + 1);
                socket.ping();
            }
        }, this.heartbeatIntervalMs);
        this.heartbeatTimer.unref();
    }
}
class RemoteStreamMuxConnection {
    socket;
    open;
    failure;
    streams = new Map();
    writes = Promise.resolve();
    constructor(socket, open, failure) {
        this.socket = socket;
        this.open = open;
        this.failure = failure;
    }
    async run() {
        const closed = new Promise((resolve) => {
            this.socket.once('close', resolve);
            this.socket.once('error', () => { this.socket.terminate(); });
            this.socket.on('message', (data, isBinary) => {
                if (isBinary) {
                    this.socket.close(1003, 'text messages required');
                    return;
                }
                try {
                    this.receive(rawText(data));
                }
                catch {
                    this.socket.close(1008, 'invalid Remote stream request');
                }
            });
        });
        await closed;
        const active = [...this.streams.values()];
        for (const stream of active)
            stream.abort.abort(new Error('Remote stream socket closed'));
        await Promise.all(active.map(stream => stream.done));
    }
    receive(text) {
        const message = parseRemoteStreamClientMessage(text);
        if (message.type === 'cancel') {
            this.streams.get(message.streamId)?.abort.abort(new Error('Remote stream cancelled'));
            return;
        }
        if (this.streams.has(message.streamId)) {
            throw new Error(`api gateway: duplicate Remote stream id ${JSON.stringify(message.streamId)}`);
        }
        const abort = new AbortController();
        const active = {
            abort,
            done: Promise.resolve(),
        };
        this.streams.set(message.streamId, active);
        const done = this.pump(message.streamId, message.endpoint, message.payload, active);
        active.done = done;
        const remove = () => { this.streams.delete(message.streamId); };
        void done.then(remove, remove);
    }
    async pump(streamId, endpoint, payload, active) {
        try {
            const source = await this.open(endpoint, payload, active.abort.signal);
            for await (const value of source) {
                await this.send({ type: 'item', streamId, value });
            }
            if (!active.abort.signal.aborted)
                await this.send({ type: 'end', streamId });
        }
        catch (error) {
            if (!active.abort.signal.aborted && this.socket.readyState === WebSocket.OPEN) {
                try {
                    await this.send({ type: 'error', streamId, error: this.failure(error) });
                }
                catch {
                    // A terminal frame that cannot be encoded or written leaves the
                    // logical stream ambiguous, so fail the physical generation.
                    this.socket.close(1011, 'Remote stream failure could not be delivered');
                }
            }
        }
    }
    send(message) {
        let text;
        try {
            text = JSON.stringify(message);
        }
        catch (cause) {
            return Promise.reject(new Error('api gateway: Remote stream item is not JSON serializable', { cause }));
        }
        const delivery = this.writes.then(() => new Promise((resolve, reject) => {
            if (this.socket.readyState !== WebSocket.OPEN) {
                reject(new Error('api gateway: Remote stream socket is closed'));
                return;
            }
            this.socket.send(text, (error) => {
                if (error)
                    reject(error);
                else
                    resolve();
            });
        }));
        this.writes = delivery.catch(() => undefined);
        return delivery;
    }
}
function rawText(data) {
    if (Array.isArray(data))
        return Buffer.concat(data).toString('utf8');
    if (data instanceof ArrayBuffer)
        return Buffer.from(data).toString('utf8');
    return Buffer.from(data).toString('utf8');
}
/**
 * Reject an upgrade without transferring socket ownership to ws.
 * @param socket - carrier socket that receives the HTTP rejection.
 * @param status - authentication or browser-trust rejection status.
 */
export function rejectRemoteStreamUpgrade(socket, status) {
    const reason = status === 401 ? 'Unauthorized' : 'Forbidden';
    const body = reason.toLowerCase();
    socket.end([
        `HTTP/1.1 ${String(status)} ${reason}`,
        'Connection: close',
        'Content-Type: text/plain; charset=utf-8',
        `Content-Length: ${String(Buffer.byteLength(body))}`,
        '',
        body,
    ].join('\r\n'));
}
//# sourceMappingURL=stream-server.js.map
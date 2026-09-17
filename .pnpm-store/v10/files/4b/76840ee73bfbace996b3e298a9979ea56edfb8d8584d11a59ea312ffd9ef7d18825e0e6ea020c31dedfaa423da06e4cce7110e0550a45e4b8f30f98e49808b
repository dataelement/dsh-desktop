/** Host WebSocket owner for multiplexed Typert Remote streams. */
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { type RemoteStreamFailure } from './stream-protocol.ts';
/** Open one validated Remote stream for a decoded wire request. */
export type RemoteStreamOpener = (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<AsyncIterable<unknown>>;
/** Convert an invocation or carrier failure to a stable wire value. */
export type RemoteStreamFailureMapper = (error: unknown) => RemoteStreamFailure;
/** Own the no-server WebSocket acceptor and every active logical stream. */
export declare class RemoteStreamMuxServer {
    private readonly open;
    private readonly failure;
    private readonly heartbeatIntervalMs;
    private readonly server;
    private readonly connections;
    private readonly missedHeartbeats;
    private heartbeatTimer;
    /**
     * @param open - Gateway stream dispatcher.
     * @param failure - Gateway error-to-wire mapper.
     * @param heartbeatIntervalMs - interval between WebSocket Ping control frames.
     */
    constructor(open: RemoteStreamOpener, failure: RemoteStreamFailureMapper, heartbeatIntervalMs: number);
    /**
     * Upgrade one trusted request and begin serving its logical streams.
     * @param req - authenticated HTTP upgrade request.
     * @param socket - carrier socket transferred to the WebSocket server.
     * @param head - bytes already read after the HTTP upgrade headers.
     */
    handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void;
    /** Terminate all sockets and wait until every iterator has returned. */
    close(): Promise<void>;
    /** Start one `unref()` timer after the first upgrade; it spans empty-client periods until close(). */
    private startHeartbeat;
}
/**
 * Reject an upgrade without transferring socket ownership to ws.
 * @param socket - carrier socket that receives the HTTP rejection.
 * @param status - authentication or browser-trust rejection status.
 */
export declare function rejectRemoteStreamUpgrade(socket: Duplex, status: 401 | 403): void;
//# sourceMappingURL=stream-server.d.ts.map
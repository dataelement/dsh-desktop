/**
 * node:http ↔ WHATWG fetch bridge for the /api transport (host side of the
 * web carrier; the fetch-shaped handler itself is transport-agnostic).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ConnectionFetchHandler } from './rpc.ts';
/** Default carrier cap for all HTTP RPC bodies: sized for the default
 * aggregate image limit (200 MiB) after base64 expansion plus envelope
 * headroom (~267.7 MiB required), rounded up for slack. The bridge buffers
 * each body in memory, so this cap is also the per-request resident bound. */
export declare const DEFAULT_MAX_REQUEST_BODY_BYTES: number;
/**
 * Bridge one node:http request to the fetch-shaped handler (client close
 * aborts; response bodies stream out chunk by chunk).
 * @param req - incoming node:http request.
 * @param res - node:http response the bridge writes and owns to completion.
 * @param apiHandler - fetch-shaped API carrier the request is dispatched to.
 * @param maxRequestBodyBytes - maximum bytes buffered for a buffered route.
 */
export declare function bridge(req: IncomingMessage, res: ServerResponse, apiHandler: ConnectionFetchHandler, maxRequestBodyBytes?: number): Promise<void>;
//# sourceMappingURL=http-bridge.d.ts.map
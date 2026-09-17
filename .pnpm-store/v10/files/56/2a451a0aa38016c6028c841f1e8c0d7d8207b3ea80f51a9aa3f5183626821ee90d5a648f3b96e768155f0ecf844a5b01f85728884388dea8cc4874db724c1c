/// <reference types="node" />
/// <reference types="node" />
import type * as http from 'http';
import type * as https from 'https';
import type { ExportResponse } from '../export-response';
/**
 * Maximum response body size (4 MB) that the HTTP transport will read.
 * If the server sends more data the connection is destroyed and the export
 * is treated as a non-retryable error regardless of status code.
 */
export declare const MAX_RESPONSE_BODY_SIZE: number;
/**
 * Sends data using http
 * @param request
 * @param url
 * @param headers
 * @param compression
 * @param userAgent
 * @param agent
 * @param data
 * @param timeoutMillis
 */
export declare function sendWithHttp(request: typeof https.request | typeof http.request, url: string, headers: Record<string, string>, compression: 'gzip' | 'none', userAgent: string | undefined, agent: http.Agent | https.Agent, data: Uint8Array, timeoutMillis: number): Promise<ExportResponse>;
export declare function compressAndSend(req: http.ClientRequest, compression: 'gzip' | 'none', data: Uint8Array, onError: (error: Error) => void): void;
//# sourceMappingURL=http-transport-utils.d.ts.map
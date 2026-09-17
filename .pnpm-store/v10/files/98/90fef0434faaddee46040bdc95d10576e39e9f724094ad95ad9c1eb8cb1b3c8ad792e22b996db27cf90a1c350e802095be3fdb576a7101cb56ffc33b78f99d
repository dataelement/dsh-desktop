/** Bounded raw HTTP body intake for GitHub signature verification. */
import type { IncomingMessage } from 'node:http';
/** HTTP refusal whose message is safe to return without request data. */
export declare class WebhookHttpError extends Error {
    readonly status: 400 | 401 | 405 | 413 | 415 | 503;
    readonly name = "WebhookHttpError";
    constructor(status: 400 | 401 | 405 | 413 | 415 | 503, message: string);
}
/**
 * Read one request body as exact, bounded UTF-8 text.
 * @param request - incoming request before any parser consumes it.
 * @param maxBodyBytes - positive byte ceiling.
 * @returns the decoded body after EOF.
 * @throws {WebhookHttpError} for invalid length, excessive bytes, invalid UTF-8, or an aborted stream.
 */
export declare function readBoundedUtf8Body(request: IncomingMessage, maxBodyBytes: number): Promise<string>;
//# sourceMappingURL=body.d.ts.map
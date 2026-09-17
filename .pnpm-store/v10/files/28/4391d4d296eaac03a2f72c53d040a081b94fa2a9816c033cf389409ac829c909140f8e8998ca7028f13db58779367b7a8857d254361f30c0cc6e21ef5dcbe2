/** Bounded raw HTTP body intake for GitHub signature verification. */
/** HTTP refusal whose message is safe to return without request data. */
export class WebhookHttpError extends Error {
    status;
    name = 'WebhookHttpError';
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
/** Parse a decimal Content-Length or reject an ambiguous header. */
function contentLength(request) {
    const value = request.headers['content-length'];
    if (value === undefined)
        return undefined;
    if (!/^(0|[1-9]\d*)$/.test(value)) {
        throw new WebhookHttpError(400, 'invalid Content-Length');
    }
    const length = Number(value);
    if (!Number.isSafeInteger(length))
        throw new WebhookHttpError(413, 'request body is too large');
    return length;
}
/**
 * Read one request body as exact, bounded UTF-8 text.
 * @param request - incoming request before any parser consumes it.
 * @param maxBodyBytes - positive byte ceiling.
 * @returns the decoded body after EOF.
 * @throws {WebhookHttpError} for invalid length, excessive bytes, invalid UTF-8, or an aborted stream.
 */
export async function readBoundedUtf8Body(request, maxBodyBytes) {
    const declared = contentLength(request);
    if (declared !== undefined && declared > maxBodyBytes) {
        request.resume();
        throw new WebhookHttpError(413, 'request body is too large');
    }
    const chunks = [];
    let size = 0;
    try {
        for await (const raw of request) {
            const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
            size += chunk.byteLength;
            if (size > maxBodyBytes) {
                request.resume();
                throw new WebhookHttpError(413, 'request body is too large');
            }
            chunks.push(chunk);
        }
    }
    catch (error) {
        if (error instanceof WebhookHttpError)
            throw error;
        throw new WebhookHttpError(400, 'request body was aborted');
    }
    if (!request.complete)
        throw new WebhookHttpError(400, 'request body was aborted');
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size));
    }
    catch {
        // TextDecoder is the only statement in the try; GitHub JSON must be valid UTF-8.
        throw new WebhookHttpError(400, 'request body is not valid UTF-8');
    }
}
//# sourceMappingURL=body.js.map
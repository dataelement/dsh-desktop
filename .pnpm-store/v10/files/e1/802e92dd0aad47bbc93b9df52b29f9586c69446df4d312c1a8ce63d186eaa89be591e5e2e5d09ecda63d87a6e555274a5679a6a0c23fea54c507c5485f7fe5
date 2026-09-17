/**
 * Minimal HTTP helpers shared by every market route: JSON serialization,
 * same-origin enforcement for mutating endpoints, and a size-capped JSON
 * body reader.
 */
/** Write a JSON payload with no-store caching. */
export function sendJson(response, status, payload) {
    response.writeHead(status, {
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify(payload));
}
/** True when the request's Origin matches its Host — required on every POST route. */
export function sameOrigin(request) {
    const origin = request.headers.origin;
    const host = request.headers.host;
    if (origin === undefined || host === undefined)
        return false;
    try {
        return new URL(origin).host === host;
    }
    catch {
        return false;
    }
}
/** Read and parse a JSON request body, rejecting anything over 4 KiB. */
export async function readJsonBody(request, maxBytes = 4096) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > maxBytes)
            throw new Error('request body too large');
        chunks.push(buffer);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Background browser upload implementation for Blob and byte-stream bodies. */
import { Service } from '@deepseek-ai/cordis';
import { bytesToBase64 } from '@deepseek-ai/dsh-util-crypto';
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { FILE_UPLOAD_PATH } from "../protocol.js";
/**
 * Self-contained Worker body; its string form becomes the Blob Worker source.
 * @param scope - Worker global used for requests and progress messages.
 * @param createXhr - XMLHttpRequest factory used for Blob progress.
 * @param doFetch - Fetch carrier used for one-shot ReadableStream bodies.
 */
export function fileUploadWorker(scope = self, createXhr = () => new XMLHttpRequest(), doFetch = (input, init) => fetch(input, init)) {
    scope.onmessage = (event) => {
        const request = event.data;
        if (request.body instanceof Blob) {
            const xhr = createXhr();
            xhr.open('POST', request.url);
            xhr.withCredentials = true;
            for (const [name, value] of Object.entries(request.headers))
                xhr.setRequestHeader(name, value);
            xhr.upload.onprogress = (progress) => {
                scope.postMessage({
                    kind: 'progress',
                    loaded: progress.loaded,
                    ...(progress.lengthComputable ? { total: progress.total } : {}),
                });
            };
            xhr.onload = () => {
                scope.postMessage({ kind: 'complete', status: xhr.status, body: xhr.responseText });
            };
            xhr.onerror = () => {
                scope.postMessage({ kind: 'error', message: 'background upload transport failed' });
            };
            xhr.send(request.body);
            return;
        }
        if (!(request.body instanceof ReadableStream)) {
            scope.postMessage({ kind: 'error', message: 'background upload worker received an invalid body' });
            return;
        }
        const source = request.body;
        void (async () => {
            const reader = source.getReader();
            let loaded = 0;
            const body = new ReadableStream({
                async pull(controller) {
                    const item = await reader.read();
                    if (item.done) {
                        controller.close();
                        return;
                    }
                    if (!(item.value instanceof Uint8Array)) {
                        throw new TypeError('background upload stream produced a non-Uint8Array chunk');
                    }
                    loaded += item.value.byteLength;
                    scope.postMessage({ kind: 'progress', loaded });
                    controller.enqueue(item.value);
                },
                async cancel(reason) {
                    await reader.cancel(reason);
                },
            });
            const response = await doFetch(request.url, {
                method: 'POST',
                headers: request.headers,
                credentials: 'include',
                body,
                duplex: 'half',
            });
            scope.postMessage({
                kind: 'complete',
                status: response.status,
                body: await response.text(),
            });
        })().catch((error) => {
            scope.postMessage({
                kind: 'error',
                message: error instanceof Error ? error.message : String(error),
            });
        });
    };
}
/** Cordis service that owns one background carrier per upload operation. */
export class FileUploadRuntime extends Service {
    available;
    transport;
    /** @param ctx - providing Client context. */
    constructor(ctx) {
        super(ctx, 'fileUpload');
        const hook = globalThis.__DSH_FILE_UPLOAD__;
        this.available = hook !== undefined || !isFixturePage();
        this.transport = hook === undefined ? workerTransport() : customTransport(hook.fetch);
    }
    /**
     * Post one body with the carrier selected before Cordis boot.
     * @param request - target, body, cancellation, and progress observer.
     * @returns the response status and text body.
     */
    post(request) {
        if (!this.available)
            return Promise.reject(new Error('background upload is unavailable in fixture mode'));
        return this.transport.post(request);
    }
    /**
     * Store one file for a Session.
     * @param sessionId - Session that owns the staged receipt.
     * @param data - browser Blob, exact bytes, or a one-shot byte stream.
     * @param name - optional display name.
     * @param signal - optional cancellation for the active upload.
     * @param onProgress - optional byte-progress observer for background bodies.
     * @returns the staged receipt and durable file reference, or a business error.
     */
    async upload(sessionId, data, name, signal, onProgress) {
        if (!(data instanceof Uint8Array) && this.available) {
            const query = new URLSearchParams({ sessionId });
            if (name !== undefined)
                query.set('name', name);
            const response = await this.post({
                path: `${FILE_UPLOAD_PATH}?${query.toString()}`,
                body: data,
                headers: { 'content-type': 'application/octet-stream' },
                ...(signal === undefined ? {} : { signal }),
                ...(onProgress === undefined ? {} : { onProgress }),
            });
            if (response.status !== 200) {
                throw new Error(`file upload transport failed with HTTP ${String(response.status)}`);
            }
            return parseFileUploadResult(response.body);
        }
        if (!(data instanceof Uint8Array) && !(data instanceof Blob)) {
            throw new Error('stream file upload requires a background carrier');
        }
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer());
        return this.ctx.remote.fileUploads.upload(sessionId, {
            data: bytesToBase64(bytes),
            ...(name === undefined ? {} : { name }),
        }, signal);
    }
}
function customTransport(customFetch) {
    return {
        async post(request) {
            const init = {
                method: 'POST',
                ...(request.headers === undefined ? {} : { headers: request.headers }),
                body: request.body,
                ...(request.body instanceof ReadableStream ? { duplex: 'half' } : {}),
                ...(request.signal === undefined ? {} : { signal: request.signal }),
            };
            const response = await customFetch(resolveUrl(request.path), init);
            return { status: response.status, body: await response.text() };
        },
    };
}
function workerTransport() {
    return {
        post(request) {
            if (typeof Worker !== 'function') {
                return Promise.reject(new Error('background upload requires Web Worker support'));
            }
            const workerUrl = URL.createObjectURL(new Blob([
                `(${fileUploadWorker.toString()})()`,
            ], { type: 'text/javascript' }));
            const worker = new Worker(workerUrl, { name: 'dsh-file-upload' });
            URL.revokeObjectURL(workerUrl);
            return new Promise((resolve, reject) => {
                let settled = false;
                const abort = () => {
                    settled = true;
                    worker.terminate();
                    request.signal?.removeEventListener('abort', abort);
                    reject(new DOMException('The operation was aborted.', 'AbortError'));
                };
                const finish = (settle) => {
                    if (settled)
                        return;
                    settled = true;
                    request.signal?.removeEventListener('abort', abort);
                    worker.terminate();
                    settle();
                };
                worker.onmessage = (event) => {
                    const output = event.data;
                    if (output.kind === 'progress') {
                        request.onProgress?.({
                            loaded: output.loaded,
                            ...(output.total === undefined ? {} : { total: output.total }),
                        });
                    }
                    else if (output.kind === 'complete') {
                        finish(() => { resolve({ status: output.status, body: output.body }); });
                    }
                    else {
                        finish(() => { reject(new Error(output.message)); });
                    }
                };
                worker.onerror = (event) => {
                    finish(() => { reject(new Error(event.message || 'background upload worker failed')); });
                };
                if (request.signal?.aborted === true) {
                    abort();
                    return;
                }
                request.signal?.addEventListener('abort', abort, { once: true });
                const message = {
                    url: resolveUrl(request.path).href,
                    body: request.body,
                    headers: request.headers ?? {},
                };
                if (request.body instanceof ReadableStream)
                    worker.postMessage(message, [request.body]);
                else
                    worker.postMessage(message);
            });
        },
    };
}
function resolveUrl(path) {
    const pageLocation = Reflect.get(globalThis, 'location');
    const origin = typeof pageLocation === 'object' && pageLocation !== null
        && 'origin' in pageLocation && typeof pageLocation.origin === 'string'
        ? pageLocation.origin
        : undefined;
    return new URL(path, origin === undefined || origin === 'null' ? 'http://dsh.internal' : origin);
}
function isFixturePage() {
    const pageLocation = Reflect.get(globalThis, 'location');
    return typeof pageLocation === 'object' && pageLocation !== null
        && 'search' in pageLocation && typeof pageLocation.search === 'string'
        && new URLSearchParams(pageLocation.search).has('fixture');
}
function parseFileUploadResult(body) {
    const value = JSON.parse(body);
    if (!isRecord(value) || typeof value.ok !== 'boolean') {
        throw new TypeError('file upload transport returned an invalid result');
    }
    if (!value.ok) {
        const error = value.error;
        if (!isRecord(error) || typeof error.code !== 'string'
            || typeof error.message !== 'string' || !isRecord(error.details)) {
            throw new TypeError('file upload transport returned an invalid failure');
        }
        return {
            ok: false,
            error: new RemoteError(error.code, error.message, error.details),
        };
    }
    const result = value.value;
    const file = isRecord(result) ? result.file : undefined;
    if (!isRecord(result) || typeof result.receiptId !== 'string' || !isRecord(file)
        || typeof file.attachmentId !== 'string' || typeof file.name !== 'string'
        || typeof file.bytes !== 'number' || !Number.isSafeInteger(file.bytes) || file.bytes < 0) {
        throw new TypeError('file upload transport returned an invalid receipt');
    }
    return {
        ok: true,
        value: {
            receiptId: result.receiptId,
            file: {
                attachmentId: file.attachmentId,
                name: file.name,
                bytes: file.bytes,
            },
        },
    };
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=runtime.js.map
/** Background browser upload implementation for Blob and byte-stream bodies. */
import { Service, type Context } from '@deepseek-ai/cordis';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { FileUploadValue } from '../types.ts';
import type { FileUploadBody, FileUploadService } from './contract.ts';
interface FileUploadRequest {
    readonly path: string;
    readonly body: FileUploadBody;
    readonly headers?: Readonly<Record<string, string>>;
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: {
        readonly loaded: number;
        readonly total?: number;
    }) => void;
}
interface FileUploadResponse {
    readonly status: number;
    readonly body: string;
}
interface UploadWorkerStart {
    readonly url: string;
    readonly body: FileUploadBody;
    readonly headers: Readonly<Record<string, string>>;
}
type UploadWorkerOutput = {
    readonly kind: 'progress';
    readonly loaded: number;
    readonly total?: number;
} | {
    readonly kind: 'complete';
    readonly status: number;
    readonly body: string;
} | {
    readonly kind: 'error';
    readonly message: string;
};
interface UploadWorkerScope {
    onmessage: ((event: MessageEvent<UploadWorkerStart>) => void) | null;
    postMessage(message: UploadWorkerOutput): void;
}
interface UploadXhr {
    readonly upload: {
        onprogress: ((event: ProgressEvent) => void) | null;
    };
    status: number;
    responseText: string;
    withCredentials: boolean;
    onload: ((event: ProgressEvent) => void) | null;
    onerror: ((event: ProgressEvent) => void) | null;
    open(method: string, url: string): void;
    setRequestHeader(name: string, value: string): void;
    send(body: Blob): void;
}
type UploadWorkerFetch = (input: string, init: RequestInit & {
    readonly duplex: 'half';
}) => Promise<Response>;
/**
 * Self-contained Worker body; its string form becomes the Blob Worker source.
 * @param scope - Worker global used for requests and progress messages.
 * @param createXhr - XMLHttpRequest factory used for Blob progress.
 * @param doFetch - Fetch carrier used for one-shot ReadableStream bodies.
 */
export declare function fileUploadWorker(scope?: UploadWorkerScope, createXhr?: () => UploadXhr, doFetch?: UploadWorkerFetch): void;
/** Cordis service that owns one background carrier per upload operation. */
export declare class FileUploadRuntime extends Service implements FileUploadService {
    readonly available: boolean;
    private readonly transport;
    /** @param ctx - providing Client context. */
    constructor(ctx: Context);
    /**
     * Post one body with the carrier selected before Cordis boot.
     * @param request - target, body, cancellation, and progress observer.
     * @returns the response status and text body.
     */
    post(request: FileUploadRequest): Promise<FileUploadResponse>;
    /**
     * Store one file for a Session.
     * @param sessionId - Session that owns the staged receipt.
     * @param data - browser Blob, exact bytes, or a one-shot byte stream.
     * @param name - optional display name.
     * @param signal - optional cancellation for the active upload.
     * @param onProgress - optional byte-progress observer for background bodies.
     * @returns the staged receipt and durable file reference, or a business error.
     */
    upload(sessionId: SessionId, data: Blob | Uint8Array | ReadableStream<Uint8Array>, name?: string, signal?: AbortSignal, onProgress?: (progress: {
        readonly loaded: number;
        readonly total?: number;
    }) => void): Promise<RemoteResult<FileUploadValue>>;
}
export {};
//# sourceMappingURL=runtime.d.ts.map
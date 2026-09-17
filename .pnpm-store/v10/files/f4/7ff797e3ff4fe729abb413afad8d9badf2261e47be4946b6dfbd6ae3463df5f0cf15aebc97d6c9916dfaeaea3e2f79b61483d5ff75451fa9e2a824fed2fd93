import type { PdfSession } from './document.ts';
import { PdfWorkerFailure } from './errors.ts';
/**
 * Open complete PDF bytes with an explicitly owned Worker. Startup failure
 * never falls back to main-thread PDF parsing. Disposal keeps the Worker alive
 * for PDF.js teardown, except after a fatal worker error, then terminates the
 * native Worker and revokes its source URL.
 * @param data - complete PDF bytes retained by the preview; the worker receives a copy.
 * @param signal - document/body lifetime.
 * @param reportFailure - reports a fatal Worker failure, including failures after document loading.
 * @returns the pending document and idempotent asynchronous cleanup.
 */
export declare function openPdf(data: Uint8Array<ArrayBuffer>, signal: AbortSignal, reportFailure: (error: PdfWorkerFailure) => void): PdfSession;
//# sourceMappingURL=runtime.d.ts.map
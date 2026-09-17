/** Canvas rendering with cancellation and page cleanup, shared by the PDF body and real-library smoke. */
import type { PDFDocumentProxy } from 'pdfjs-dist';
/** The document operations used by one mounted PDF body. */
export type PdfDocument = Pick<PDFDocumentProxy, 'numPages' | 'getPage'>;
/** One in-flight PDF load and its complete cleanup operation. */
export interface PdfSession {
    readonly document: Promise<PdfDocument>;
    /**
     * Cancel loading and rendering, destroy the document, and release its worker.
     * Library teardown failures are logged after native resources are released.
     * @returns cleanup completion without rejection.
     */
    dispose(): Promise<void>;
}
/** Page geometry expressed in CSS pixels. */
export interface PdfPageSize {
    readonly width: number;
    readonly height: number;
}
/**
 * Render one page into an exclusively owned canvas. Cancellation cannot write
 * dimensions after a delayed getPage; active render tasks are cancelled and
 * awaited before the page is cleaned up.
 * @param document - loaded pdfjs document.
 * @param pageNumber - 1-based selected page.
 * @param canvas - canvas owned by this render only.
 * @param signal - render lifetime.
 * @param pixelRatio - display pixel ratio.
 * @returns the page's CSS dimensions after rendering completes.
 */
export declare function renderPdfPage(document: PdfDocument, pageNumber: number, canvas: HTMLCanvasElement, signal: AbortSignal, pixelRatio: number): Promise<PdfPageSize>;
//# sourceMappingURL=document.d.ts.map
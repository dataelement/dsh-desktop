/**
 * PDF-to-image renderer for embedded EMF PDFs.
 *
 * pdfjs-dist v5 has process-level shared state (PagesMapper.#pagesNumber,
 * GlobalWorkerOptions.workerSrc, PDFWorker.#isWorkerDisabled) that a library
 * must never touch on the main thread — doing so clobbers the host app's pdfjs
 * configuration.
 *
 * Solution: render EMF PDFs exclusively inside a dedicated Web Worker. The
 * worker loads its OWN pdfjs instance via dynamic import, so all static state
 * is fully isolated from the main thread.
 *
 * If Worker + OffscreenCanvas are unavailable (extremely rare in 2025+
 * browsers), rendering is skipped and the caller gets null — no main-thread
 * fallback, no global state pollution.
 */
export interface PdfjsOptions {
    /**
     * URL for the pdfjs ESM module, for example
     * `new URL('pdfjs-dist/build/pdf.min.mjs', import.meta.url).toString()`.
     */
    moduleUrl?: string;
    /**
     * URL for the pdfjs worker ESM module, for example
     * `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`.
     */
    workerUrl?: string;
}
export type PdfjsConfig = PdfjsOptions | false;
/**
 * Inline source for the PDF render worker.
 * Receives: { id, pdfData, width, height, pdfjsUrl, pdfWorkerUrl }
 * Posts back: { id, blob } or { id, error }
 *
 * The worker loads its OWN pdfjs instance via dynamic import, so its static
 * PagesMapper state is completely independent of the main thread.
 * pdfjs's own workerSrc is configured inside this isolated worker, so host
 * applications can keep their main-thread pdfjs settings untouched.
 */
export declare const PDFJS_WORKER_SOURCE = "\nlet pdfjsLib = null;\n\n// PDF.js resolves its nested worker through browser window APIs. Aliasing\n// this isolated worker global keeps it on the real-worker path; otherwise its\n// fake-worker fallback would bind to this worker's message port.\nglobalThis.window = globalThis;\n\nself.onmessage = async (e) => {\n  const { id, pdfData, width, height, pdfjsUrl, pdfWorkerUrl } = e.data;\n  try {\n    if (!pdfjsLib) {\n      pdfjsLib = await import(pdfjsUrl);\n      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;\n    }\n\n    const loadingTask = pdfjsLib.getDocument({ data: pdfData });\n    let doc = null;\n    try {\n      doc = await loadingTask.promise;\n      if (doc.numPages < 1) {\n        self.postMessage({ id, error: 'no pages' });\n        return;\n      }\n      const page = await doc.getPage(1);\n      const vp = page.getViewport({ scale: 1 });\n      const scale = Math.max(width / vp.width, height / vp.height);\n      const svp = page.getViewport({ scale });\n\n      const canvas = new OffscreenCanvas(Math.ceil(svp.width), Math.ceil(svp.height));\n      const ctx = canvas.getContext('2d', { alpha: true });\n      await page.render({ canvasContext: ctx, viewport: svp, background: 'rgba(0,0,0,0)' }).promise;\n\n      const blob = await canvas.convertToBlob({ type: 'image/png' });\n      self.postMessage({ id, blob });\n    } finally {\n      if (typeof loadingTask.destroy === 'function') {\n        await loadingTask.destroy();\n      } else if (doc && typeof doc.destroy === 'function') {\n        await doc.destroy();\n      }\n    }\n  } catch (err) {\n    self.postMessage({ id, error: String(err) });\n  }\n};\n";
/**
 * Render page 1 of a PDF to a blob URL image.
 *
 * Uses a dedicated Web Worker with its own pdfjs instance, fully isolated
 * from the main thread. Never touches GlobalWorkerOptions or any other
 * pdfjs global state on the main thread.
 *
 * @returns blob URL string, or null if rendering fails or Worker is unavailable
 */
export declare function renderPdfToImage(pdfData: Uint8Array, width: number, height: number, pdfjs?: PdfjsConfig, signal?: AbortSignal): Promise<string | null>;

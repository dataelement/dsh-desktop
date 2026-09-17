/** Finite HTML-declared classic scripts and stylesheets; no module, CSS dependency or runtime fetch traversal. */
import type { HtmlBundle } from './bootstrap.ts';
import type { DocumentFileBytes } from '../rpc.ts';
/**
 * A read bound to the original document's session and directory, using ordinary file operations.
 * @param reference - HTML-decoded relative URL, including any query or fragment; the reader resolves its file path.
 * @param signal - cancellation of this packing operation.
 * @returns complete file bytes; permission and read failures reject.
 */
export type ReadHtmlRelative = (reference: string, signal: AbortSignal) => Promise<DocumentFileBytes>;
/**
 * Collect static dependencies without executing or mounting document elements in the parent page.
 * A base element leaves URL resolution to the browser. Only direct .js classic scripts and .css
 * links are packed; local CSS url/import, modules and dynamically constructed URLs are unsupported.
 * @param data - complete UTF-8 HTML bytes.
 * @param readRelative - original-document-scoped read, never exposed to the iframe.
 * @param signal - stops reads and prevents publication after cancellation.
 * @returns complete HTML and its finite static asset set; decoding, limits and read failures reject.
 */
export declare function packHtml(data: Uint8Array<ArrayBuffer>, readRelative: ReadHtmlRelative, signal: AbortSignal): Promise<HtmlBundle>;
//# sourceMappingURL=pack.d.ts.map
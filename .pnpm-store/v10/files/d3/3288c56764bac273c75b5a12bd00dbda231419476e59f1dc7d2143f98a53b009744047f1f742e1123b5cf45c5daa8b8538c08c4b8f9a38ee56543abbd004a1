/** Decodes a base64 CSC link to a Buffer, or returns null if the value is not base64. */
export declare function decodeCscLinkBase64(link: string): Buffer | null;
/** Resolves a CSC link file path, expanding `~/`, `file://`, and relative paths against `cwd`. */
export declare function resolveCscLinkPath(cscLink: string, resourcesDir: string | undefined): string;
/**
 * Resolves a CSC link to its text content.
 *
 * Formats accepted:
 * - Base64: detected by `data:…;base64,` prefix, length > 2048, or trailing `=`
 * - File path: `~/…`, `file://…`, absolute, or relative to `cwd`
 */
export declare function loadCscLink(link: string, resourcesDir: string | undefined): Promise<string>;

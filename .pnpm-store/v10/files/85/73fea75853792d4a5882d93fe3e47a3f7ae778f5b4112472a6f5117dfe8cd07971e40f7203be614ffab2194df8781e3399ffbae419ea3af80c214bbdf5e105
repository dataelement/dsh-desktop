/** Adapt a Remote relative read without changing its Session or Host path authority. */
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client';
import type { WorkspaceFileBytes } from '@deepseek-ai/dsh-api-workspace-files/types';
import type { ReadHtmlRelative } from './pack.ts';
/**
 * Read one dependency relative to the addressed HTML file through the Host.
 * @param address - root HTML file address.
 * @param relativePath - decoded dependency path, resolved only by the Host.
 * @param signal - cancellation shared by the tab and packing operation.
 * @returns the Remote complete-byte result, including declared failures.
 */
export type ReadHtmlRelated = (address: string, relativePath: string, signal: AbortSignal) => Promise<RemoteResult<WorkspaceFileBytes>>;
/**
 * Bind a package reader to the original HTML file's address.
 * @param readRelated - Remote reader using the Session in the root HTML address.
 * @param address - root HTML file address.
 * @param lifetime - tab lifetime.
 * @returns a reader that strips URL query/fragment, decodes one path, and preserves Host failures.
 */
export declare function createReadHtmlRelative(readRelated: ReadHtmlRelated, address: string, lifetime: AbortSignal): ReadHtmlRelative;
//# sourceMappingURL=read-relative.d.ts.map
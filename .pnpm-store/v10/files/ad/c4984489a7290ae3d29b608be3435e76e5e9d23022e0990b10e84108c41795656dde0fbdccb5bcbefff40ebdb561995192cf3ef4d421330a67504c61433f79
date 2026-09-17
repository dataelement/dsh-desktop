/**
 * Host directory-picking Remote owner: capability gating, cancellation, and the
 * stable wire failure vocabulary over the `ctx.directoryPicker` seam.
 */
import { Context } from '@deepseek-ai/cordis';
import type { DirectoryListing } from '@deepseek-ai/dsh-host-directory-picker/types';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host directory-picking Remote namespace owner. */
        directoryPickerController: DirectoryPickerController;
    }
}
/**
 * Host service backing the generated `ctx.remote.directoryPicker` namespace. The
 * seam it exports is abstract and therefore never a Loader entry of its own, so
 * this controller carries the wire verbs: one composed backend serves either the
 * native chooser or the browse primitives, and a verb the composition cannot
 * serve is refused rather than approximated.
 */
export declare class DirectoryPickerController extends TypertRemoteService {
    static inject: string[];
    /** @param ctx - Host context carrying the composed directory-picking backend. */
    constructor(ctx: Context);
    /**
     * Open the host's OS chooser for a Remote caller.
     * @param signal - caller lifetime; abort terminates the chooser.
     * @returns the chosen absolute path, or null when the operator cancels.
     */
    pick(signal: AbortSignal): Promise<string | null>;
    /**
     * List one directory level for a Remote caller's in-app browser.
     * @param path - absolute directory to list; absent lists the home directory.
     * @param signal - caller lifetime; abort stops the backend's scan instead of
     *   letting it outlive a disconnected caller.
     * @returns the level's listing with its ancestry.
     */
    list(path: string | undefined, signal: AbortSignal): Promise<DirectoryListing>;
    /**
     * Create one child directory for a Remote caller's in-app browser.
     * @param path - absolute existing parent directory.
     * @param name - single non-blank path segment.
     * @returns the created directory's absolute path.
     */
    createDirectory(path: string, name: string): Promise<string>;
    /** Resolve the capability one wire verb needs, or refuse with the kind this backend serves. */
    private requireCapability;
}
//# sourceMappingURL=directory-picker.d.ts.map
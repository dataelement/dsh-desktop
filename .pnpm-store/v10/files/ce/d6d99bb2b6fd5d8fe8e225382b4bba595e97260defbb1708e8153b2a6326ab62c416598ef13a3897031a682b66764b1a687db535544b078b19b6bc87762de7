/**
 * Browse backend of the directory-picker seam: registers `ctx.directoryPicker`
 * with the `browse` capability — one-level directory listing and child-directory
 * creation over the host filesystem via Node's stdlib (which already carries
 * the per-OS adaptation). Nothing renders on the host display, so this backend
 * serves remote clients the dialog backend cannot. Policy decisions (hidden
 * entries flagged but returned, symlinks followed, whole-filesystem scope) are
 * recorded in the directory-picker seam Agent Note.
 * @module @deepseek-ai/dsh-host-directory-picker-browse
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { DirectoryPicker } from '@deepseek-ai/dsh-host-directory-picker';
import type { DirectoryPickerCapability } from '@deepseek-ai/dsh-host-directory-picker';
/**
 * True when the path names one fixed filesystem location regardless of
 * process state: POSIX-absolute on POSIX; on Windows only drive-qualified
 * (`C:\…`) or complete UNC (`\\server\share…`) forms. Rooted drive-less
 * forms (`\foo`, `/foo`) and incomplete UNC prefixes (`\\`, `\\server`)
 * pass `isAbsolute` yet still resolve against the process's current drive.
 * @param path - candidate path.
 * @param platform - replaces `process.platform` for deterministic tests.
 * @returns whether the path is fully qualified on the platform.
 */
export declare function fullyQualified(path: string, platform?: NodeJS.Platform): boolean;
/** One streamed listing candidate: the dirent facts a row needs, nothing else retained. */
export interface ListingCandidate {
    /** Base name within the streamed level. */
    name: string;
    /** Dirent says directory (no probe needed). */
    isDirectory: boolean;
    /** Dirent says symlink (enterability needs a stat probe). */
    isSymbolicLink: boolean;
}
/**
 * Insert a streamed candidate into the name-sorted bounded window, evicting
 * the name-largest candidate when the window exceeds `keep`. Memory over an
 * arbitrarily large level therefore stays O(keep) regardless of how many
 * children the directory holds.
 * @param window - the name-ascending window, mutated in place.
 * @param candidate - the streamed candidate to place.
 * @param keep - the window bound.
 * @returns true when an eviction happened (the level has candidates beyond the window).
 */
export declare function boundedInsert(window: ListingCandidate[], candidate: ListingCandidate, keep: number): boolean;
/**
 * Await `operation`, but reject with the signal's reason the moment it
 * aborts. Node's filesystem reads are not retractable, so the operation
 * itself keeps running against a handle the caller then closes — its late
 * settlement is swallowed here so an abandoned read cannot surface as an
 * unhandled rejection.
 * @param operation - the in-flight filesystem step.
 * @param signal - caller lifetime; absent means plain awaiting.
 * @returns the operation's value.
 */
export declare function raceAbort<T>(operation: Promise<T>, signal: AbortSignal | undefined): Promise<T>;
/** Validated plugin configuration. */
export interface Config {
    /** Complete-result bound of one listing level; see {@link BrowseDirectoryPicker.Config}. */
    maxEntries: number;
}
/** The `ctx.directoryPicker` browse implementation (stable capability object per service life). */
export default class BrowseDirectoryPicker extends DirectoryPicker {
    private readonly config;
    /**
     * `maxEntries` bounds the complete listing level a single `list` call may
     * materialize and put on the wire: at most this many child-directory rows
     * (hidden rows included), with `truncated` flagging a cut level. The
     * default follows GitHub's web UI, which truncates directory listings at
     * 1,000 entries.
     */
    static Config: z<Config>;
    private readonly browseCapability;
    constructor(ctx: Context, config: Config);
    /**
     * The browse interaction capability.
     * @returns the stable `browse` capability object.
     */
    capability(): DirectoryPickerCapability;
    private list;
    private createDirectory;
}
//# sourceMappingURL=index.d.ts.map
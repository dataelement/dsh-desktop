/**
 * Workspace file service: read-only file previews, workspace directory
 * listings, and the filesystem-observation change feed, exposed as
 * `workspaceFiles`.
 *
 * File reads follow the composed filesystem's read access, including paths
 * outside the workspace. The selected Session header supplies the base for
 * relative paths, with the sandbox policy root as its no-cwd fallback, not a
 * read-containment restriction. Directory listings and change observations
 * remain workspace-scoped. File-kind checks and configured read caps apply to
 * every preview; this service exposes no mutations.
 *
 * A page is cut from `streamText`, which decodes and rejects non-UTF-8 as it
 * goes, so the file is read only up to the first character past the page and
 * never held whole in memory; the NUL scan runs on the page itself.
 *
 * This is NOT modelled on `session.openWorkspacePath`. That endpoint hands a
 * path to the local opener and leaves the effect on the machine; this one sends
 * file content across the wire, which is a different level of exposure.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { TypertRemoteService, type TypertLookup } from '@deepseek-ai/dsh-typert-protocol';
import type { WorkspaceByteRange, WorkspaceDirectoryListing, WorkspaceFileBytes, WorkspaceFileRange, WorkspaceFileStat, WorkspaceFileText, WorkspaceFileWatchFrame } from './types.ts';
export type * from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host owner of the `workspaceFiles` Remote namespace. */
        workspaceFiles: WorkspaceFiles;
    }
}
/** Header-derived file resolution context for one Session identity. */
export interface WorkspaceFileScope {
    /** Session identity received on the wire. */
    readonly sessionId: SessionId;
    /** Session workspace root, or the deployment fallback when its header has no cwd. */
    readonly workspaceRoot: string;
}
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertLookupMap {
        /** Resolve a Session id to its workspace root without loading its event body or activating an Agent. */
        workspaceFileScope: TypertLookup<WorkspaceFileScope, SessionId>;
    }
}
/** Deployment caps on one page or one listing. */
export interface Config {
    /**
     * Inclusive byte cap on one page's text and on one byte window.
     *
     * A page above this fails; it is not shortened, because a silently cut page
     * reads as the whole page. A byte window asking for more is refused the same
     * way. The file itself has no size cap: a caller pages through it.
     */
    readonly maxBytes: number;
    /** Inclusive byte cap on a complete-file read; larger files are refused, never truncated. */
    readonly maxFileBytes: number;
    /** Default and largest page size in lines; a request asking for more is refused. */
    readonly maxLines: number;
    /** Cap on returned directory entries; the rest is dropped and reported cut. */
    readonly maxEntries: number;
}
/** Host Remote file reads and workspace directory observations over the composed filesystem. */
export declare class WorkspaceFiles extends TypertRemoteService {
    private readonly config;
    static inject: string[];
    static Config: z<Config>;
    private readonly feed;
    /**
     * @param ctx - Host context carrying the filesystem and the sandbox policy.
     * @param config - deployment caps on one page or one listing.
     */
    constructor(ctx: Context, config: Config);
    /**
     * Read one page of lines from a UTF-8 file readable by the filesystem backend.
     * @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
     * @param path - absolute path or path relative to the workspace root; files outside it are allowed.
     * @param range - the line window; omitted fields take the page defaults.
     * @param signal - caller cancellation.
     * @returns the page, the file's version at the stat before it, and whether it reaches the last line.
     */
    read(workspaceFileScope: WorkspaceFileScope, path: string, range: WorkspaceFileRange, signal: AbortSignal): Promise<WorkspaceFileText>;
    /**
     * Read one byte window of a regular file readable by the filesystem backend: raw
     * bytes, no text decoding and no binary rejection.
     * @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
     * @param path - absolute path or path relative to the workspace root; files outside it are allowed.
     * @param range - the byte window; omitted fields take the window defaults.
     * @param signal - caller cancellation.
     * @returns the window in base64, the file's version and size at the stat before it, and whether it reaches the last byte.
     */
    readBytes(workspaceFileScope: WorkspaceFileScope, path: string, range: WorkspaceByteRange, signal: AbortSignal): Promise<WorkspaceFileBytes>;
    /**
     * Read a complete regular file as bytes, subject to the configured full-file cap.
     * @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
     * @param path - absolute or workspace-relative file path.
     * @param signal - caller cancellation.
     * @returns one complete base64 window with offset zero and eof true; oversized files fail with too-large.
     */
    readAll(workspaceFileScope: WorkspaceFileScope, path: string, signal: AbortSignal): Promise<WorkspaceFileBytes>;
    /**
     * Read a complete file relative to another file's directory, including outside the workspace.
     * @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
     * @param path - base file, absolute or workspace-relative.
     * @param relativePath - relative filesystem path, not a URL or absolute path.
     * @param signal - caller cancellation.
     * @returns the complete related file using the ordinary file-size and access checks.
     */
    readRelated(workspaceFileScope: WorkspaceFileScope, path: string, relativePath: string, signal: AbortSignal): Promise<WorkspaceFileBytes>;
    /**
     * Report one regular file's identity, version, and size without its content.
     * @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
     * @param path - absolute path or path relative to the workspace root; files outside it are allowed.
     * @param signal - caller cancellation.
     * @returns the file's absolute path, current version, and byte size.
     */
    stat(workspaceFileScope: WorkspaceFileScope, path: string, signal: AbortSignal): Promise<WorkspaceFileStat>;
    /**
     * List the direct children of one directory inside the Session's workspace.
     * @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
     * @param path - workspace path, absolute or relative to the workspace root.
     * @param signal - caller cancellation.
     * @returns the directory's children in the backend's stable name order, bounded by the entry cap.
     */
    list(workspaceFileScope: WorkspaceFileScope, path: string, signal: AbortSignal): Promise<WorkspaceDirectoryListing>;
    /**
     * Stream every `fs/observed` observation of a file inside the Session's
     * workspace. Only instrumented filesystem operations report here; the OS is
     * not watched.
     * @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
     * @param signal - generation cancellation.
     * @returns `ready` once the Host observation queue is active and the workspace
     *   root is resolved, then queued and live observations in emission order.
     */
    changes(workspaceFileScope: WorkspaceFileScope, signal: AbortSignal): AsyncIterable<WorkspaceFileWatchFrame>;
    /** Apply the page defaults and caps here, so the request never carries them implicitly. */
    private resolvePage;
    /** Apply the byte-window defaults and cap; a window above the cap is refused, not shortened. */
    private resolveWindow;
    /**
     * Inspect the requested path itself before resolution follows its final
     * component. Directory containment is checked separately by `list`.
     */
    private inspect;
    /** Resolve an inspected path and refuse it unless the workspace contains it. */
    private confine;
    /**
     * All gates for a regular file, ending in the one stat that names its version
     * and size. The stat re-checks what `lstat` saw: the file may have gone or
     * changed kind in between.
     */
    private locateFile;
    private statOf;
    /** Stream the file as text and cut the page, classifying the backend's non-text refusal. */
    private cutPage;
}
export default WorkspaceFiles;
//# sourceMappingURL=index.d.ts.map
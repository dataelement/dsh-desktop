/**
 * Host-filesystem implementation of `ctx.fs`. Realpath-derived target identity makes aliases
 * share stale guards, and writes through a symlink update its target without replacing the link.
 * @module @deepseek-ai/dsh-fs-local
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { FileSystem, FsVersion } from '@deepseek-ai/dsh-fs';
import type { FsDirEntry, FsEditOutcome, FsEditRequest, FsInfo, FsPathInfo, FsTarget, FsWriteIntent, FsWriteOutcome } from '@deepseek-ai/dsh-fs';
import type { FsIoInternals } from './fsio.ts';
/** Configuration for the local filesystem backend. */
export interface Config {
    /** Base directory for relative paths. Defaults to `process.cwd()`. */
    cwd?: string;
    /**
     * Exclusive UTF-8 byte limit on each overwrite-diff side, capped by the
     * runtime's safe allocation/decode maximum. Defaults to 10 MiB.
     */
    diffBasisMaxBytes?: number;
}
type ResolvedConfig = Required<Config>;
/**
 * The host-filesystem backend. Reads resolve relative paths from {@link Config.cwd}
 * (a resolution default, NOT a containment boundary — see the filesystem
 * capability-seam Agent Note); enforce
 * containment with a stricter backend or a `tools/execute` permission plugin.
 */
export declare class LocalFileSystem extends FileSystem {
    static Config: z<Config>;
    /** Validated config (schemastery applied the defaults before construction). */
    readonly config: ResolvedConfig;
    /** Test hook forwarded to fsio for atomic-publication boundaries. */
    internals: FsIoInternals;
    /** Per-targetKey tail promise: serializes mutating ops so the read→guard→write
     * window can't interleave, making concurrent writes/edits deterministically
     * ordered (one wins, the rest see the new version and reject as stale). */
    private locks;
    constructor(ctx: Context, config: Config);
    /** Run `op` with exclusive access to `targetKey` (FIFO per key). */
    private withLock;
    resolve(path: string, opts?: {
        cwd?: string;
        signal?: AbortSignal;
    }): Promise<FsTarget>;
    processPath(target: FsTarget): string;
    processPathFromHostPath(hostPath: string): string | undefined;
    fileUrl(target: FsTarget): string;
    contains(parent: FsTarget, child: FsTarget): boolean;
    stat(target: FsTarget, signal?: AbortSignal): Promise<FsInfo | undefined>;
    lstat(path: string, opts?: {
        cwd?: string;
    }, signal?: AbortSignal): Promise<FsPathInfo | undefined>;
    readText(target: FsTarget, signal?: AbortSignal): Promise<string>;
    streamText(target: FsTarget, signal?: AbortSignal): Promise<AsyncIterable<string>>;
    readBytes(target: FsTarget, signal: AbortSignal | undefined, maxBytes: number): Promise<Uint8Array>;
    readByteRange(target: FsTarget, range: {
        offset: number;
        length: number;
    }, signal?: AbortSignal): Promise<Uint8Array>;
    listDir(target: FsTarget, signal?: AbortSignal): Promise<FsDirEntry[]>;
    writeText(target: FsTarget, content: string, expected?: FsWriteIntent, signal?: AbortSignal): Promise<FsWriteOutcome>;
    editText(target: FsTarget, edit: FsEditRequest, expected?: {
        version: FsVersion;
    }, signal?: AbortSignal): Promise<FsEditOutcome>;
    private versionAfterWrite;
}
export default LocalFileSystem;
//# sourceMappingURL=index.d.ts.map
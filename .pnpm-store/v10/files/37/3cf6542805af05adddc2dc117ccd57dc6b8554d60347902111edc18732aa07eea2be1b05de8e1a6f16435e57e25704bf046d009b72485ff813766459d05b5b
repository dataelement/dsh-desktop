/**
 * Instruction-file discovery and bounded, abort-aware provider reads.
 *
 * @module @deepseek-ai/dsh-agent-instructions/files
 */
import type { FileSystem, FsTarget, FsVersion } from '@deepseek-ai/dsh-fs';
import { type ResolvedConfig } from './config.ts';
import { type RenderedWorkspaceContext } from './render.ts';
/** An instruction candidate identified by absolute and model-facing paths. */
export interface InstructionFile {
    absolutePath: string;
    displayPath: string;
}
/** An instruction file whose UTF-8 content was read successfully. */
export interface LoadedInstructionFile extends InstructionFile {
    content: string;
    /** Provider freshness token when the file was loaded through `ctx.fs`. */
    version?: FsVersion;
}
/** Provider metadata for a probed scope candidate before its content is read. */
export interface ProbedInstructionFile extends InstructionFile {
    target: FsTarget;
    version: FsVersion;
    size?: number;
}
interface DiscoverOptions {
    cwd: string;
    dshHome?: string;
    projectRootMarkers?: string[];
    instructionFileCandidates?: string[];
    localInstructionFileCandidates?: string[];
    projectRoot?: string;
    signal?: AbortSignal;
}
interface LoadOptions extends DiscoverOptions {
    maxBytes: number;
    maxSourceBytes?: number;
    replacePreviousBaseline?: boolean;
}
/** Rendered baseline plus the successfully read and byte-budget-retained files. */
export interface RenderedInstructionSet {
    rendered: RenderedWorkspaceContext;
    /** Successfully read candidates before content deduplication and byte budgeting. */
    observed: LoadedInstructionFile[];
    /** Candidates retained by content deduplication and byte budgeting. */
    included: LoadedInstructionFile[];
}
/** Tri-state scope probe that distinguishes confirmed absence from provider failure. */
export type ScopeInstructionProbe = {
    kind: 'present';
    file: ProbedInstructionFile;
} | {
    kind: 'absent';
} | {
    kind: 'unavailable';
};
/**
 * Walk upward to the first directory containing a configured root marker.
 * @param cwd - absolute session working directory where the walk begins.
 * @param markers - child names that identify a project root.
 * @param fileSystem - optional provider used instead of host filesystem probes.
 * @param signal - cancellation for provider and host probes.
 * @returns the discovered project root, or `cwd` when no marker exists.
 * @throws the original marker metadata error or cancellation reason when a probe is unavailable.
 */
export declare function findProjectRoot(cwd: string, markers: readonly string[], fileSystem?: FileSystem, signal?: AbortSignal): Promise<string>;
/**
 * Build the inclusive root-to-cwd directory chain.
 * @param root - root directory expected to contain or equal `cwd`.
 * @param cwd - most-specific directory in the chain.
 * @returns directories ordered from broadest to most specific.
 */
export declare function ancestorChain(root: string, cwd: string): string[];
/**
 * Find descendant directories crossed between a cwd and a touched file.
 * @param root - session cwd that bounds nested discovery.
 * @param touchedPath - absolute path or path relative to `root`.
 * @returns descendant directories from shallowest through the touched file's parent.
 */
export declare function descendantDirsBetween(root: string, touchedPath: string): string[];
/**
 * Convert an absolute instruction path to its project-root-relative display form.
 * @param root - project root used as the display base.
 * @param path - absolute path to display.
 * @returns the root-relative path.
 */
export declare function relativeDisplay(root: string, path: string): string;
/**
 * Discover host-visible user-global and root-to-cwd instruction candidates.
 * All present candidates in each directory are returned; trimmed-content
 * duplicates are collapsed later, once content is read.
 * @param options - cwd, home, root marker, and candidate configuration.
 * @returns path-deduplicated instruction candidates in model precedence order.
 * @throws the original root-marker metadata error or cancellation reason when
 * discovery cannot identify the project root.
 */
export declare function discoverBaselineInstructionFiles(options: DiscoverOptions): Promise<InstructionFile[]>;
/**
 * Drop later candidates whose trimmed content duplicates an earlier sibling in
 * the same directory. Different directories never collapse even when identical;
 * within one directory the earliest candidate in discovery order is kept and its
 * original bytes are rendered. A candidate that symlinks a sibling resolves to
 * the same content and collapses here like any byte-identical real file.
 * @param files - loaded files in discovery order.
 * @returns the retained files in the same order.
 */
export declare function dedupInstructionFilesByDirectory(files: LoadedInstructionFile[]): LoadedInstructionFile[];
/**
 * Discover, read, and render the baseline instruction chain.
 * @param options - discovery, source-size, byte-budget, and cancellation configuration.
 * @param fileSystem - optional provider used instead of host filesystem reads.
 * @returns rendered baseline context, or undefined when nothing can be loaded.
 * @throws the original root-marker metadata error or cancellation reason when
 * discovery cannot identify the project root.
 */
export declare function loadBaselineInstructions(options: LoadOptions, fileSystem?: FileSystem): Promise<RenderedWorkspaceContext | undefined>;
/**
 * Load a baseline together with the files retained after rendering.
 * @param options - discovery, source-size, byte-budget, and cancellation configuration.
 * @param fileSystem - optional provider used instead of host filesystem reads.
 * @returns rendered context and retained files, an explicit empty replacement set, or undefined when empty or disabled.
 */
export declare function loadBaselineInstructionSet(options: LoadOptions, fileSystem?: FileSystem): Promise<RenderedInstructionSet | undefined>;
/**
 * Probe the current provider metadata for one per-candidate instruction scope.
 * @param scope - a {@link candidateScopeKey} identifying a directory and candidate file.
 * @param projectRoot - project root used to resolve and display project scopes.
 * @param resolved - normalized plugin configuration.
 * @param fileSystem - provider used to resolve and stat scope candidates.
 * @param signal - cancellation for provider probes.
 * @returns present metadata, confirmed absence, or temporary unavailability.
 */
export declare function probeScopeInstruction(scope: string, projectRoot: string, resolved: ResolvedConfig, fileSystem: FileSystem, signal?: AbortSignal): Promise<ScopeInstructionProbe>;
/**
 * Read one already-probed scope candidate under the configured source cap.
 * @param file - winning provider candidate and its metadata snapshot.
 * @param maxSourceBytes - maximum UTF-8 bytes accepted from the source.
 * @param fileSystem - provider used for the streaming read.
 * @param signal - cancellation for provider streaming.
 * @returns loaded content with the probed version, or undefined when unavailable.
 */
export declare function readScopeInstruction(file: ProbedInstructionFile, maxSourceBytes: number, fileSystem: FileSystem, signal?: AbortSignal): Promise<LoadedInstructionFile | undefined>;
export {};
//# sourceMappingURL=files.d.ts.map
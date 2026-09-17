/**
 * Durable whole-generation publication for JSONL Session artifacts.
 *
 * Format packages transform parsed JSON values. This module owns the physical
 * encoding, exact source identity, immutable generation files, and exclusive
 * current-generation publication for both configured JSONL suffixes.
 * @module @deepseek-ai/dsh-session-persistence-jsonl/generation
 */
import { type FileHandle } from 'node:fs/promises';
import type { SessionFormatArtifact, SessionFormatJsonValue, SessionFormatRestore } from '@deepseek-ai/dsh-session-format';
import type { JsonlCompression } from './format.ts';
import { publishNewFileWin32 } from './win32.ts';
/** Pure adapter between backend-owned JSONL framing and the format catalog. */
export interface JsonlGenerationFormatAdapter {
    readonly currentVersion: number;
    /** Create the single-pass codec and migration state for a historical header. */
    createRestore(header: Record<string, unknown>): SessionFormatRestore;
    /** Encode one current header record without materializing body rows. */
    encodeHeader(header: SessionFormatArtifact['header'], inheritedEventCount: number): SessionFormatJsonValue;
    /** Encode one current event record. */
    encodeEvent(event: SessionFormatArtifact['events'][number]): SessionFormatJsonValue;
    /** Classify a supported-version artifact that policy refuses to migrate. */
    isUnsupportedMigrationError?(error: unknown): error is Error;
}
/** Inputs for preparing one historical generation and publishing its current successor later. */
export interface PrepareJsonlMigrationOptions {
    /** Immutable generation selected by the backend resolver. */
    readonly sourcePath: string;
    /** Version selected from the source filename and independently checked against its header. */
    readonly sourceVersion: number;
    /** Canonical filename for `format.currentVersion` in the same Session directory. */
    readonly currentPath: string;
    readonly compression: JsonlCompression;
    readonly format: JsonlGenerationFormatAdapter;
    /** Validate one selected historical header's identity before any migration write. */
    readonly validateHistoricalHeader?: (header: Readonly<Record<string, unknown>>) => void | Promise<void>;
    /** Validate the staged file in an isolated worker before publication. */
    readonly verifyCurrentFile: (path: string, compression: JsonlCompression, expectedId: string, expectedEventCount: number, expectedPrefix?: JsonlExpectedPrefix, signal?: AbortSignal) => Promise<JsonlVerifiedGeneration>;
    readonly signal?: AbortSignal;
}
/** Small physical identity returned by an isolated generation verifier. */
export interface JsonlVerifiedGeneration {
    readonly identity: JsonlPhysicalIdentity;
    readonly bytes: number;
    readonly digest: string;
}
/** Physical byte prefix already proven to be a valid complete generation. */
export interface JsonlExpectedPrefix {
    readonly bytes: number;
    readonly digest: string;
}
/** A historical source changed after its single decode and migration pass. */
export declare class JsonlGenerationSourceChangedError extends Error {
    readonly path: string;
    readonly name = "JsonlGenerationSourceChangedError";
    /** @param path - historical generation whose revision changed. */
    constructor(path: string);
}
/** Current logical state prepared independently from durable publication. */
export interface PreparedJsonlMigration {
    readonly sourceIdentity: JsonlPhysicalIdentity;
    readonly artifact: SessionFormatArtifact;
    /** Encode, verify, and exclusively publish once; every call shares the same success or failure. */
    publish(): Promise<JsonlPhysicalIdentity>;
}
/** A historical artifact is intact, but the format edge refuses its contents. */
export declare class JsonlGenerationUnsupportedMigrationError extends Error {
    readonly fromVersion: number;
    readonly reason: Error;
    readonly name = "JsonlGenerationUnsupportedMigrationError";
    /**
     * @param fromVersion - unchanged source generation version.
     * @param reason - format-edge refusal.
     */
    constructor(fromVersion: number, reason: Error);
}
/** A current-generation filename already names different or invalid bytes. */
export declare class JsonlGenerationTargetConflictError extends Error {
    readonly path: string;
    readonly reason: Error;
    readonly name = "JsonlGenerationTargetConflictError";
    /**
     * @param path - immutable target that prevented exclusive publication.
     * @param reason - why the existing target cannot be accepted.
     */
    constructor(path: string, reason: Error);
}
/** Stat identity captured together with exact generation bytes. */
export interface JsonlPhysicalIdentity {
    readonly dev: bigint;
    readonly ino: bigint;
    readonly size: bigint;
    readonly mtimeNs: bigint;
    readonly ctimeNs: bigint;
}
/** Exact bytes of one stable file revision together with the stat identity that proved it stable. */
export interface StablePhysicalFile {
    readonly bytes: Buffer;
    readonly identity: JsonlPhysicalIdentity;
}
interface GenerationFileSystem {
    open(path: string, flags: string, mode?: number): Promise<FileHandle>;
    readFile(path: string, signal?: AbortSignal): Promise<Buffer>;
    readdir(path: string): Promise<string[]>;
    stat(path: string): Promise<JsonlPhysicalIdentity>;
    lstat(path: string): Promise<{
        isFile(): boolean;
        isSymbolicLink(): boolean;
    }>;
    link(existingPath: string, newPath: string): Promise<void>;
    rm(path: string): Promise<void>;
}
type GenerationBarrierPhase = 'before-source-check' | 'after-publication';
interface JsonlGenerationInternals {
    readonly fs: GenerationFileSystem;
    readonly randomToken: () => string;
    readonly platform: NodeJS.Platform;
    readonly publishNewWin32: typeof publishNewFileWin32;
    readonly barrier: (phase: GenerationBarrierPhase, attempt: number) => void | Promise<void>;
}
/** Dependency overrides for an isolated generation runtime. */
export type JsonlGenerationRuntimeOverrides = Partial<Omit<JsonlGenerationInternals, 'fs'>> & {
    readonly fs?: Partial<GenerationFileSystem>;
};
/** Bound generation operations used by production defaults and deterministic tests. */
export interface JsonlGenerationRuntime {
    readStable(path: string, signal?: AbortSignal): Promise<StablePhysicalFile>;
    prepare(options: PrepareJsonlMigrationOptions): Promise<PreparedJsonlMigration>;
    verify(path: string, compression: JsonlCompression, expectedId: string, expectedEventCount: number, expectedPrefix?: JsonlExpectedPrefix): Promise<JsonlVerifiedGeneration>;
}
/**
 * Read one stable revision of a JSONL file with a single retry. If an append
 * overlaps both reads, return the second read's committed pre-read prefix
 * instead of starving behind a continuous writer.
 * @param path - the generation file to read.
 * @param signal - optional cancellation for the stat/read work.
 * @returns the stable bytes (or the committed prefix) and their stat identity.
 */
export declare function readStableJsonlFile(path: string, signal?: AbortSignal): Promise<StablePhysicalFile>;
/**
 * Read and validate one complete current generation for an isolated verifier.
 * @param path - staged or competing current-generation path.
 * @param compression - configured physical encoding.
 * @param expectedId - Session identity expected in the header.
 * @param expectedEventCount - exact logical event count expected after decoding.
 * @param expectedPrefix - verified migration prefix; an append tail may be present and is not validated.
 * @returns stable physical identity and digest for publication comparison.
 */
export declare function verifyJsonlCurrentGeneration(path: string, compression: JsonlCompression, expectedId: string, expectedEventCount: number, expectedPrefix?: JsonlExpectedPrefix): Promise<JsonlVerifiedGeneration>;
/**
 * Decode and migrate one historical generation without writing its successor.
 * @param options - resolved source, current target, format adapter, and load cancellation.
 * @returns the current artifact and an idempotent explicit publication operation.
 */
export declare function prepareJsonlMigration(options: PrepareJsonlMigrationOptions): Promise<PreparedJsonlMigration>;
/**
 * Create one generation runtime with fixed filesystem and publication dependencies.
 * @param overrides - deterministic filesystem, platform, and race dependencies.
 * @returns bound generation operations.
 */
export declare function createJsonlGenerationRuntime(overrides?: JsonlGenerationRuntimeOverrides): JsonlGenerationRuntime;
export {};
//# sourceMappingURL=generation.d.ts.map
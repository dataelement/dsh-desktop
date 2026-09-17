/**
 * Configuration normalization for workspace instruction discovery and rendering.
 *
 * @module @deepseek-ai/dsh-agent-instructions/config
 */
import z from '@deepseek-ai/schemastery';
/** User-facing workspace instruction loader configuration. */
export interface Config {
    /** Harness home containing the fixed user-global `AGENTS.md`; defaults to `$DSH_HOME` or `~/.dsh`. */
    dshHome?: string;
    /** Directory entries that identify the project root while walking upward from the session cwd. */
    projectRootMarkers?: string[];
    /** UTF-8 byte cap for one rendered baseline or dynamic batch; non-positive or non-finite disables loading. */
    maxBytes: number;
    /** Maximum UTF-8 bytes read from one instruction file; larger files are ignored. */
    maxSourceBytes?: number;
    /**
     * Ordered same-directory project candidates; every existing file loads, with
     * per-directory trimmed-content duplicates collapsed to the earliest candidate.
     */
    instructionFileCandidates?: string[];
    /**
     * Ordered same-directory local-overlay candidates loaded after the base files
     * under the same per-directory trimmed-content dedup; empty disables the overlay.
     */
    localInstructionFileCandidates?: string[];
}
export declare const Config: z<Config>;
/** Normalized instruction discovery configuration. */
export interface ResolvedDiscoveryConfig {
    dshHome: string;
    projectRootMarkers: string[];
    instructionFileCandidates: string[];
    localInstructionFileCandidates: string[];
}
/** Normalized configuration used by discovery and reconciliation. */
export interface ResolvedConfig extends ResolvedDiscoveryConfig {
    maxBytes: number;
    maxSourceBytes: number;
}
/**
 * Identify the discovery, precedence, and budget semantics of one baseline.
 * @param config - normalized plugin configuration.
 * @param cwd - absolute session working directory.
 * @param projectRoot - project root selected for the current baseline.
 * @returns stable serialized identity for compatibility checks on resume.
 */
export declare function workspaceBaselineIdentity(config: ResolvedConfig, cwd: string, projectRoot: string): string;
/**
 * Resolve defaults, the harness home, and valid same-directory candidates.
 * @param config - user-facing plugin configuration.
 * @returns normalized runtime configuration.
 */
export declare function resolveConfig(config: Config): ResolvedConfig;
/**
 * Resolve the subset of configuration used before instruction content is rendered.
 * @param config - optional discovery controls.
 * @returns normalized home, root markers, and instruction candidates.
 */
export declare function resolveDiscoveryConfig(config: Pick<Config, 'dshHome' | 'projectRootMarkers' | 'instructionFileCandidates' | 'localInstructionFileCandidates'>): ResolvedDiscoveryConfig;
//# sourceMappingURL=config.d.ts.map
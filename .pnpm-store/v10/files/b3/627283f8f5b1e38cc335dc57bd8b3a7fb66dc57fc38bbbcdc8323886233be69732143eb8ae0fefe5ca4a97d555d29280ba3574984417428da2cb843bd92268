/**
 * Local filesystem skill provider.
 *
 * This package is one implementation of the `ctx.skills` provider registry. It
 * discovers directory-bundle and flat Markdown skills from project, custom, and
 * user roots, parses YAML frontmatter, and loads bodies through `ctx.fs` when a
 * filesystem service is present.
 *
 * @module @deepseek-ai/dsh-skill-filesystem
 */
import type { Context } from '@deepseek-ai/cordis';
import type Schema from '@deepseek-ai/schemastery';
import { type SkillCandidate, type SkillDefinition, type SkillLookupOptions, type SkillProvider, type SkillProviderControl, type SkillProviderObservation } from '@deepseek-ai/dsh-skill';
export declare const name = "skill-filesystem";
export declare const inject: string[];
/** Local filesystem skill provider configuration. */
export interface Config {
    /** Unique provider name. Defaults to `filesystem`. */
    providerName?: string;
    /** Whether project and user roots are included around custom roots. */
    includeDefaultRoots?: boolean;
    /** DeepSeek Harness config root. Defaults to `$DSH_HOME` or `~/.dsh`. */
    dshHome?: string;
    /** Shared agent config root. Defaults to `$DSH_AGENTS_HOME` or `~/.agents`. */
    agentsHome?: string;
    /** Additional skill roots scanned after project roots and before user roots. */
    customSkillDirs?: string[];
    /** Whether host-local skill roots are watched for catalog changes. */
    watch?: boolean;
    /** Whether Chokidar uses polling instead of native filesystem events. */
    watchUsePolling?: boolean;
    /** Milliseconds a changed skill entry must remain stable before it is observed. */
    watchStabilityThresholdMs?: number;
    /** Milliseconds between Chokidar stability or polling probes. */
    watchPollIntervalMs?: number;
    /** Maximum distinct project roots whose skill directories remain watched. */
    watchMaxProjects?: number;
    /** Whether watched symbolic links follow their target files. */
    watchFollowSymlinks?: boolean;
    /** Bundled skill root; defaults to `$DSH_BUNDLED_SKILL_DIR` when default roots are included, otherwise mounts none. */
    bundledSkillDir?: string;
}
export declare const Config: Schema<Config>;
/** Register the local filesystem skill provider on `ctx.skills`. */
export declare function apply(ctx: Context, config?: Config): void;
/** Provider that maps local project/user skill roots into `ctx.skills`. */
export declare class FileSystemSkillProvider implements SkillProvider {
    private readonly ctx;
    readonly name: string;
    private readonly includeDefaultRoots;
    private readonly dshHome;
    private readonly agentsHome;
    private readonly customSkillDirs;
    private readonly watchManager;
    private readonly bundledSkillDir;
    private disposal;
    constructor(ctx: Context, control: SkillProviderControl, config?: Config);
    /**
     * Discover local skill summaries for a cwd-sensitive workspace.
     * @param options - lookup options; `cwd` selects the project roots to scan.
     * @returns local provider candidates with stable root ranks; watcher startup
     *   failure returns readable candidates as an incomplete observation.
     */
    list(options: SkillLookupOptions): Promise<SkillCandidate[] | SkillProviderObservation>;
    /**
     * Load a complete local skill body from the candidate's file locator.
     * @param candidate - the winning candidate returned by this provider.
     * @param options - lookup options whose signal cancels filesystem reads.
     * @returns the full local skill, or `undefined` if the file disappeared.
     */
    get(candidate: SkillCandidate, options: SkillLookupOptions): Promise<SkillDefinition | undefined>;
    /**
     * Invalidate this provider synchronously after a first-party filesystem mutation.
     * @param path - host display path observed after a model-facing write or edit.
     */
    observeHostMutation(path: string): void;
    /**
     * Close every host watcher and contain late filesystem callbacks.
     * @returns a shared promise that settles when every watcher reaches quiescence.
     */
    dispose(): Promise<void>;
    private roots;
}
//# sourceMappingURL=index.d.ts.map
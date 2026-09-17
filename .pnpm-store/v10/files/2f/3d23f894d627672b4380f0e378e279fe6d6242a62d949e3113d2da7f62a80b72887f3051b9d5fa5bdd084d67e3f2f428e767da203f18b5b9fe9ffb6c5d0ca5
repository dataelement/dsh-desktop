/**
 * Tool-independent shell environment plugin: owns the `ctx.shellEnv` registry of
 * trusted, per-execution `DSH_*` variables consumed by the model-facing shell
 * tools (`dsh-tool-bash`, `dsh-tool-pwsh`). Built-in shell facts are owned by
 * the registry itself while plugins can register additional, enumerable facts
 * with effect-scoped disposal.
 *
 * @module @deepseek-ai/dsh-shell-env
 */
import { Service, type Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { DshEnvironment, DshEnvironmentKey } from '@deepseek-ai/dsh-shell';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
declare module '@deepseek-ai/cordis' {
    interface Context {
        shellEnv: ShellEnvRegistry;
    }
}
export declare const name = "shell-env";
export declare const inject: string[];
/** Plugin config (all optional — the built-in facts resolve without defaults). */
export interface Config {
    /** DeepSeek Harness home directory exposed as `DSH_HOME`; defaults to `$DSH_HOME` or `~/.dsh`. */
    dshHome?: string;
}
/** Runtime configuration schema for the shell-env plugin. */
export declare const Config: z<Config>;
/** Model-visible metadata for one managed `DSH_*` environment variable. */
export interface BashEnvVariable {
    /** Concise description of the environment fact represented by the variable. */
    description: string;
}
/**
 * A plugin contribution to the managed environment of each model shell call.
 * Declared keys make ownership conflicts detectable before the first command;
 * `resolve` computes only the values available for the current execution.
 */
export interface BashEnvContributor {
    /** Stable contributor name used in diagnostics and duplicate detection. */
    name: string;
    /** Complete set of `DSH_*` keys this contributor may return. */
    variables: Readonly<Record<DshEnvironmentKey, BashEnvVariable>>;
    /**
     * Resolve this contributor's available values for one tool execution.
     * @param execution - the shell tool execution and its optional calling agent.
     * @returns a partial map containing only keys declared in {@link variables}.
     */
    resolve(execution: ToolExecution): Readonly<Partial<Record<DshEnvironmentKey, string>>>;
}
/** An enumerable declaration returned by {@link ShellEnvRegistry.list}. */
export interface BashEnvVariableInfo extends BashEnvVariable {
    /** Contributor that owns the variable. */
    contributor: string;
    /** Declared `DSH_*` environment variable name. */
    key: DshEnvironmentKey;
}
/**
 * Registry (`ctx.shellEnv`) for trusted, per-execution `DSH_*` variables.
 * The namespace is rebuilt for every model shell call: ambient `DSH_*` values
 * are discarded by the executor, then the registry's current snapshot is
 * injected. Built-in shell facts remain owned by the registry itself while
 * plugins can register additional, enumerable facts with effect-scoped
 * disposal.
 */
export declare class ShellEnvRegistry extends Service {
    private readonly contributors;
    private readonly keyOwners;
    private readonly dshHome;
    /**
     * Create and install the `ctx.shellEnv` service.
     * @param ctx - Cordis context that owns the service and registrations.
     * @param config - home-directory configuration for the built-in variables.
     */
    constructor(ctx: Context, config?: Config);
    /**
     * Register one environment contributor. Names and keys are unique; built-in
     * keys are reserved. Registration is disposed with the calling plugin fiber.
     * @param contributor - declared key ownership and per-execution resolver.
     * @returns the disposer that unregisters the contribution.
     */
    register(contributor: BashEnvContributor): () => void;
    /**
     * Build the trusted `DSH_*` snapshot for one shell tool execution.
     * @param execution - the current tool execution.
     * @returns an immutable environment overlay containing built-ins and current contributions.
     */
    collect(execution: ToolExecution): DshEnvironment;
    /**
     * Enumerate plugin-contributed variables without executing their resolvers.
     * @returns declarations sorted by environment variable name.
     */
    list(): BashEnvVariableInfo[];
}
/**
 * Load the shell-env plugin: register the `ctx.shellEnv` registry service.
 * @param ctx - Cordis context that owns the service and registrations.
 * @param config - home-directory configuration for the built-in variables.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map
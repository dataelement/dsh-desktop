import { Plugin, UserConfig as UserConfig$1, BuildEnvironmentOptions, ConfigEnv, LogLevel, FilterPattern } from 'vite';
export { LogLevel, createLogger, defineConfig as defineViteConfig, mergeConfig } from 'vite';
import { TransformConfig } from '@swc/core';

interface ExternalOptions {
    exclude?: string[];
    include?: string[];
}
/**
 * Automatically externalize dependencies.
 *
 * @deprecated use `build.externalizeDeps` config option instead
 */
declare function externalizeDepsPlugin(options?: ExternalOptions): Plugin | null;

interface BytecodeOptions {
    chunkAlias?: string | string[];
    transformArrowFunctions?: boolean;
    removeBundleJS?: boolean;
    protectedStrings?: string[];
}
/**
 * Compile source code to v8 bytecode.
 *
 * @deprecated use `build.bytecode` config option instead
 */
declare function bytecodePlugin(options?: BytecodeOptions): Plugin | null;

interface IsolatedEntriesMixin {
    /**
     * Build each entry point as an isolated bundle without code splitting.
     *
     * When enabled, each entry will include all its dependencies inline,
     * preventing automatic code splitting across entries and ensuring each
     * output file is fully standalone.
     *
     * **Important**: When using `isolatedEntries` in `preload` config, you
     * should also disable `build.externalizeDeps` to ensure third-party dependencies
     * from `node_modules` are bundled together, which is required for Electron
     * sandbox support.
     *
     * @experimental
     * @default false
     */
    isolatedEntries?: boolean;
}
interface ExternalizeDepsMixin {
    /**
     * Options pass on to `externalizeDeps` plugin in electron-vite.
     *
     * Automatically externalize dependencies.
     *
     * @default true
     */
    externalizeDeps?: boolean | ExternalOptions;
}
interface BytecodeMixin {
    /**
     * Options pass on to `bytecode` plugin in electron-vite.
     * https://electron-vite.org/guide/source-code-protection#options
     *
     * Compile source code to v8 bytecode.
     */
    bytecode?: boolean | BytecodeOptions;
}
interface MainBuildOptions extends BuildEnvironmentOptions, ExternalizeDepsMixin, BytecodeMixin {
}
interface PreloadBuildOptions extends BuildEnvironmentOptions, ExternalizeDepsMixin, BytecodeMixin, IsolatedEntriesMixin {
}
interface RendererBuildOptions extends BuildEnvironmentOptions, IsolatedEntriesMixin {
}
interface BaseViteConfig<T> extends Omit<UserConfig$1, 'build'> {
    /**
     * Build specific options
     */
    build?: T;
}
interface MainViteConfig extends BaseViteConfig<MainBuildOptions> {
}
interface PreloadViteConfig extends BaseViteConfig<PreloadBuildOptions> {
}
interface RendererViteConfig extends BaseViteConfig<RendererBuildOptions> {
}
interface UserConfig {
    /**
     * Vite config options for electron main process
     *
     * @see https://vitejs.dev/config/
     */
    main?: MainViteConfig;
    /**
     * Vite config options for electron renderer process
     *
     * @see https://vitejs.dev/config/
     */
    renderer?: RendererViteConfig;
    /**
     * Vite config options for electron preload scripts
     *
     * @see https://vitejs.dev/config/
     */
    preload?: PreloadViteConfig;
}
type ElectronViteConfigFnObject = (env: ConfigEnv) => UserConfig;
type ElectronViteConfigFnPromise = (env: ConfigEnv) => Promise<UserConfig>;
type ElectronViteConfigFn = (env: ConfigEnv) => UserConfig | Promise<UserConfig>;
type ElectronViteConfigExport = UserConfig | Promise<UserConfig> | ElectronViteConfigFnObject | ElectronViteConfigFnPromise | ElectronViteConfigFn;
/**
 * Type helper to make it easier to use `electron.vite.config.*`
 * accepts a direct {@link UserConfig} object, or a function that returns it.
 * The function receives a object that exposes two properties:
 * `command` (either `'build'` or `'serve'`), and `mode`.
 */
declare function defineConfig(config: UserConfig): UserConfig;
declare function defineConfig(config: Promise<UserConfig>): Promise<UserConfig>;
declare function defineConfig(config: ElectronViteConfigFnObject): ElectronViteConfigFnObject;
declare function defineConfig(config: ElectronViteConfigFnPromise): ElectronViteConfigFnPromise;
declare function defineConfig(config: ElectronViteConfigExport): ElectronViteConfigExport;
type InlineConfig = Omit<UserConfig$1, 'base'> & {
    configFile?: string | false;
    envFile?: false;
    ignoreConfigWarning?: boolean;
};
interface ResolvedConfig {
    config?: UserConfig;
    configFile?: string;
    configFileDependencies: string[];
}
declare function resolveConfig(inlineConfig: InlineConfig, command: 'build' | 'serve', defaultMode?: string): Promise<ResolvedConfig>;
declare function loadConfigFromFile(configEnv: ConfigEnv, configFile?: string, configRoot?: string, logLevel?: LogLevel, ignoreConfigWarning?: boolean): Promise<{
    path: string;
    config: UserConfig;
    dependencies: string[];
}>;

declare function createServer(inlineConfig: InlineConfig | undefined, options: {
    rendererOnly?: boolean;
}): Promise<void>;

/**
 * Bundles the electron app for production.
 */
declare function build(inlineConfig?: InlineConfig): Promise<void>;

declare function preview(inlineConfig: InlineConfig | undefined, options: {
    skipBuild?: boolean;
}): Promise<void>;

/**
 * Load `.env` files within the `envDir` (default: `process.cwd()`) .
 * By default, only env variables prefixed with `VITE_`, `MAIN_VITE_`, `PRELOAD_VITE_` and
 * `RENDERER_VITE_` are loaded, unless `prefixes` is changed.
 */
declare function loadEnv(mode: string, envDir?: string, prefixes?: string | string[]): Record<string, string>;

type SwcOptions = {
    include?: FilterPattern;
    exclude?: FilterPattern;
    transformOptions?: TransformConfig;
};
/**
 * Use SWC to support for emitting type metadata for decorators.
 * When using `swcPlugin`, you need to install `@swc/core`.
 */
declare function swcPlugin(options?: SwcOptions): Plugin;

export { build, bytecodePlugin, createServer, defineConfig, externalizeDepsPlugin, loadConfigFromFile, loadEnv, preview, resolveConfig, swcPlugin };
export type { BytecodeOptions, ElectronViteConfigExport, ElectronViteConfigFn, ElectronViteConfigFnObject, ElectronViteConfigFnPromise, ExternalOptions, InlineConfig, MainViteConfig, PreloadViteConfig, RendererViteConfig, ResolvedConfig, SwcOptions, UserConfig };

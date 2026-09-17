import { EventEmitter } from 'node:events';
import { BuildType, IRebuilder, RebuildMode } from './types.js';
import { ModuleType } from './module-walker.js';
export interface RebuildOptions {
    /**
     * The path to the `node_modules` directory to rebuild.
     */
    buildPath: string;
    /**
     * The version of Electron to build against.
     */
    electronVersion: string;
    /**
     * Override the target platform to something other than the host system platform.
     * Note: This only applies to downloading prebuilt binaries. **It is not possible to cross-compile native modules.**
     *
     * @defaultValue The system {@link https://nodejs.org/api/process.html#processplatform | `process.platform`} value
     */
    platform?: NodeJS.Platform;
    /**
     * Override the target rebuild architecture to something other than the host system architecture.
     *
     * @defaultValue The system {@link https://nodejs.org/api/process.html#processarch | `process.arch`} value
     */
    arch?: string;
    /**
     * An array of module names to rebuild in addition to detected modules
     * @default []
     */
    extraModules?: string[];
    /**
     * An array of module names to rebuild. **Only** these modules will be rebuilt.
     */
    onlyModules?: string[] | null;
    /**
     * Force a rebuild of modules regardless of their current build state.
     */
    force?: boolean;
    /**
     * URL to download Electron header files from.
     * @defaultValue `https://www.electronjs.org/headers`
     */
    headerURL?: string;
    /**
     * Array of types of dependencies to rebuild. Possible values are `prod`, `dev`, and `optional`.
     *
     * @defaultValue `['prod', 'optional']`
     */
    types?: ModuleType[];
    /**
     * Whether to rebuild modules sequentially or in parallel.
     *
     * @defaultValue `sequential`
     */
    mode?: RebuildMode;
    /**
     * Rebuilds a Debug build of target modules. If this is `false`, a Release build will be generated instead.
     *
     * @defaultValue false
     */
    debug?: boolean;
    /**
     * Enables hash-based caching to speed up local rebuilds.
     *
     * @experimental
     * @defaultValue false
     */
    useCache?: boolean;
    /**
     * Whether to use the `clang` executable that Electron uses when building.
     * This will guarantee compiler compatibility.
     *
     * @defaultValue false
     */
    useElectronClang?: boolean;
    /**
     * Sets a custom cache path for the {@link useCache} option.
     * @experimental
     * @defaultValue a `.electron-rebuild-cache` folder in the `os.homedir()` directory
     */
    cachePath?: string;
    /**
     * GitHub tag prefix passed to {@link https://www.npmjs.com/package/prebuild-install | `prebuild-install`}.
     * @defaultValue `v`
     */
    prebuildTagPrefix?: string;
    /**
     * Path to the root of the project if using npm or yarn workspaces.
     */
    projectRootPath?: string;
    /**
     * Override the Application Binary Interface (ABI) version for the version of Electron you are targeting.
     * Only use when targeting nightly releases.
     *
     * @see the {@link https://github.com/electron/node-abi | electron/node-abi} repository for a list of Electron and Node.js ABIs
     */
    forceABI?: number;
    /**
     * Disables the copying of `.node` files if not needed.
     * @defaultValue false
     */
    disablePreGypCopy?: boolean;
    /**
     * Skip prebuild download and rebuild module from source.
     *
     * @defaultValue false
     */
    buildFromSource?: boolean;
    /**
     * Array of module names to ignore during the rebuild process.
     */
    ignoreModules?: string[];
    /**
     * Number of parallel compile jobs `node-gyp` should run, passed through as node-gyp's `--jobs` flag.
     *
     * @defaultValue node-gyp's own default when unset
     */
    jobs?: number;
}
export interface RebuilderOptions extends RebuildOptions {
    lifecycle: EventEmitter;
}
export declare class Rebuilder implements IRebuilder {
    private ABIVersion;
    private moduleWalker;
    rebuilds: (() => Promise<void>)[];
    lifecycle: EventEmitter;
    buildPath: string;
    electronVersion: string;
    platform: NodeJS.Platform;
    arch: string;
    force: boolean;
    headerURL: string;
    mode: RebuildMode;
    debug: boolean;
    useCache: boolean;
    cachePath: string;
    prebuildTagPrefix: string;
    msvsVersion?: string;
    useElectronClang: boolean;
    disablePreGypCopy: boolean;
    buildFromSource: boolean;
    ignoreModules: string[];
    jobs?: number;
    constructor(options: RebuilderOptions);
    get ABI(): string;
    get buildType(): BuildType;
    rebuild(): Promise<void>;
    modulesToRebuild(): Promise<string[]>;
    rebuildModuleAt(modulePath: string): Promise<void>;
}
export type RebuildResult = Promise<void> & {
    lifecycle: EventEmitter;
};
export declare function rebuild(options: RebuildOptions): RebuildResult;

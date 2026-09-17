import { LogLevel } from "builder-util";
import { PackageJson } from "./types";
import * as fs from "fs-extra";
export declare enum LogMessageByKey {
    PKG_DUPLICATE_REF = "duplicate dependency references",
    PKG_DUPLICATE_REF_UNRESOLVED = "unresolved duplicate dependency references",
    PKG_NOT_FOUND = "cannot find path for dependency",
    PKG_NOT_ON_DISK = "dependency not found on disk",
    PKG_SELF_REF = "self-referential dependencies",
    PKG_OPTIONAL_NOT_INSTALLED = "missing optional dependencies",
    PKG_OPTIONAL_PLATFORM_NOT_INSTALLED = "platform-specific optional dependencies not bundled \u2014 add them to your project's optionalDependencies if your app requires them (pnpm 10+ does not auto-install transitive platform binaries)",
    PKG_COLLECTOR_OUTPUT = "collector stderr output",
    PKG_VERSION_OVERRIDDEN = "dependencies resolved to a version outside the declared range (installed version accepted \u2014 likely resolved via package manager overrides)"
}
export declare const logMessageLevelByKey: Record<LogMessageByKey, LogLevel>;
export type Package = {
    packageDir: string;
    packageJson: PackageJson;
};
type JsonCache = Record<string, Promise<PackageJson | null>>;
type RealPathCache = Record<string, Promise<string>>;
type ExistsCache = Record<string, Promise<boolean>>;
type LstatCache = Record<string, Promise<fs.Stats | null>>;
type PackageCache = Record<string, Promise<Package | null>>;
type LogSummaryCache = Record<LogMessageByKey, string[]>;
export declare class ModuleManager {
    /** Cache for package.json contents (readJson) */
    readonly json: JsonCache;
    /** Cache for resolved real paths (if symlink, realpath; otherwise resolve) */
    readonly realPath: RealPathCache;
    /** Cache for file/directory existence checks */
    readonly exists: ExistsCache;
    /** Cache for lstat results */
    readonly lstat: LstatCache;
    /** Cache for package lookups (key: "packageName||fromDir||semverRange"). Use helper function `versionedCacheKey` */
    readonly packageData: PackageCache;
    /** For logging purposes, just track all dependencies for each key */
    readonly logSummary: LogSummaryCache;
    private readonly jsonMap;
    private readonly realPathMap;
    private readonly existsMap;
    private readonly lstatMap;
    private readonly packageDataMap;
    private readonly logSummaryMap;
    constructor();
    private createLogSummarySyncProxy;
    private createAsyncProxy;
    versionedCacheKey(pkg: {
        name: string;
        path: string;
        semver?: string;
    }): string;
    protected locatePackageVersionFromCacheKey(key: string): Promise<Package | null>;
    locatePackageVersion({ parentDir, pkgName, requiredRange, skipDownwardSearch, }: {
        /**
         * The directory to start searching from. Typed optional because pnpm JSON output can omit
         * the `path` field at runtime even when the TypeScript type says `string`. An undefined
         * parentDir is treated as "package not found" rather than a crash.
         */
        parentDir?: string;
        /**
         * The package name to locate. Typed optional for the same reason as parentDir: the pnpm
         * list JSON can omit `name`/`from` fields (e.g. when the root package.json has no name),
         * producing an undefined pkgName at runtime despite the TypeScript type.
         */
        pkgName?: string;
        requiredRange?: string;
        /**
         * When true, skip the BFS-based `downwardSearch`. Use for layouts that are guaranteed flat
         * (e.g. pnpm's `.pnpm` virtual store), where the downward walk burns thousands of `readdir`
         * / `lstat` calls and finds nothing.
         */
        skipDownwardSearch?: boolean;
    }): Promise<Package | null>;
    private searchForPackage;
    private semverSatisfies;
    /**
     * Upward search (hoisted)
     */
    private upwardSearch;
    /**
     * Breadth-first downward search from parentDir/node_modules
     * Looks for node_modules/\*\/node_modules/pkgName (and deeper)
     */
    private downwardSearch;
    /** Handle a non-scoped entry directory inside a node_modules folder. */
    private processEntry;
    /** Handle a scoped-package directory (@scope) inside a node_modules folder. */
    private processScope;
    /** Enqueue a node_modules directory for BFS only if it exists on disk and hasn't been visited. */
    private enqueueIfExists;
}
export {};

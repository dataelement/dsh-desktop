import { TmpDir } from "builder-util";
import { Lazy } from "lazy-val";
import { ModuleManager } from "./moduleManager";
import { PM } from "./packageManager";
import type { Dependency, DependencyGraph, NodeModuleInfo, PackageJson } from "./types";
export declare abstract class NodeModulesCollector<ProdDepType extends Dependency<ProdDepType, OptionalDepType>, OptionalDepType> {
    protected readonly rootDir: string;
    private readonly tempDirManager;
    private readonly nodeModules;
    protected readonly allDependencies: Map<string, ProdDepType>;
    protected readonly productionGraph: DependencyGraph;
    protected readonly cache: ModuleManager;
    protected isHoisted: Lazy<boolean>;
    constructor(rootDir: string, tempDirManager: TmpDir);
    /**
     * Retrieves and collects all Node.js modules for a given package.
     *
     * This method orchestrates the entire module collection process by:
     * 1. Fetching the dependency tree from the package manager
     * 2. Collecting all dependencies recursively
     * 3. Extracting workspace references if applicable
     * 4. Building a production dependency graph
     * 5. Hoisting the dependencies to their final locations
     * 6. Resolving and returning module information
     */
    getNodeModules({ packageName }: {
        packageName: string;
    }): Promise<{
        nodeModules: NodeModuleInfo[];
        logSummary: ModuleManager["logSummary"];
    }>;
    abstract readonly installOptions: {
        manager: PM;
        lockfile: string;
    };
    protected abstract getArgs(): string[];
    protected abstract extractProductionDependencyGraph(tree: Dependency<ProdDepType, OptionalDepType>, dependencyId: string): Promise<void>;
    protected abstract collectAllDependencies(tree: Dependency<ProdDepType, OptionalDepType>, appPackageName: string): Promise<void>;
    /**
     * Retrieves the dependency tree from the package manager.
     *
     * Executes the appropriate package manager command to fetch the dependency tree and writes
     * the output to a temporary file. Includes retry logic to handle transient failures such as
     * incomplete JSON output or missing files. Will retry up to 1 time with exponential backoff.
     */
    protected getDependenciesTree(pm: PM): Promise<ProdDepType>;
    /**
     * Parses the dependencies tree from shell command output.
     *
     **/
    protected parseDependenciesTree(shellOutput: string): ProdDepType | Promise<ProdDepType>;
    protected extractJsonFromPollutedOutput<T>(shellOutput: string): T;
    protected cacheKey(pkg: Pick<ProdDepType, "name" | "version" | "path">): string;
    protected normalizePackageVersion(key: string, pkg: ProdDepType): {
        id: string;
        pkgOverride: ProdDepType & {
            name: string;
        };
    };
    /**
     * Determines if a given dependency is a production dependency of a package.
     *
     * Checks both the dependencies and optionalDependencies of a package to see if
     * the specified dependency name is listed.
     *
     * @param depName - The name of the dependency to check
     * @param pkg - The package to search for the dependency in
     * @returns True if the dependency is found in either dependencies or optionalDependencies, false otherwise
     */
    protected isProdDependency(depName: string, pkg: ProdDepType): boolean;
    protected locatePackageWithVersion(depTree: Pick<ProdDepType, "name" | "version" | "path">): Promise<{
        packageDir: string;
        packageJson: PackageJson;
    } | null>;
    /**
     * Parses a dependency identifier string into name and version components.
     *
     * Handles both scoped packages (e.g., "@scope/pkg@1.2.3") and regular packages (e.g., "pkg@1.2.3").
     * If the identifier is malformed or cannot be parsed, defaults to treating the entire string as
     * the package name with an "unknown" version.
     */
    protected parseNameVersion(identifier: string): {
        name: string;
        version: string;
    };
    /**
     * Retrieves the dependency tree and handles workspace package self-references.
     *
     * If the project is a workspace project, this method removes the root package's self-reference
     * from the dependency tree to avoid circular dependencies. It promotes the root package's
     * direct dependencies to the top level of the tree.
     *
     * @param tree - The original dependency tree
     * @param packageName - The name of the package to check for and remove from the tree
     * @returns The extracted dependency subtree
     */
    protected getTreeFromWorkspaces(tree: ProdDepType, packageName: string): ProdDepType;
    private transformToHoisterTree;
    private _getNodeModules;
    protected logMissingDependency(pkgName: string): void;
    protected asyncExec(command: string, args: string[], cwd?: string): Promise<{
        stdout: string | undefined;
        stderr: string | undefined;
    }>;
    /**
     * Executes a command and streams its output to a file.
     *
     * Spawns a child process to execute the specified command with arguments, capturing stdout
     * to a file. On Windows, wraps the invocation in `powershell.exe -EncodedCommand` (UTF-16LE
     * base64) to avoid spawning `.cmd` shims directly and to eliminate shell-injection surface area.
     * Enables corepack strict mode by default but allows process.env overrides.
     *
     * Special handling for `npm list` exit code 1, which is expected in certain scenarios.
     *
     * @param command - The command to execute
     * @param args - Array of command-line arguments
     * @param cwd - The working directory to execute the command in
     * @param tempOutputFile - The path to the temporary file where stdout will be written
     * @returns Promise that resolves when the command completes successfully or rejects if it fails
     * @throws {Error} If the child process spawn fails or exits with a non-zero code
     */
    protected streamCollectorCommandToFile(command: string, args: string[], cwd: string, tempOutputFile: string): Promise<void>;
}
/**
 * Build the argv for invoking a Windows command through `powershell.exe -EncodedCommand`.
 *
 * Each token is wrapped in a PowerShell single-quoted string (with embedded single quotes doubled),
 * so no character is interpreted by a shell. The script:
 *   - pins `[Console]::OutputEncoding` to UTF-8 *without* a BOM so the JSON dependency tree is not
 *     corrupted by the console's OEM code page (and no BOM is prepended to break `JSON.parse`),
 *   - invokes the command via the call operator `&`,
 *   - re-emits the command's own exit code via `exit $LASTEXITCODE` (e.g. `npm list` returns 1 in
 *     expected scenarios, which the caller's shouldIgnore logic relies on).
 *
 * The whole script is base64-encoded as UTF-16LE per PowerShell's `-EncodedCommand` contract.
 */
export declare function buildPowerShellEncodedArgs(command: string, args: string[]): string[];

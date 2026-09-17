import { NodeModulesCollector } from "./nodeModulesCollector";
import { PM } from "./packageManager";
import { PnpmDependency } from "./types";
export declare class PnpmNodeModulesCollector extends NodeModulesCollector<PnpmDependency, PnpmDependency> {
    readonly installOptions: {
        manager: PM;
        lockfile: string;
    };
    private _allWorkspacePackages;
    private _pnpmMajorVersion;
    private readonly pnpmVersion;
    /**
     * Memo for `locateFromDepOrRoot`, keyed by `name@version`. pnpm's content-addressed virtual
     * store guarantees that any given `name@version` resolves to a single location on disk, so
     * once we've resolved a package we can short-circuit every subsequent lookup. This is the
     * dominant speedup for large workspaces where the `pnpm list --json` tree contains the same
     * `name@version` thousands of times (one entry per dependent).
     */
    private readonly locateMemo;
    /**
     * Visited set for `collectDepsRecursively`, keyed by `name@version`. Without this we re-walk
     * every shared subtree of the pnpm list output, exploding work in deep workspaces.
     */
    private readonly collectedDeps;
    /**
     * Returns the workspace packages to iterate over, gated by detected pnpm version:
     * - pnpm v11+: multi-entry workspace output → return the full parsed array
     * - pnpm < v11 / non-workspace / detection failure: single-tree behavior → return only [0]
     */
    private get allWorkspacePackages();
    protected getArgs(): string[];
    /**
     * Locate a package version, preferring the dep's own reported path before falling back to rootDir.
     * This is critical for pnpm non-hoisted (virtual store) setups where each package has its own
     * nested node_modules. Searching only from rootDir can resolve the wrong version when multiple
     * versions of a dep exist in the workspace.
     */
    private locateFromDepOrRoot;
    protected extractProductionDependencyGraph(tree: PnpmDependency, dependencyId: string): Promise<void>;
    protected collectAllDependencies(_tree: PnpmDependency, _appPackageName: string): Promise<void>;
    private collectDepsRecursively;
    protected getTreeFromWorkspaces(tree: PnpmDependency, packageName: string): PnpmDependency;
    protected parseDependenciesTree(jsonBlob: string): Promise<PnpmDependency>;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PnpmNodeModulesCollector = void 0;
const lazy_val_1 = require("lazy-val");
const moduleManager_1 = require("./moduleManager");
const nodeModulesCollector_1 = require("./nodeModulesCollector");
const packageManager_1 = require("./packageManager");
class PnpmNodeModulesCollector extends nodeModulesCollector_1.NodeModulesCollector {
    constructor() {
        super(...arguments);
        this.installOptions = {
            manager: packageManager_1.PM.PNPM,
            lockfile: "pnpm-lock.yaml",
        };
        // Raw backing field — all entries from `pnpm list --json`
        this._allWorkspacePackages = [];
        // Cached after parseDependenciesTree resolves the Lazy; 0 = safe default (treated as < v11)
        this._pnpmMajorVersion = 0;
        // Runs `pnpm --version` once and caches the major version number
        this.pnpmVersion = new lazy_val_1.Lazy(async () => {
            var _a;
            const result = await this.asyncExec((0, packageManager_1.getPackageManagerCommand)(packageManager_1.PM.PNPM), ["--version"]);
            const major = parseInt(((_a = result.stdout) !== null && _a !== void 0 ? _a : "0").split(".")[0], 10);
            return isNaN(major) ? 0 : major;
        });
        /**
         * Memo for `locateFromDepOrRoot`, keyed by `name@version`. pnpm's content-addressed virtual
         * store guarantees that any given `name@version` resolves to a single location on disk, so
         * once we've resolved a package we can short-circuit every subsequent lookup. This is the
         * dominant speedup for large workspaces where the `pnpm list --json` tree contains the same
         * `name@version` thousands of times (one entry per dependent).
         */
        this.locateMemo = new Map();
        /**
         * Visited set for `collectDepsRecursively`, keyed by `name@version`. Without this we re-walk
         * every shared subtree of the pnpm list output, exploding work in deep workspaces.
         */
        this.collectedDeps = new Set();
    }
    /**
     * Returns the workspace packages to iterate over, gated by detected pnpm version:
     * - pnpm v11+: multi-entry workspace output → return the full parsed array
     * - pnpm < v11 / non-workspace / detection failure: single-tree behavior → return only [0]
     */
    get allWorkspacePackages() {
        if (this._pnpmMajorVersion >= 11) {
            return this._allWorkspacePackages;
        }
        return this._allWorkspacePackages.slice(0, 1);
    }
    getArgs() {
        return ["list", "--prod", "--json", "--depth", "Infinity", "--silent", "--loglevel=error"];
    }
    /**
     * Locate a package version, preferring the dep's own reported path before falling back to rootDir.
     * This is critical for pnpm non-hoisted (virtual store) setups where each package has its own
     * nested node_modules. Searching only from rootDir can resolve the wrong version when multiple
     * versions of a dep exist in the workspace.
     */
    async locateFromDepOrRoot(pkgName, parentPath, requiredRange) {
        // pnpm's virtual store is content-addressed: every `name@version` lookup is deterministic,
        // so memoize on the exact version. `requiredRange` is normally an exact version coming from
        // the pnpm list output (e.g. `value.version`), which makes this cache hit on duplicates.
        // Only memoize when we have a concrete version — semver ranges could resolve differently
        // depending on what's installed at `parentPath` vs root, so skip the cache for those.
        const memoKey = requiredRange && /^\d/.test(requiredRange) ? `${pkgName}@${requiredRange}` : null;
        if (memoKey != null) {
            const cached = this.locateMemo.get(memoKey);
            if (cached != null) {
                return cached;
            }
        }
        // pnpm's default `.pnpm` virtual store is flat, so `downwardSearch` would burn thousands
        // of `readdir`/`lstat` calls finding nothing. With `nodeLinker: hoisted`, however, the
        // layout is a traditional nested `node_modules` tree where version-conflicted packages
        // land at `<root>/node_modules/A/node_modules/B` — downward BFS is needed to find them.
        const skipDownwardSearch = !(await this.isHoisted.value);
        const promise = (async () => {
            const fromDep = parentPath ? await this.cache.locatePackageVersion({ pkgName, parentDir: parentPath, requiredRange, skipDownwardSearch }) : null;
            if (fromDep) {
                return fromDep;
            }
            return this.cache.locatePackageVersion({ pkgName, parentDir: this.rootDir, requiredRange, skipDownwardSearch });
        })();
        if (memoKey != null) {
            this.locateMemo.set(memoKey, promise);
        }
        return promise;
    }
    // pnpm 10+ does not automatically preserve transitive optional platform-specific
    // packages (e.g. sass-embedded-linux-x64) across lock file regeneration. Users
    // must list them as direct optionalDependencies. Missing ones are emitted as
    // PKG_OPTIONAL_PLATFORM_NOT_INSTALLED warnings in the log summary.
    async extractProductionDependencyGraph(tree, dependencyId) {
        var _a;
        if (this.productionGraph[dependencyId]) {
            return;
        }
        this.productionGraph[dependencyId] = { dependencies: [] };
        if (((_a = tree.dedupedDependenciesCount) !== null && _a !== void 0 ? _a : 0) > 0) {
            const realDep = this.allDependencies.get(dependencyId);
            if (realDep) {
                this.cache.logSummary[moduleManager_1.LogMessageByKey.PKG_DUPLICATE_REF].push(dependencyId);
                tree = realDep;
            }
            else {
                this.cache.logSummary[moduleManager_1.LogMessageByKey.PKG_DUPLICATE_REF_UNRESOLVED].push(dependencyId);
                return;
            }
        }
        const packageName = tree.name || tree.from;
        const { packageJson } = (await this.locateFromDepOrRoot(packageName, tree.path, tree.version)) || {};
        const all = packageJson ? { ...packageJson.dependencies, ...packageJson.optionalDependencies } : { ...tree.dependencies, ...tree.optionalDependencies };
        const optional = packageJson ? { ...packageJson.optionalDependencies } : {};
        const deps = { ...(tree.dependencies || {}), ...(tree.optionalDependencies || {}) };
        this.productionGraph[dependencyId] = { dependencies: [] };
        const depPromises = Object.entries(deps).map(async ([packageName, dependency]) => {
            // First check if it's in production dependencies
            if (!all[packageName]) {
                return undefined;
            }
            // Then check if optional dependency path exists (using actual resolved path)
            if (optional[packageName]) {
                const pkg = await this.locateFromDepOrRoot(packageName, tree.path, dependency.version);
                if (!pkg) {
                    this.logMissingDependency(`${packageName}@${dependency.version}`);
                    return undefined;
                }
            }
            const { id: childDependencyId, pkgOverride } = this.normalizePackageVersion(packageName, dependency);
            await this.extractProductionDependencyGraph(pkgOverride, childDependencyId);
            return childDependencyId;
        });
        const collectedDependencies = [];
        for (const dep of depPromises) {
            const result = await dep;
            if (result !== undefined) {
                collectedDependencies.push(result);
            }
        }
        this.productionGraph[dependencyId] = { dependencies: collectedDependencies };
    }
    async collectAllDependencies(_tree, _appPackageName) {
        for (const root of this.allWorkspacePackages) {
            await this.collectDepsRecursively(root);
        }
    }
    async collectDepsRecursively(tree) {
        const visit = async (key, value) => {
            var _a, _b;
            if (((_a = value === null || value === void 0 ? void 0 : value.dedupedDependenciesCount) !== null && _a !== void 0 ? _a : 0) > 0) {
                return;
            }
            const id = `${key}@${value.version}`;
            // The pnpm list output can include the same `name@version` thousands of times across a
            // deep workspace; without this guard we re-resolve and re-recurse each occurrence.
            if (this.collectedDeps.has(id)) {
                return;
            }
            this.collectedDeps.add(id);
            const pkg = await this.locateFromDepOrRoot(key, value.path, value.version);
            this.allDependencies.set(id, { ...value, path: (_b = pkg === null || pkg === void 0 ? void 0 : pkg.packageDir) !== null && _b !== void 0 ? _b : value.path });
            await this.collectDepsRecursively(value);
        };
        for (const [key, value] of Object.entries(tree.dependencies || {})) {
            await visit(key, value);
        }
        for (const [key, value] of Object.entries(tree.optionalDependencies || {})) {
            await visit(key, value);
        }
    }
    getTreeFromWorkspaces(tree, packageName) {
        // pnpm v10 workspace: app is nested as a dependency of root — handled by base class
        const result = super.getTreeFromWorkspaces(tree, packageName);
        if (result !== tree) {
            return result;
        }
        // pnpm v11 workspace: each workspace package is a separate top-level array entry;
        // non-workspace (single-tree): find returns the one entry or undefined → falls back to tree
        const match = this.allWorkspacePackages.find(pkg => pkg.name === packageName || pkg.from === packageName);
        return match !== null && match !== void 0 ? match : tree;
    }
    async parseDependenciesTree(jsonBlob) {
        const dependencyTree = this.extractJsonFromPollutedOutput(jsonBlob);
        this._allWorkspacePackages = dependencyTree;
        this._pnpmMajorVersion = await this.pnpmVersion.value;
        return dependencyTree[0];
    }
}
exports.PnpmNodeModulesCollector = PnpmNodeModulesCollector;
//# sourceMappingURL=pnpmNodeModulesCollector.js.map
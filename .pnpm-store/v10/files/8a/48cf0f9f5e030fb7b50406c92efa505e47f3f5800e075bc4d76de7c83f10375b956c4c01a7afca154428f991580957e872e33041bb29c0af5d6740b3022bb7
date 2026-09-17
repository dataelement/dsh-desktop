"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NpmNodeModulesCollector = void 0;
const moduleManager_js_1 = require("./moduleManager.js");
const nodeModulesCollector_js_1 = require("./nodeModulesCollector.js");
const packageManager_js_1 = require("./packageManager.js");
class NpmNodeModulesCollector extends nodeModulesCollector_js_1.NodeModulesCollector {
    constructor() {
        super(...arguments);
        this.installOptions = {
            manager: packageManager_js_1.PM.NPM,
            lockfile: "package-lock.json",
        };
    }
    getArgs() {
        return ["list", "-a", "--include", "prod", "--include", "optional", "--omit", "dev", "--json", "--long", "--silent", "--loglevel=error"];
    }
    async collectAllDependencies(tree) {
        for (const [key, value] of Object.entries(tree.dependencies || {})) {
            const { id: childDependencyId, pkgOverride } = this.normalizePackageVersion(key, value);
            // Only skip if this exact version is already collected AND it's a duplicate reference
            // We need to collect nested versions even if a different version exists at top level
            if (this.isDuplicatedNpmDependency(value)) {
                // This is a reference to a package already defined elsewhere in the tree
                // Still add it to allDependencies if we haven't seen this exact version yet
                if (!this.allDependencies.has(childDependencyId)) {
                    this.allDependencies.set(childDependencyId, pkgOverride);
                }
                this.cache.logSummary[moduleManager_js_1.LogMessageByKey.PKG_DUPLICATE_REF].push(childDependencyId);
                continue;
            }
            // Always store this dependency and recurse into its children
            this.allDependencies.set(childDependencyId, pkgOverride);
            await this.collectAllDependencies(pkgOverride);
        }
    }
    async extractProductionDependencyGraph(tree, dependencyId) {
        if (this.productionGraph[dependencyId]) {
            return;
        }
        const isDuplicateDep = this.isDuplicatedNpmDependency(tree);
        const targetTree = isDuplicateDep ? this.allDependencies.get(dependencyId) : tree;
        // Initialize with empty dependencies array first to mark this dependency as "in progress"
        // After initialization, if there are libraries with the same name+version later, they will not be searched recursively again
        // This will prevents infinite loops when circular dependencies are encountered.
        this.productionGraph[dependencyId] = { dependencies: [] };
        const collectedDependencies = [];
        if (targetTree === null || targetTree === void 0 ? void 0 : targetTree.dependencies) {
            for (const packageName in targetTree.dependencies) {
                // Check against matching _dependencies
                if (!this.isProdDependency(packageName, targetTree)) {
                    continue;
                }
                const dependency = targetTree.dependencies[packageName];
                // Match first version's empty check
                if (Object.keys(dependency).length === 0) {
                    continue;
                }
                const { id: childDependencyId, pkgOverride } = this.normalizePackageVersion(packageName, dependency);
                await this.extractProductionDependencyGraph(pkgOverride, childDependencyId);
                collectedDependencies.push(childDependencyId);
            }
        }
        this.productionGraph[dependencyId] = { dependencies: collectedDependencies };
    }
    // Check: is package already included as a prod dependency due to another package?
    // We need to check this to prevent infinite loops in case of duplicated dependencies
    isDuplicatedNpmDependency(tree) {
        const { _dependencies = {}, dependencies = {} } = tree;
        const isDuplicateDep = Object.keys(_dependencies).length > 0 && Object.keys(dependencies).length === 0;
        return isDuplicateDep;
    }
    // `npm list` provides explicit list of deps in _dependencies
    isProdDependency(packageName, tree) {
        var _a;
        return ((_a = tree._dependencies) === null || _a === void 0 ? void 0 : _a[packageName]) != null;
    }
}
exports.NpmNodeModulesCollector = NpmNodeModulesCollector;
//# sourceMappingURL=npmNodeModulesCollector.js.map
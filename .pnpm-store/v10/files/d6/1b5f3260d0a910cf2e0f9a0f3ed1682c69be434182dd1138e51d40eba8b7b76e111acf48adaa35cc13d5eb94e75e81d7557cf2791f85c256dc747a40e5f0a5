import { NodeModulesCollector } from "./nodeModulesCollector";
import { PM } from "./packageManager.js";
import { TraversedDependency } from "./types.js";
export declare class TraversalNodeModulesCollector extends NodeModulesCollector<TraversedDependency, TraversedDependency> {
    installOptions: {
        manager: PM;
        lockfile: string;
    };
    protected getArgs(): string[];
    protected getDependenciesTree(_pm: PM): Promise<TraversedDependency>;
    protected collectAllDependencies(tree: TraversedDependency, appPackageName: string): Promise<void>;
    protected extractProductionDependencyGraph(tree: TraversedDependency, dependencyId: string): Promise<void>;
    /**
     * Builds a dependency tree using only package.json dependencies and optionalDependencies.
     * This skips devDependencies and uses Node.js module resolution (require.resolve).
     */
    private buildNodeModulesTreeManually;
}

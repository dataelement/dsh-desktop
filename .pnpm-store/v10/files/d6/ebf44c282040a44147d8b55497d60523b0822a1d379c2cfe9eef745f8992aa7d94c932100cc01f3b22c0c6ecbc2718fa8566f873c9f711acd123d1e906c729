import { NodeModulesCollector } from "./nodeModulesCollector.js";
import { PM } from "./packageManager.js";
import { NpmDependency } from "./types.js";
export declare class NpmNodeModulesCollector extends NodeModulesCollector<NpmDependency, string> {
    readonly installOptions: {
        manager: PM;
        lockfile: string;
    };
    protected getArgs(): string[];
    protected collectAllDependencies(tree: NpmDependency): Promise<void>;
    protected extractProductionDependencyGraph(tree: NpmDependency, dependencyId: string): Promise<void>;
    private isDuplicatedNpmDependency;
    protected isProdDependency(packageName: string, tree: NpmDependency): boolean;
}

import { PM } from "./packageManager";
import { TraversedDependency } from "./types";
import { TraversalNodeModulesCollector } from "./traversalNodeModulesCollector";
export declare class BunNodeModulesCollector extends TraversalNodeModulesCollector {
    readonly installOptions: {
        manager: PM;
        lockfile: string;
    };
    protected getDependenciesTree(pm: PM): Promise<TraversedDependency>;
}

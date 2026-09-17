import { NpmNodeModulesCollector } from "./npmNodeModulesCollector";
import { PM } from "./packageManager";
import { NpmDependency } from "./types";
export declare class YarnNodeModulesCollector extends NpmNodeModulesCollector {
    readonly installOptions: {
        manager: PM;
        lockfile: string;
    };
    protected getDependenciesTree(_pm: PM): Promise<NpmDependency>;
}

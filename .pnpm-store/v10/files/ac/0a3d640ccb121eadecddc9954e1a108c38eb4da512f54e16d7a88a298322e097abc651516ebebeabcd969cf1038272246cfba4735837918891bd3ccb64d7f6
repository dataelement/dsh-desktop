import { Lazy } from "lazy-val";
import { NpmNodeModulesCollector } from "./npmNodeModulesCollector";
import { PM } from "./packageManager";
import { NpmDependency } from "./types";
export declare class YarnBerryNodeModulesCollector extends NpmNodeModulesCollector {
    readonly installOptions: {
        manager: PM;
        lockfile: string;
    };
    private yarnSetupInfo;
    protected isHoisted: Lazy<boolean>;
    protected getDependenciesTree(_pm: PM): Promise<NpmDependency>;
    protected isProdDependency(packageName: string, tree: NpmDependency): boolean;
    private detectYarnSetup;
}

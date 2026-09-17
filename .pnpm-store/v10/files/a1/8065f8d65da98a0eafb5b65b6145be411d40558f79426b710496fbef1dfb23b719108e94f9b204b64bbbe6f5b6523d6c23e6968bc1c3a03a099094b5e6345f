import { Nullish } from "builder-util-runtime";
import { TmpDir } from "temp-file";
import { NpmNodeModulesCollector } from "./npmNodeModulesCollector";
import { getPackageManagerCommand, PM } from "./packageManager";
import { PnpmNodeModulesCollector } from "./pnpmNodeModulesCollector";
import { BunNodeModulesCollector } from "./bunNodeModulesCollector";
import { Lazy } from "lazy-val";
import { TraversalNodeModulesCollector } from "./traversalNodeModulesCollector";
export { getPackageManagerCommand, PM };
export declare function getCollectorByPackageManager(pm: PM, rootDir: string, tempDirManager: TmpDir): NpmNodeModulesCollector | PnpmNodeModulesCollector | TraversalNodeModulesCollector | BunNodeModulesCollector;
export declare const determinePackageManagerEnv: ({ projectDir, appDir, workspaceRoot }: {
    projectDir: string;
    appDir: string;
    workspaceRoot: string | Nullish;
}) => Lazy<{
    pm: PM;
    workspaceRoot: Promise<string | undefined>;
}>;

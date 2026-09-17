import { Configuration } from "../configuration";
import { Nullish } from "builder-util-runtime";
export declare function installOrRebuild(config: Configuration, { appDir, projectDir, workspaceRoot }: DirectoryPaths, options: RebuildOptions, forceInstall: boolean | undefined, env: NodeJS.ProcessEnv): Promise<void>;
export interface DesktopFrameworkInfo {
    version: string;
    useCustomDist: boolean;
}
export declare function getGypEnv(frameworkInfo: DesktopFrameworkInfo, platform: NodeJS.Platform, arch: string, buildFromSource: boolean): any;
export declare function installDependencies(config: Configuration, { appDir, projectDir, workspaceRoot }: DirectoryPaths, options: RebuildOptions, env: NodeJS.ProcessEnv): Promise<any>;
export declare function nodeGypRebuild(platform: NodeJS.Platform, arch: string, frameworkInfo: DesktopFrameworkInfo): Promise<void>;
export interface RebuildOptions {
    frameworkInfo: DesktopFrameworkInfo;
    platform?: NodeJS.Platform;
    arch?: string;
    buildFromSource?: boolean;
    additionalArgs?: Array<string> | null;
}
export interface DirectoryPaths {
    appDir: string;
    projectDir: string;
    workspaceRoot: string | Nullish;
}

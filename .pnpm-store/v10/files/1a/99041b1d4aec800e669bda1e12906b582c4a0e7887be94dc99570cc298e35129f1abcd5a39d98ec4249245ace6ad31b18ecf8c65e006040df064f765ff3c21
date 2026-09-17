import { AfterPackContext } from "../configuration";
import { Platform } from "../core";
import { Framework, PrepareApplicationStageDirectoryOptions } from "../Framework";
/** Validates that a value is safe to embed in a double-quoted shell string (no metacharacters). */
export declare function validateShellEmbeddable(value: string, fieldName: string): void;
export declare const LAUNCHUI_DEFAULT_VERSION = "0.1.4-10.13.0";
export declare class LibUiFramework implements Framework {
    readonly version: string;
    readonly macOsProductName: string;
    protected readonly isUseLaunchUi: boolean;
    readonly name: string;
    readonly macOsDefaultTargets: string[];
    readonly defaultAppIdPrefix: string;
    readonly isCopyElevateHelper = false;
    readonly isNpmRebuildRequired = false;
    readonly launchUiVersion: string;
    constructor(version: string, macOsProductName: string, isUseLaunchUi: boolean);
    get distMacOsAppName(): string;
    prepareApplicationStageDirectory(options: PrepareApplicationStageDirectoryOptions): Promise<void>;
    private prepareMacosApplicationStageDirectory;
    private prepareLinuxApplicationStageDirectory;
    afterPack(context: AfterPackContext): Promise<void>;
    getMainFile(platform: Platform): string | null;
    private isUseLaunchUiForPlatform;
    getExcludedDependencies(platform: Platform): Array<string> | null;
}
export type NodeJsDownloadParams = {
    releaseName: string;
    filenameWithExt: string;
    overrideUrl: string;
    binaryRelPath: string;
};
export declare function getNodeJsDownloadParams(version: string, platform: Platform, arch: string): NodeJsDownloadParams;
export declare function downloadNodeJsBinary(version: string, platform: Platform, arch: string): Promise<string>;
/**
 * Fetches the SHA-256 hex digest for a specific Node.js distribution file from
 * the official nodejs.org SHASUMS256.txt, preventing MITM substitution attacks.
 */
export declare function fetchNodeJsChecksum(version: string, filename: string): Promise<string>;
export type LaunchUiDownloadParams = {
    releaseName: string;
    filenameWithExt: string;
    githubOrgRepo: string;
    checksums: Record<string, string>;
};
export declare function getLaunchUiDownloadParams(version: string, platform: Platform, arch: string): LaunchUiDownloadParams;
export declare function downloadLaunchUiDir(version: string, platform: Platform, arch: string): Promise<string>;

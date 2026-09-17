import type { FuseConfig } from "@electron/fuses";
import { Arch, AsyncTaskManager, DebugLogger, FileTransformer } from "builder-util";
import { Nullish } from "builder-util-runtime";
import { AppInfo } from "./appInfo";
import { GetFileMatchersOptions } from "./fileMatcher";
import { AfterPackContext, CompressionLevel, Configuration, ElectronPlatformName, FileAssociation, Packager, PackagerOptions, Platform, PlatformSpecificBuildOptions, Target, TargetSpecificOptions } from "./index";
import { IconFormat, IconInfo } from "./util/iconConverter";
import { AssetCatalogResult } from "./util/macosIconComposer";
export type DoPackOptions<DC extends PlatformSpecificBuildOptions> = {
    outDir: string;
    appOutDir: string;
    platformName: ElectronPlatformName;
    arch: Arch;
    platformSpecificBuildOptions: DC;
    targets: Array<Target>;
    options?: {
        sign?: boolean;
        disableAsarIntegrity?: boolean;
        disableFuses?: boolean;
    };
};
export declare abstract class PlatformPackager<DC extends PlatformSpecificBuildOptions> {
    readonly info: Packager;
    readonly platform: Platform;
    get packagerOptions(): PackagerOptions;
    get buildResourcesDir(): string;
    get projectDir(): string;
    get config(): Configuration;
    readonly platformSpecificBuildOptions: DC;
    get resourceList(): Promise<Array<string>>;
    private readonly _resourceList;
    readonly appInfo: AppInfo;
    protected constructor(info: Packager, platform: Platform);
    get compression(): CompressionLevel;
    get debugLogger(): DebugLogger;
    abstract get defaultTarget(): Array<string>;
    protected prepareAppInfo(appInfo: AppInfo): AppInfo;
    private static normalizePlatformSpecificBuildOptions;
    abstract createTargets(targets: Array<string>, mapper: (name: string, factory: (outDir: string) => Target) => void): void;
    getCscPassword(): string;
    getCscLink(extraEnvName?: string | null): string | Nullish;
    doGetCscPassword(): string | Nullish;
    protected computeAppOutDir(outDir: string, arch: Arch): string;
    pack(outDir: string, arch: Arch, targets: Array<Target>, taskManager: AsyncTaskManager): Promise<any>;
    protected packageInDistributableFormat(appOutDir: string, arch: Arch, targets: Array<Target>, taskManager: AsyncTaskManager): void;
    private static buildAsyncTargets;
    private getExtraFileMatchers;
    createGetFileMatchersOptions(outDir: string, arch: Arch, customBuildOptions: PlatformSpecificBuildOptions): GetFileMatchersOptions;
    protected doPack(packOptions: DoPackOptions<DC>): Promise<void>;
    protected doAddElectronFuses(packContext: AfterPackContext): Promise<void>;
    private generateFuseConfig;
    /**
     * Use `AfterPackContext` here to keep available for public API
     * @param {AfterPackContext} context
     * @param {FuseConfig} fuses
     *
     * Can be used in `afterPack` hook for custom fuse logic like below. It's an alternative approach if one wants to override electron-builder's @electron/fuses version
     * ```
     * await context.packager.addElectronFuses(context, { ... })
     * ```
     */
    addElectronFuses(context: AfterPackContext, fuses: FuseConfig): Promise<number>;
    protected doSignAfterPack(outDir: string, appOutDir: string, platformName: ElectronPlatformName, arch: Arch, platformSpecificBuildOptions: DC, targets: Array<Target>): Promise<void>;
    protected createTransformerForExtraFiles(packContext: AfterPackContext): FileTransformer | null;
    private copyAppFiles;
    protected signApp(packContext: AfterPackContext, isAsar: boolean): Promise<boolean>;
    getIconPath(): Promise<string | null>;
    private computeAsarOptions;
    getElectronSrcDir(dist: string): string;
    getElectronDestinationDir(appOutDir: string): string;
    getResourcesDir(appOutDir: string): string;
    getMacOsElectronFrameworkResourcesDir(appOutDir: string): string;
    getMacOsResourcesDir(appOutDir: string): string;
    private checkFileInPackage;
    private sanityCheckPackage;
    computeSafeArtifactName(suggestedName: string | null, ext: string, arch?: Arch | null, skipDefaultArch?: boolean, defaultArch?: string, safePattern?: string): string | null;
    expandArtifactNamePattern(targetSpecificOptions: TargetSpecificOptions | Nullish, ext: string, arch?: Arch | null, defaultPattern?: string, skipDefaultArch?: boolean, defaultArch?: string): string;
    artifactPatternConfig(targetSpecificOptions: TargetSpecificOptions | Nullish, defaultPattern: string | undefined): {
        isUserForced: boolean;
        pattern: string;
    };
    expandArtifactBeautyNamePattern(targetSpecificOptions: TargetSpecificOptions | Nullish, ext: string, arch?: Arch | null): string;
    private computeArtifactName;
    expandMacro(pattern: string, arch?: string | null, extra?: any, isProductNameSanitized?: boolean): string;
    generateName2(ext: string | null, classifier: string | Nullish, deployment: boolean): string;
    getTempFile(suffix: string): Promise<string>;
    get fileAssociations(): Array<FileAssociation>;
    getResource(custom: string | Nullish, ...names: Array<string>): Promise<string | null>;
    get forceCodeSigning(): boolean;
    private assetCatalogResults;
    protected generateAssetCatalogData(iconPath: string): Promise<AssetCatalogResult>;
    private cachedIcnsFromIconFile;
    generateIcnsFromIcon(iconPath: string): Promise<string>;
    protected getOrConvertIcon(format: IconFormat): Promise<string | null>;
    getDefaultFrameworkIcon(): string | null;
    resolveIcon(sources: Array<string>, fallbackSources: Array<string>, outputFormat: IconFormat): Promise<Array<IconInfo>>;
}
export declare function isSafeGithubName(name: string): boolean;
export declare function computeSafeArtifactNameIfNeeded(suggestedName: string | null, safeNameProducer: () => string): string | null;
export declare function normalizeExt(ext: string): string;
export declare function chooseNotNull<T>(v1: T | Nullish, v2: T | Nullish): T | Nullish;

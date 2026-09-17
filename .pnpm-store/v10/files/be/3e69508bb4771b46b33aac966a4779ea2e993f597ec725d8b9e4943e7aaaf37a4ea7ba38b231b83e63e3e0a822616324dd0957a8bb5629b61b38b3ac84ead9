import { Arch } from "builder-util";
import { PackageFileInfo } from "builder-util-runtime";
import { Target } from "../../core";
import { WinPackager } from "../../winPackager";
import { Defines } from "./Defines";
import { NsisOptions } from "./nsisOptions";
import { AppPackageHelper } from "./nsisUtil";
export declare class NsisTarget extends Target {
    readonly packager: WinPackager;
    readonly outDir: string;
    protected readonly packageHelper: AppPackageHelper;
    readonly options: NsisOptions;
    /** @private */
    readonly archs: Map<Arch, string>;
    readonly isAsyncSupported = false;
    constructor(packager: WinPackager, outDir: string, targetName: string, packageHelper: AppPackageHelper);
    get shouldBuildUniversalInstaller(): boolean;
    build(appOutDir: string, arch: Arch): Promise<any>;
    get isBuildDifferentialAware(): boolean;
    private getPreCompressedFileExtensions;
    /** @private */
    buildAppPackage(appOutDir: string, arch: Arch): Promise<PackageFileInfo>;
    protected installerFilenamePattern(primaryArch?: Arch | null, defaultArch?: string): string;
    private get isPortable();
    finishBuild(): Promise<any>;
    private buildInstaller;
    protected generateGitHubInstallerName(primaryArch: Arch | null, defaultArch: string | undefined): string;
    private get isUnicodeEnabled();
    get isWebInstaller(): boolean;
    private computeScriptAndSignUninstaller;
    private computeVersionKey;
    protected configureDefines(oneClick: boolean, defines: Defines): Promise<any>;
    private configureDefinesForAllTypeOfInstaller;
    private executeMakensis;
    private computeCommonInstallerScriptHeader;
    private computeFinalScript;
}

import { Arch } from "builder-util";
import { MsiWrappedOptions } from "../";
import { FinalCommonWindowsInstallerOptions } from "../options/CommonWindowsInstallerConfiguration";
import { WinPackager } from "../winPackager";
import MsiTarget from "./MsiTarget";
export default class MsiWrappedTarget extends MsiTarget {
    readonly outDir: string;
    readonly options: MsiWrappedOptions;
    /** @private */
    private readonly archs;
    constructor(packager: WinPackager, outDir: string);
    private get productId();
    private validatePrerequisites;
    build(appOutDir: string, arch: Arch): Promise<any>;
    finishBuild(): Promise<any>;
    protected get installerFilenamePattern(): string;
    private getExeSourcePath;
    protected writeManifest(_appOutDir: string, arch: Arch, commonOptions: FinalCommonWindowsInstallerOptions): Promise<string>;
}

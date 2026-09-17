import { Arch } from "builder-util";
import { Lazy } from "lazy-val";
import { MsiOptions } from "../";
import { Target } from "../core";
import { FinalCommonWindowsInstallerOptions } from "../options/CommonWindowsInstallerConfiguration";
import { VmManager } from "../vm/vm";
import { WinPackager } from "../winPackager";
export default class MsiTarget extends Target {
    protected readonly packager: WinPackager;
    readonly outDir: string;
    protected readonly vm: VmManager;
    readonly options: MsiOptions;
    constructor(packager: WinPackager, outDir: string, name?: string, isAsyncSupported?: boolean);
    protected projectTemplate: Lazy<(data: any) => string>;
    /**
     * A product-specific string that can be used in an [MSI Identifier](https://docs.microsoft.com/en-us/windows/win32/msi/identifier).
     */
    private get productMsiIdPrefix();
    protected get iconId(): string;
    protected get upgradeCode(): string;
    build(appOutDir: string, arch: Arch): Promise<void>;
    private light;
    private getAdditionalLightArgs;
    private getCommonWixArgs;
    protected writeManifest(appOutDir: string, wixArch: Arch, commonOptions: FinalCommonWindowsInstallerOptions): Promise<string>;
    protected getBaseOptions(commonOptions: FinalCommonWindowsInstallerOptions): Promise<any>;
    private computeFileDeclaration;
}

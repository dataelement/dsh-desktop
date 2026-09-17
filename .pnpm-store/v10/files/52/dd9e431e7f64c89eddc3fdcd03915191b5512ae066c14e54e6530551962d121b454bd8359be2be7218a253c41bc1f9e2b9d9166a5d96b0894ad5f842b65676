import { MemoLazy } from "builder-util-runtime";
import { Lazy } from "lazy-val";
import { WindowsConfiguration } from "../options/winOptions";
import { WinPackager } from "../winPackager";
import { SignManager } from "./signManager";
import { WindowsSignOptions } from "./windowsCodeSign";
import { CertificateFromStoreInfo, FileCodeSigningInfo } from "./windowsSignToolManager";
export declare class WindowsSignAzureManager implements SignManager {
    private readonly packager;
    private readonly platformSpecificBuildOptions;
    readonly computedPublisherName: Lazy<string[] | null>;
    constructor(packager: WinPackager);
    initialize(): Promise<void>;
    computePublisherName(): Promise<string>;
    readonly cscInfo: MemoLazy<WindowsConfiguration, FileCodeSigningInfo | CertificateFromStoreInfo | null>;
    signFile(options: WindowsSignOptions): Promise<boolean>;
}

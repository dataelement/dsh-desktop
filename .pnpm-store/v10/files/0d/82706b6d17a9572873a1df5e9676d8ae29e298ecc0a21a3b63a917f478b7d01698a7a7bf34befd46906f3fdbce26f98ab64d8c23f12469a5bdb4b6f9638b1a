import { MemoLazy } from "builder-util-runtime";
import { Lazy } from "lazy-val";
import { Target } from "../core";
import { WindowsConfiguration } from "../options/winOptions";
import { ToolInfo } from "../util/bundledTool";
import { VmManager } from "../vm/vm";
import { WinPackager } from "../winPackager";
import { SignManager } from "./signManager";
import { WindowsSignOptions } from "./windowsCodeSign";
export type CustomWindowsSign = (configuration: CustomWindowsSignTaskConfiguration, packager?: WinPackager) => Promise<any>;
export interface WindowsSignToolOptions extends WindowsSignOptions {
    readonly name: string;
    readonly site: string | null;
}
export interface FileCodeSigningInfo {
    readonly file: string;
    readonly password: string | null;
}
export interface WindowsSignTaskConfiguration extends WindowsSignToolOptions {
    readonly cscInfo: FileCodeSigningInfo | CertificateFromStoreInfo | null;
    resultOutputPath?: string;
    hash: string;
    isNest: boolean;
}
export interface CustomWindowsSignTaskConfiguration extends WindowsSignTaskConfiguration {
    computeSignToolArgs(isWin: boolean): Array<string>;
}
export interface CertificateInfo {
    readonly commonName: string;
    readonly bloodyMicrosoftSubjectDn: string;
}
export interface CertificateFromStoreInfo {
    thumbprint: string;
    subject: string;
    store: string;
    isLocalMachineStore: boolean;
}
export declare class WindowsSignToolManager implements SignManager {
    private readonly packager;
    private readonly platformSpecificBuildOptions;
    constructor(packager: WinPackager);
    readonly computedPublisherName: Lazy<string[] | null>;
    readonly lazyCertInfo: MemoLazy<MemoLazy<WindowsConfiguration, FileCodeSigningInfo | CertificateFromStoreInfo | null>, CertificateInfo | null>;
    readonly cscInfo: MemoLazy<WindowsConfiguration, FileCodeSigningInfo | CertificateFromStoreInfo | null>;
    initialize(): Promise<void>;
    computePublisherName(target: Target, publisherName: string): Promise<string>;
    signFile(options: WindowsSignOptions): Promise<boolean>;
    getCertInfo(file: string, password: string): Promise<CertificateInfo>;
    computeSignToolArgs(options: WindowsSignTaskConfiguration, isWin: boolean, vm?: VmManager): Array<string>;
    private computeWindowsSignArgs;
    private computeOsslsigncodeArgs;
    private addCertificateArgs;
    private addCommonSigningArgs;
    getOutputPath(inputPath: string, hash: string): string;
    getCertificateFromStoreInfo(options: WindowsConfiguration, vm: VmManager): Promise<CertificateFromStoreInfo>;
    getToolPath(isWin?: boolean): Promise<ToolInfo>;
    doSign(configuration: CustomWindowsSignTaskConfiguration, packager: WinPackager): Promise<void>;
}

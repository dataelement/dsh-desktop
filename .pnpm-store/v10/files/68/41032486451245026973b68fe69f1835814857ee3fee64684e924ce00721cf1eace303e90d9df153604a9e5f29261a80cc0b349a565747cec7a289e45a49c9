import { Arch, FileTransformer } from "builder-util";
import { Nullish } from "builder-util-runtime";
import { Lazy } from "lazy-val";
import { SignManager } from "./codeSign/signManager";
import { AfterPackContext } from "./configuration";
import { Target } from "./core";
import { RequestedExecutionLevel, WindowsConfiguration } from "./options/winOptions";
import { Packager } from "./packager";
import { PlatformPackager } from "./platformPackager";
import { VmManager } from "./vm/vm";
export declare class WinPackager extends PlatformPackager<WindowsConfiguration> {
    _iconPath: Lazy<string | null>;
    readonly vm: Lazy<VmManager>;
    readonly signingManager: Lazy<SignManager>;
    private signingQueue;
    get isForceCodeSigningVerification(): boolean;
    constructor(info: Packager);
    get defaultTarget(): Array<string>;
    createTargets(targets: Array<string>, mapper: (name: string, factory: (outDir: string) => Target) => void): void;
    getIconPath(): Promise<string | null>;
    doGetCscPassword(): string | Nullish;
    signIf(file: string): Promise<boolean>;
    private _sign;
    signAndEditResources(file: string, arch: Arch, outDir: string, internalName?: string | null, requestedExecutionLevel?: RequestedExecutionLevel | null): Promise<void>;
    private shouldSignFile;
    protected createTransformerForExtraFiles(packContext: AfterPackContext): FileTransformer | null;
    protected signApp(packContext: AfterPackContext, isAsar: boolean): Promise<boolean>;
    private walkSignableFiles;
}

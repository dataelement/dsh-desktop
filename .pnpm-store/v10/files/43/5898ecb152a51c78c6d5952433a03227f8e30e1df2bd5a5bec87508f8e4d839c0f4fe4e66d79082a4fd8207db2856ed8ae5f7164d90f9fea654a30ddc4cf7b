import { Arch } from "builder-util";
import { PackageFileInfo } from "builder-util-runtime";
import { NsisTarget } from "./NsisTarget";
export declare const nsisTemplatesDir: string;
export interface PackArchResult {
    fileInfo: PackageFileInfo;
    unpackedSize: number;
}
export declare class AppPackageHelper {
    private readonly elevateHelper;
    private readonly archToResult;
    private readonly infoToIsDelete;
    /** @private */
    refCount: number;
    constructor(elevateHelper: CopyElevateHelper);
    packArch(arch: Arch, target: NsisTarget): Promise<PackArchResult>;
    finishBuild(): Promise<any>;
}
export declare class CopyElevateHelper {
    private readonly copied;
    copy(appOutDir: string, target: NsisTarget): Promise<any>;
}
export declare class UninstallerReader {
    static exec(installerPath: string, uninstallerPath: string): Promise<void>;
}

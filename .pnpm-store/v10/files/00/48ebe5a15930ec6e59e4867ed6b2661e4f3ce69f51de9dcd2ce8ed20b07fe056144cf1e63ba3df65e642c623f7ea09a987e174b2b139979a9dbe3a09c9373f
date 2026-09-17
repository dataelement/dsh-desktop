import { DmgOptions, MacPackager, PlatformPackager } from "app-builder-lib";
import { TmpDir } from "builder-util";
import type { DmgBuildLicenseConfig } from "./dmgLicense";
export { DmgTarget } from "./dmg";
export declare function getDmgTemplatePath(): string;
export declare function attachAndExecute(dmgPath: string, readWrite: boolean, forceDetach: boolean, task: (devicePath: string) => Promise<any>): Promise<any>;
export declare function detach(name: string, alwaysForce: boolean): Promise<string | null>;
export declare function computeBackground(packager: PlatformPackager<any>): Promise<string>;
type DmgBuilderConfig = {
    appPath: string;
    artifactPath: string;
    volumeName: string;
    specification: DmgOptions;
    packager: MacPackager;
    licenseData?: DmgBuildLicenseConfig | null;
};
export declare function customizeDmg({ appPath, artifactPath, volumeName, specification, packager, licenseData }: DmgBuilderConfig): Promise<boolean>;
export declare function transformBackgroundFileIfNeed(file: string, tmpDir: TmpDir): Promise<string>;
export declare function getImageSizeUsingSips(background: string): Promise<{
    width: number;
    height: number;
}>;

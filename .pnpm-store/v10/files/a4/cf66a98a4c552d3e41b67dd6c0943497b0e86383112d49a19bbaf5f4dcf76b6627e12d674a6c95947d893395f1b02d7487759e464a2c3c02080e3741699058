import { PlatformPackager } from "app-builder-lib";
export type DmgBuildLicenseConfig = {
    "default-language": string;
    licenses: Record<string, string>;
    buttons?: Record<string, {
        language?: string;
        agree?: string;
        disagree?: string;
        print?: string;
        save?: string;
        message?: string;
    }>;
};
export declare function addLicenseToDmg(packager: PlatformPackager<any>, explicitLicense?: string | Record<string, string> | null): Promise<DmgBuildLicenseConfig | null>;

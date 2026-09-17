import type { NotarizeOptionsNotaryTool } from "@electron/notarize/lib/types";
import type { PerFileSignOptions, SigningDistributionType, SignOptions } from "@electron/osx-sign/dist/cjs/types";
import type { Identity } from "@electron/osx-sign/dist/cjs/util-identities";
import { Arch } from "builder-util";
import { Nullish } from "builder-util-runtime";
import { CertType } from "../codeSign/macCodeSign";
import type { MacPackager } from "../macPackager";
import { MacConfiguration, MasConfiguration } from "../options/macOptions";
export type PlatformType = "mas" | "mas-dev" | "mac";
export declare class MacTargetHelper {
    private packager;
    constructor(packager: MacPackager);
    handleNullIdentity(): boolean;
    findSigningIdentity(isMas: boolean, isDevelopment: boolean, qualifier: string | undefined, keychainFile: string | Nullish, config: MacConfiguration | MasConfiguration): Promise<Identity | null>;
    buildSignOptions(appPath: string, identity: Identity, type: SigningDistributionType, isMas: boolean, config: MacConfiguration | MasConfiguration, keychainFile: string | Nullish, arch: Arch): Promise<SignOptions>;
    createMasInstaller(appPath: string, outDir: string, masOptions: MasConfiguration, keychainFile: string | Nullish, isDevelopment: boolean, arch: Arch): Promise<void>;
    getOptionsForFile(appPath: string, isMas: boolean, customSignOptions: MacConfiguration | MasConfiguration): Promise<(filePath: string) => PerFileSignOptions>;
    static getCertificateTypes(isMas: boolean, isDevelopment: boolean): CertType[];
    static isMasTarget(targetName: string): boolean;
    static getPlatformTypeFromTarget(targetName: string): PlatformType;
    /**
     * Returns true when hardened runtime will be active for signing.
     * For non-MAS builds it defaults to on; for MAS it defaults to off.
     */
    static isHardenedRuntimeEnabledForSigning(isMas: boolean, config: Pick<MacConfiguration | MasConfiguration, "hardenedRuntime">): boolean;
    static assertSafePathForCommandUsage(pathValue: string, description: string): void;
    static getNotarizeOptions(appPath: string): NotarizeOptionsNotaryTool | undefined;
    notarizeIfProvided(appPath: string): Promise<void>;
}

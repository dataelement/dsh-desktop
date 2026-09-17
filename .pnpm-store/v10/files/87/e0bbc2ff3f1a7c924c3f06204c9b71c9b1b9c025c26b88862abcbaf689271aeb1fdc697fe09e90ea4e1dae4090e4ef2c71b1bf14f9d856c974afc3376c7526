import { ElectronMacPlatform, ValidatedSignOptions } from './types';
export declare class ProvisioningProfile {
    filePath: string;
    message: any;
    constructor(filePath: string, message: any);
    get name(): string;
    get platforms(): ElectronMacPlatform[];
    get type(): "development" | "distribution";
}
/**
 * Returns a promise resolving to a ProvisioningProfile instance based on file.
 * @function
 * @param {string} filePath - Path to provisioning profile.
 * @param {string} keychain - Keychain to use when unlocking provisioning profile.
 * @returns {Promise} Promise.
 */
export declare function getProvisioningProfile(filePath: string, keychain?: string | null): Promise<ProvisioningProfile>;
/**
 * Returns a promise resolving to a list of suitable provisioning profile within the current working directory.
 */
export declare function findProvisioningProfiles(opts: ValidatedSignOptions): Promise<ProvisioningProfile[]>;
/**
 * Returns a promise embedding the provisioning profile in the app Contents folder.
 */
export declare function preEmbedProvisioningProfile(opts: ValidatedSignOptions, profile: ProvisioningProfile | null): Promise<void>;

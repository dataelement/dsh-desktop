import { PerFileSignOptions, ValidatedSignOptions } from './types';
import { Identity } from './util-identities';
import { ProvisioningProfile } from './util-provisioning-profiles';
type ComputedOptions = {
    identity: Identity;
    provisioningProfile?: ProvisioningProfile;
};
/**
 * This function returns a promise completing the entitlements automation: The
 * process includes checking in `Info.plist` for `ElectronTeamID` or setting
 * parsed value from identity, and checking in entitlements file for
 * `com.apple.security.application-groups` or inserting new into array. A
 * temporary entitlements file may be created to replace the input for any
 * changes introduced.
 */
export declare function preAutoEntitlements(opts: ValidatedSignOptions, perFileOpts: PerFileSignOptions, computed: ComputedOptions): Promise<void | string>;
export {};

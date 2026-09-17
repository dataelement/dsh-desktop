import * as fs from 'fs-extra';
import * as path from 'path';
import plist from 'plist';
import { debugLog, debugWarn, getAppContentsPath, compactFlattenedList, execFileAsync } from './util';
export class ProvisioningProfile {
    constructor(filePath, message) {
        this.filePath = filePath;
        this.message = message;
    }
    get name() {
        return this.message.Name;
    }
    get platforms() {
        if ('ProvisionsAllDevices' in this.message)
            return ['darwin'];
        // Developer ID
        else if (this.type === 'distribution')
            return ['mas'];
        // Mac App Store
        else
            return ['darwin', 'mas']; // Mac App Development
    }
    get type() {
        if ('ProvisionedDevices' in this.message)
            return 'development';
        // Mac App Development
        else
            return 'distribution'; // Developer ID or Mac App Store
    }
}
/**
 * Returns a promise resolving to a ProvisioningProfile instance based on file.
 * @function
 * @param {string} filePath - Path to provisioning profile.
 * @param {string} keychain - Keychain to use when unlocking provisioning profile.
 * @returns {Promise} Promise.
 */
export async function getProvisioningProfile(filePath, keychain = null) {
    const securityArgs = [
        'cms',
        '-D',
        '-i',
        filePath // Use infile as source of data
    ];
    if (keychain) {
        securityArgs.push('-k', keychain);
    }
    const result = await execFileAsync('security', securityArgs);
    const provisioningProfile = new ProvisioningProfile(filePath, plist.parse(result));
    debugLog('Provisioning profile:', '\n', '> Name:', provisioningProfile.name, '\n', '> Platforms:', provisioningProfile.platforms, '\n', '> Type:', provisioningProfile.type, '\n', '> Path:', provisioningProfile.filePath, '\n', '> Message:', provisioningProfile.message);
    return provisioningProfile;
}
/**
 * Returns a promise resolving to a list of suitable provisioning profile within the current working directory.
 */
export async function findProvisioningProfiles(opts) {
    const cwd = process.cwd();
    const children = await fs.readdir(cwd);
    const foundProfiles = compactFlattenedList(await Promise.all(children.map(async (child) => {
        const filePath = path.resolve(cwd, child);
        const stat = await fs.stat(filePath);
        if (stat.isFile() && path.extname(filePath) === '.provisionprofile') {
            return filePath;
        }
        return null;
    })));
    return compactFlattenedList(await Promise.all(foundProfiles.map(async (filePath) => {
        const profile = await getProvisioningProfile(filePath);
        if (profile.platforms.indexOf(opts.platform) >= 0 && profile.type === opts.type) {
            return profile;
        }
        debugWarn('Provisioning profile above ignored, not for ' + opts.platform + ' ' + opts.type + '.');
        return null;
    })));
}
/**
 * Returns a promise embedding the provisioning profile in the app Contents folder.
 */
export async function preEmbedProvisioningProfile(opts, profile) {
    async function embedProvisioningProfile(profile) {
        debugLog('Looking for existing provisioning profile...');
        const embeddedFilePath = path.join(getAppContentsPath(opts), 'embedded.provisionprofile');
        if (await fs.pathExists(embeddedFilePath)) {
            debugLog('Found embedded provisioning profile:', '\n', '* Please manually remove the existing file if not wanted.', '\n', '* Current file at:', embeddedFilePath);
        }
        else {
            debugLog('Embedding provisioning profile...');
            await fs.copy(profile.filePath, embeddedFilePath);
        }
    }
    if (profile) {
        // User input provisioning profile
        return await embedProvisioningProfile(profile);
    }
    else {
        // Discover provisioning profile
        debugLog('No `provisioning-profile` passed in arguments, will find in current working directory and in user library...');
        const profiles = await findProvisioningProfiles(opts);
        if (profiles.length > 0) {
            // Provisioning profile(s) found
            if (profiles.length > 1) {
                debugLog('Multiple provisioning profiles found, will use the first discovered.');
            }
            else {
                debugLog('Found 1 provisioning profile.');
            }
            await embedProvisioningProfile(profiles[0]);
        }
        else {
            // No provisioning profile found
            debugLog('No provisioning profile found, will not embed profile in app contents.');
        }
    }
}
//# sourceMappingURL=util-provisioning-profiles.js.map
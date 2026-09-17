"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.preEmbedProvisioningProfile = exports.findProvisioningProfiles = exports.getProvisioningProfile = exports.ProvisioningProfile = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const plist_1 = __importDefault(require("plist"));
const util_1 = require("./util");
class ProvisioningProfile {
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
exports.ProvisioningProfile = ProvisioningProfile;
/**
 * Returns a promise resolving to a ProvisioningProfile instance based on file.
 * @function
 * @param {string} filePath - Path to provisioning profile.
 * @param {string} keychain - Keychain to use when unlocking provisioning profile.
 * @returns {Promise} Promise.
 */
async function getProvisioningProfile(filePath, keychain = null) {
    const securityArgs = [
        'cms',
        '-D',
        '-i',
        filePath // Use infile as source of data
    ];
    if (keychain) {
        securityArgs.push('-k', keychain);
    }
    const result = await (0, util_1.execFileAsync)('security', securityArgs);
    const provisioningProfile = new ProvisioningProfile(filePath, plist_1.default.parse(result));
    (0, util_1.debugLog)('Provisioning profile:', '\n', '> Name:', provisioningProfile.name, '\n', '> Platforms:', provisioningProfile.platforms, '\n', '> Type:', provisioningProfile.type, '\n', '> Path:', provisioningProfile.filePath, '\n', '> Message:', provisioningProfile.message);
    return provisioningProfile;
}
exports.getProvisioningProfile = getProvisioningProfile;
/**
 * Returns a promise resolving to a list of suitable provisioning profile within the current working directory.
 */
async function findProvisioningProfiles(opts) {
    const cwd = process.cwd();
    const children = await fs.readdir(cwd);
    const foundProfiles = (0, util_1.compactFlattenedList)(await Promise.all(children.map(async (child) => {
        const filePath = path.resolve(cwd, child);
        const stat = await fs.stat(filePath);
        if (stat.isFile() && path.extname(filePath) === '.provisionprofile') {
            return filePath;
        }
        return null;
    })));
    return (0, util_1.compactFlattenedList)(await Promise.all(foundProfiles.map(async (filePath) => {
        const profile = await getProvisioningProfile(filePath);
        if (profile.platforms.indexOf(opts.platform) >= 0 && profile.type === opts.type) {
            return profile;
        }
        (0, util_1.debugWarn)('Provisioning profile above ignored, not for ' + opts.platform + ' ' + opts.type + '.');
        return null;
    })));
}
exports.findProvisioningProfiles = findProvisioningProfiles;
/**
 * Returns a promise embedding the provisioning profile in the app Contents folder.
 */
async function preEmbedProvisioningProfile(opts, profile) {
    async function embedProvisioningProfile(profile) {
        (0, util_1.debugLog)('Looking for existing provisioning profile...');
        const embeddedFilePath = path.join((0, util_1.getAppContentsPath)(opts), 'embedded.provisionprofile');
        if (await fs.pathExists(embeddedFilePath)) {
            (0, util_1.debugLog)('Found embedded provisioning profile:', '\n', '* Please manually remove the existing file if not wanted.', '\n', '* Current file at:', embeddedFilePath);
        }
        else {
            (0, util_1.debugLog)('Embedding provisioning profile...');
            await fs.copy(profile.filePath, embeddedFilePath);
        }
    }
    if (profile) {
        // User input provisioning profile
        return await embedProvisioningProfile(profile);
    }
    else {
        // Discover provisioning profile
        (0, util_1.debugLog)('No `provisioning-profile` passed in arguments, will find in current working directory and in user library...');
        const profiles = await findProvisioningProfiles(opts);
        if (profiles.length > 0) {
            // Provisioning profile(s) found
            if (profiles.length > 1) {
                (0, util_1.debugLog)('Multiple provisioning profiles found, will use the first discovered.');
            }
            else {
                (0, util_1.debugLog)('Found 1 provisioning profile.');
            }
            await embedProvisioningProfile(profiles[0]);
        }
        else {
            // No provisioning profile found
            (0, util_1.debugLog)('No provisioning profile found, will not embed profile in app contents.');
        }
    }
}
exports.preEmbedProvisioningProfile = preEmbedProvisioningProfile;
//# sourceMappingURL=util-provisioning-profiles.js.map
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
exports.sign = exports.signApp = void 0;
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const plist = __importStar(require("plist"));
const compare_version_1 = __importDefault(require("compare-version"));
const util_1 = require("./util");
const util_identities_1 = require("./util-identities");
const util_provisioning_profiles_1 = require("./util-provisioning-profiles");
const util_entitlements_1 = require("./util-entitlements");
const pkgVersion = require('../../package.json').version;
const osRelease = os.release();
/**
 * This function returns a promise validating opts.binaries, the additional binaries to be signed along with the discovered enclosed components.
 */
async function validateOptsBinaries(opts) {
    if (opts.binaries) {
        if (!Array.isArray(opts.binaries)) {
            throw new Error('Additional binaries should be an Array.');
        }
        // TODO: Presence check for binary files, reject if any does not exist
    }
}
function validateOptsIgnore(ignore) {
    if (ignore && !(ignore instanceof Array)) {
        return [ignore];
    }
}
/**
 * This function returns a promise validating all options passed in opts.
 */
async function validateSignOpts(opts) {
    await validateOptsBinaries(opts);
    await (0, util_1.validateOptsApp)(opts);
    if (opts.provisioningProfile && typeof opts.provisioningProfile !== 'string') {
        throw new Error('Path to provisioning profile should be a string.');
    }
    if (opts.type && opts.type !== 'development' && opts.type !== 'distribution') {
        throw new Error('Type must be either `development` or `distribution`.');
    }
    const platform = await (0, util_1.validateOptsPlatform)(opts);
    const cloned = Object.assign(Object.assign({}, opts), { ignore: validateOptsIgnore(opts.ignore), type: opts.type || 'distribution', platform });
    return cloned;
}
/**
 * This function returns a promise verifying the code sign of application bundle.
 */
async function verifySignApplication(opts) {
    // Verify with codesign
    (0, util_1.debugLog)('Verifying application bundle with codesign...');
    const strictVerify = opts.strictVerify !== undefined ? opts.strictVerify : true;
    await (0, util_1.execFileAsync)('codesign', ['--verify', '--deep'].concat(strictVerify !== false && (0, compare_version_1.default)(osRelease, '15.0.0') >= 0 // Strict flag since darwin 15.0.0 --> OS X 10.11.0 El Capitan
        ? [
            '--strict' +
                (strictVerify !== true ? '=' + strictVerify : '')
        ]
        : [], ['--verbose=2', opts.app]));
}
function defaultOptionsForFile(filePath, platform) {
    const entitlementsFolder = path.resolve(__dirname, '..', '..', 'entitlements');
    let entitlementsFile;
    if (platform === 'darwin') {
        // Default Entitlements
        // c.f. https://source.chromium.org/chromium/chromium/src/+/main:chrome/app/app-entitlements.plist
        // Also include JIT for main process V8
        entitlementsFile = path.resolve(entitlementsFolder, 'default.darwin.plist');
        // Plugin helper
        // c.f. https://source.chromium.org/chromium/chromium/src/+/main:chrome/app/helper-plugin-entitlements.plist
        if (filePath.includes('(Plugin).app')) {
            entitlementsFile = path.resolve(entitlementsFolder, 'default.darwin.plugin.plist');
            // GPU Helper
            // c.f. https://source.chromium.org/chromium/chromium/src/+/main:chrome/app/helper-gpu-entitlements.plist
        }
        else if (filePath.includes('(GPU).app')) {
            entitlementsFile = path.resolve(entitlementsFolder, 'default.darwin.gpu.plist');
            // Renderer Helper
            // c.f. https://source.chromium.org/chromium/chromium/src/+/main:chrome/app/helper-renderer-entitlements.plist
        }
        else if (filePath.includes('(Renderer).app')) {
            entitlementsFile = path.resolve(entitlementsFolder, 'default.darwin.renderer.plist');
        }
    }
    else {
        // Default entitlements
        // TODO: Can these be more scoped like the non-mas variant?
        entitlementsFile = path.resolve(entitlementsFolder, 'default.mas.plist');
        // If it is not the top level app bundle, we sign with inherit
        if (filePath.includes('.app/')) {
            entitlementsFile = path.resolve(entitlementsFolder, 'default.mas.child.plist');
        }
    }
    return {
        entitlements: entitlementsFile,
        hardenedRuntime: true,
        requirements: undefined,
        signatureFlags: undefined,
        timestamp: undefined,
        additionalArguments: []
    };
}
async function mergeOptionsForFile(opts, defaults) {
    const mergedPerFileOptions = Object.assign({}, defaults);
    if (opts) {
        if (opts.entitlements !== undefined) {
            if (Array.isArray(opts.entitlements)) {
                const entitlements = opts.entitlements.reduce((dict, entitlementKey) => (Object.assign(Object.assign({}, dict), { [entitlementKey]: true })), {});
                const dir = await fs.mkdtemp(path.resolve(os.tmpdir(), 'tmp-entitlements-'));
                const entitlementsPath = path.join(dir, 'entitlements.plist');
                await fs.writeFile(entitlementsPath, plist.build(entitlements), 'utf8');
                opts.entitlements = entitlementsPath;
            }
            mergedPerFileOptions.entitlements = opts.entitlements;
        }
        if (opts.hardenedRuntime !== undefined) {
            mergedPerFileOptions.hardenedRuntime = opts.hardenedRuntime;
        }
        if (opts.requirements !== undefined)
            mergedPerFileOptions.requirements = opts.requirements;
        if (opts.signatureFlags !== undefined) {
            mergedPerFileOptions.signatureFlags = opts.signatureFlags;
        }
        if (opts.timestamp !== undefined)
            mergedPerFileOptions.timestamp = opts.timestamp;
        if (opts.additionalArguments !== undefined)
            mergedPerFileOptions.additionalArguments = opts.additionalArguments;
    }
    return mergedPerFileOptions;
}
/**
 * This function returns a promise codesigning only.
 */
async function signApplication(opts, identity) {
    function shouldIgnoreFilePath(filePath) {
        if (opts.ignore) {
            return opts.ignore.some(function (ignore) {
                if (typeof ignore === 'function') {
                    return ignore(filePath);
                }
                return filePath.match(ignore);
            });
        }
        return false;
    }
    const children = await (0, util_1.walkAsync)((0, util_1.getAppContentsPath)(opts));
    if (opts.binaries)
        children.push(...opts.binaries);
    const args = ['--sign', identity.hash || identity.name, '--force'];
    if (opts.keychain) {
        args.push('--keychain', opts.keychain);
    }
    /**
     * Sort the child paths by how deep they are in the file tree.  Some arcane apple
     * logic expects the deeper files to be signed first otherwise strange errors get
     * thrown our way
     */
    children.sort((a, b) => {
        const aDepth = a.split(path.sep).length;
        const bDepth = b.split(path.sep).length;
        return bDepth - aDepth;
    });
    for (const filePath of [...children, opts.app]) {
        if (shouldIgnoreFilePath(filePath)) {
            (0, util_1.debugLog)('Skipped... ' + filePath);
            continue;
        }
        const perFileOptions = await mergeOptionsForFile(opts.optionsForFile ? opts.optionsForFile(filePath) : null, defaultOptionsForFile(filePath, opts.platform));
        // preAutoEntitlements should only be applied to the top level app bundle.
        // Applying it other files will cause the app to crash and be rejected by Apple.
        if (!filePath.includes('.app/')) {
            if (opts.preAutoEntitlements === false) {
                (0, util_1.debugWarn)('Pre-sign operation disabled for entitlements automation.');
            }
            else {
                (0, util_1.debugLog)('Pre-sign operation enabled for entitlements automation with versions >= `1.1.1`:', '\n', '* Disable by setting `pre-auto-entitlements` to `false`.');
                if (!opts.version || (0, compare_version_1.default)(opts.version, '1.1.1') >= 0) {
                    // Enable Mac App Store sandboxing without using temporary-exception, introduced in Electron v1.1.1. Relates to electron#5601
                    const newEntitlements = await (0, util_entitlements_1.preAutoEntitlements)(opts, perFileOptions, {
                        identity,
                        provisioningProfile: opts.provisioningProfile
                            ? await (0, util_provisioning_profiles_1.getProvisioningProfile)(opts.provisioningProfile, opts.keychain)
                            : undefined
                    });
                    // preAutoEntitlements may provide us new entitlements, if so we update our options
                    // and ensure that entitlements-loginhelper has a correct default value
                    if (newEntitlements) {
                        perFileOptions.entitlements = newEntitlements;
                    }
                }
            }
        }
        (0, util_1.debugLog)('Signing... ' + filePath);
        const perFileArgs = [...args];
        if (perFileOptions.requirements) {
            if (perFileOptions.requirements.charAt(0) === '=') {
                perFileArgs.push(`-r${perFileOptions.requirements}`);
            }
            else {
                perFileArgs.push('--requirements', perFileOptions.requirements);
            }
        }
        if (perFileOptions.timestamp) {
            perFileArgs.push('--timestamp=' + perFileOptions.timestamp);
        }
        else {
            perFileArgs.push('--timestamp');
        }
        let optionsArguments = [];
        if (perFileOptions.signatureFlags) {
            if (Array.isArray(perFileOptions.signatureFlags)) {
                optionsArguments.push(...perFileOptions.signatureFlags);
            }
            else {
                const flags = perFileOptions.signatureFlags.split(',').map(function (flag) {
                    return flag.trim();
                });
                optionsArguments.push(...flags);
            }
        }
        if (perFileOptions.hardenedRuntime || optionsArguments.includes('runtime')) {
            // Hardened runtime since darwin 17.7.0 --> macOS 10.13.6
            if ((0, compare_version_1.default)(osRelease, '17.7.0') >= 0) {
                optionsArguments.push('runtime');
            }
            else {
                // Remove runtime if passed in with --signature-flags
                (0, util_1.debugLog)('Not enabling hardened runtime, current macOS version too low, requires 10.13.6 and higher');
                optionsArguments = optionsArguments.filter((arg) => {
                    return arg !== 'runtime';
                });
            }
        }
        if (optionsArguments.length) {
            perFileArgs.push('--options', [...new Set(optionsArguments)].join(','));
        }
        if (perFileOptions.additionalArguments) {
            perFileArgs.push(...perFileOptions.additionalArguments);
        }
        await (0, util_1.execFileAsync)('codesign', perFileArgs.concat('--entitlements', perFileOptions.entitlements, filePath));
    }
    // Verify code sign
    (0, util_1.debugLog)('Verifying...');
    await verifySignApplication(opts);
    (0, util_1.debugLog)('Verified.');
    // Check entitlements if applicable
    (0, util_1.debugLog)('Displaying entitlements...');
    const result = await (0, util_1.execFileAsync)('codesign', [
        '--display',
        '--entitlements',
        ':-',
        opts.app
    ]);
    (0, util_1.debugLog)('Entitlements:', '\n', result);
}
/**
 * Signs a macOS application.
 * @returns A void Promise once the signing operation is complete.
 *
 * @category Codesign
 */
async function signApp(_opts) {
    (0, util_1.debugLog)('electron-osx-sign@%s', pkgVersion);
    const validatedOpts = await validateSignOpts(_opts);
    let identities = [];
    let identityInUse = null;
    // Determine identity for signing
    if (validatedOpts.identity) {
        (0, util_1.debugLog)('`identity` passed in arguments.');
        if (validatedOpts.identityValidation === false) {
            identityInUse = new util_identities_1.Identity(validatedOpts.identity);
        }
        else {
            identities = await (0, util_identities_1.findIdentities)(validatedOpts.keychain || null, validatedOpts.identity);
        }
    }
    else {
        (0, util_1.debugWarn)('No `identity` passed in arguments...');
        if (validatedOpts.platform === 'mas') {
            if (validatedOpts.type === 'distribution') {
                (0, util_1.debugLog)('Finding `3rd Party Mac Developer Application` certificate for signing app distribution in the Mac App Store...');
                identities = await (0, util_identities_1.findIdentities)(validatedOpts.keychain || null, '3rd Party Mac Developer Application:');
            }
            else {
                (0, util_1.debugLog)('Finding `Mac Developer` certificate for signing app in development for the Mac App Store signing...');
                identities = await (0, util_identities_1.findIdentities)(validatedOpts.keychain || null, 'Mac Developer:');
            }
        }
        else {
            (0, util_1.debugLog)('Finding `Developer ID Application` certificate for distribution outside the Mac App Store...');
            identities = await (0, util_identities_1.findIdentities)(validatedOpts.keychain || null, 'Developer ID Application:');
        }
    }
    if (!identityInUse) {
        if (identities.length > 0) {
            // Identity(/ies) found
            if (identities.length > 1) {
                (0, util_1.debugWarn)('Multiple identities found, will use the first discovered.');
            }
            else {
                (0, util_1.debugLog)('Found 1 identity.');
            }
            identityInUse = identities[0];
        }
        else {
            // No identity found
            throw new Error('No identity found for signing.');
        }
    }
    // Pre-sign operations
    if (validatedOpts.preEmbedProvisioningProfile === false) {
        (0, util_1.debugWarn)('Pre-sign operation disabled for provisioning profile embedding:', '\n', '* Enable by setting `pre-embed-provisioning-profile` to `true`.');
    }
    else {
        (0, util_1.debugLog)('Pre-sign operation enabled for provisioning profile:', '\n', '* Disable by setting `pre-embed-provisioning-profile` to `false`.');
        await (0, util_provisioning_profiles_1.preEmbedProvisioningProfile)(validatedOpts, validatedOpts.provisioningProfile
            ? await (0, util_provisioning_profiles_1.getProvisioningProfile)(validatedOpts.provisioningProfile, validatedOpts.keychain)
            : null);
    }
    (0, util_1.debugLog)('Signing application...', '\n', '> Application:', validatedOpts.app, '\n', '> Platform:', validatedOpts.platform, '\n', '> Additional binaries:', validatedOpts.binaries, '\n', '> Identity:', validatedOpts.identity);
    await signApplication(validatedOpts, identityInUse);
    // Post-sign operations
    (0, util_1.debugLog)('Application signed.');
}
exports.signApp = signApp;
/**
 * This function is a legacy callback implementation.
 *
 * @deprecated Please use the Promise-based {@link signAsync} method instead.
 * @category Codesign
 */
const sign = (opts, cb) => {
    signApp(opts)
        .then(() => {
        (0, util_1.debugLog)('Application signed: ' + opts.app);
        if (cb)
            cb();
    })
        .catch((err) => {
        if (err.message)
            (0, util_1.debugLog)(err.message);
        else if (err.stack)
            (0, util_1.debugLog)(err.stack);
        else
            (0, util_1.debugLog)(err);
        if (cb)
            cb(err);
    });
};
exports.sign = sign;
//# sourceMappingURL=sign.js.map
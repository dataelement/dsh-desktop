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
Object.defineProperty(exports, "__esModule", { value: true });
exports.flat = exports.buildPkg = void 0;
const path = __importStar(require("path"));
const util_1 = require("./util");
const util_identities_1 = require("./util-identities");
const pkgVersion = require('../../package.json').version;
/**
 * This function returns a promise validating all options passed in opts.
 * @function
 * @param {Object} opts - Options.
 * @returns {Promise} Promise.
 */
async function validateFlatOpts(opts) {
    await (0, util_1.validateOptsApp)(opts);
    let pkg = opts.pkg;
    if (pkg) {
        if (typeof pkg !== 'string')
            throw new Error('`pkg` must be a string.');
        if (path.extname(pkg) !== '.pkg') {
            throw new Error('Extension of output package must be `.pkg`.');
        }
    }
    else {
        (0, util_1.debugWarn)('No `pkg` passed in arguments, will fallback to default inferred from the given application.');
        pkg = path.join(path.dirname(opts.app), path.basename(opts.app, '.app') + '.pkg');
    }
    let install = opts.install;
    if (install) {
        if (typeof install !== 'string') {
            return Promise.reject(new Error('`install` must be a string.'));
        }
    }
    else {
        (0, util_1.debugWarn)('No `install` passed in arguments, will fallback to default `/Applications`.');
        install = '/Applications';
    }
    if (typeof opts.scripts === 'string' && opts.platform === 'mas') {
        (0, util_1.debugWarn)('Mac App Store packages cannot have `scripts`, ignoring option.');
    }
    return Object.assign(Object.assign({}, opts), { pkg,
        install, platform: await (0, util_1.validateOptsPlatform)(opts) });
}
/**
 * This function returns a promise flattening the application.
 * @param opts - Options for building the .pkg archive
 */
async function buildApplicationPkg(opts, identity) {
    if (opts.platform === 'mas') {
        const args = ['--component', opts.app, opts.install, '--sign', identity.name, opts.pkg];
        if (opts.keychain) {
            args.unshift('--keychain', opts.keychain);
        }
        (0, util_1.debugLog)('Flattening Mac App Store package... ' + opts.app);
        await (0, util_1.execFileAsync)('productbuild', args);
    }
    else {
        const componentPkgPath = path.join(path.dirname(opts.app), path.basename(opts.app, '.app') + '-component.pkg');
        const pkgbuildArgs = [
            '--install-location',
            opts.install,
            '--component',
            opts.app,
            componentPkgPath
        ];
        if (opts.scripts) {
            pkgbuildArgs.unshift('--scripts', opts.scripts);
        }
        (0, util_1.debugLog)('Building component package... ' + opts.app);
        await (0, util_1.execFileAsync)('pkgbuild', pkgbuildArgs);
        const args = ['--package', componentPkgPath, opts.install, '--sign', identity.name, opts.pkg];
        if (opts.keychain) {
            args.unshift('--keychain', opts.keychain);
        }
        (0, util_1.debugLog)('Flattening OS X Installer package... ' + opts.app);
        await (0, util_1.execFileAsync)('productbuild', args);
        await (0, util_1.execFileAsync)('rm', [componentPkgPath]);
    }
}
/**
 * Generates a flat `.pkg` installer for a packaged Electron `.app` bundle.
 * @returns A void Promise once the flattening operation is complete.
 *
 * @category Flat
 */
async function buildPkg(_opts) {
    (0, util_1.debugLog)('@electron/osx-sign@%s', pkgVersion);
    const validatedOptions = await validateFlatOpts(_opts);
    let identities = [];
    let identityInUse = null;
    if (validatedOptions.identity) {
        (0, util_1.debugLog)('`identity` passed in arguments.');
        if (validatedOptions.identityValidation === false) {
            // Do nothing
        }
        else {
            identities = await (0, util_identities_1.findIdentities)(validatedOptions.keychain || null, validatedOptions.identity);
        }
    }
    else {
        (0, util_1.debugWarn)('No `identity` passed in arguments...');
        if (validatedOptions.platform === 'mas') {
            (0, util_1.debugLog)('Finding `3rd Party Mac Developer Installer` certificate for flattening app distribution in the Mac App Store...');
            identities = await (0, util_identities_1.findIdentities)(validatedOptions.keychain || null, '3rd Party Mac Developer Installer:');
        }
        else {
            (0, util_1.debugLog)('Finding `Developer ID Application` certificate for distribution outside the Mac App Store...');
            identities = await (0, util_identities_1.findIdentities)(validatedOptions.keychain || null, 'Developer ID Installer:');
        }
    }
    if (identities.length > 0) {
        // Provisioning profile(s) found
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
    (0, util_1.debugLog)('Flattening application...', '\n', '> Application:', validatedOptions.app, '\n', '> Package output:', validatedOptions.pkg, '\n', '> Install path:', validatedOptions.install, '\n', '> Identity:', validatedOptions.identity, '\n', '> Scripts:', validatedOptions.scripts);
    await buildApplicationPkg(validatedOptions, identityInUse);
    (0, util_1.debugLog)('Application flattened.');
}
exports.buildPkg = buildPkg;
/**
 * This function is exported with normal callback implementation.
 *
 * @deprecated Please use the Promise-based {@link flatAsync} method instead.
 * @category Flat
 */
const flat = (opts, cb) => {
    buildPkg(opts)
        .then(() => {
        (0, util_1.debugLog)('Application flattened, saved to: ' + opts.app);
        if (cb)
            cb();
    })
        .catch((err) => {
        (0, util_1.debugLog)('Flat failed:');
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
exports.flat = flat;
//# sourceMappingURL=flat.js.map
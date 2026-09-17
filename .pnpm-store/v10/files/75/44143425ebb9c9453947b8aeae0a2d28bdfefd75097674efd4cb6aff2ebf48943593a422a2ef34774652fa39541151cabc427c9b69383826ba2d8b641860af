import * as path from 'path';
import { debugLog, debugWarn, execFileAsync, validateOptsApp, validateOptsPlatform } from './util';
import { findIdentities } from './util-identities';
const pkgVersion = require('../../package.json').version;
/**
 * This function returns a promise validating all options passed in opts.
 * @function
 * @param {Object} opts - Options.
 * @returns {Promise} Promise.
 */
async function validateFlatOpts(opts) {
    await validateOptsApp(opts);
    let pkg = opts.pkg;
    if (pkg) {
        if (typeof pkg !== 'string')
            throw new Error('`pkg` must be a string.');
        if (path.extname(pkg) !== '.pkg') {
            throw new Error('Extension of output package must be `.pkg`.');
        }
    }
    else {
        debugWarn('No `pkg` passed in arguments, will fallback to default inferred from the given application.');
        pkg = path.join(path.dirname(opts.app), path.basename(opts.app, '.app') + '.pkg');
    }
    let install = opts.install;
    if (install) {
        if (typeof install !== 'string') {
            return Promise.reject(new Error('`install` must be a string.'));
        }
    }
    else {
        debugWarn('No `install` passed in arguments, will fallback to default `/Applications`.');
        install = '/Applications';
    }
    if (typeof opts.scripts === 'string' && opts.platform === 'mas') {
        debugWarn('Mac App Store packages cannot have `scripts`, ignoring option.');
    }
    return Object.assign(Object.assign({}, opts), { pkg,
        install, platform: await validateOptsPlatform(opts) });
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
        debugLog('Flattening Mac App Store package... ' + opts.app);
        await execFileAsync('productbuild', args);
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
        debugLog('Building component package... ' + opts.app);
        await execFileAsync('pkgbuild', pkgbuildArgs);
        const args = ['--package', componentPkgPath, opts.install, '--sign', identity.name, opts.pkg];
        if (opts.keychain) {
            args.unshift('--keychain', opts.keychain);
        }
        debugLog('Flattening OS X Installer package... ' + opts.app);
        await execFileAsync('productbuild', args);
        await execFileAsync('rm', [componentPkgPath]);
    }
}
/**
 * Generates a flat `.pkg` installer for a packaged Electron `.app` bundle.
 * @returns A void Promise once the flattening operation is complete.
 *
 * @category Flat
 */
export async function buildPkg(_opts) {
    debugLog('@electron/osx-sign@%s', pkgVersion);
    const validatedOptions = await validateFlatOpts(_opts);
    let identities = [];
    let identityInUse = null;
    if (validatedOptions.identity) {
        debugLog('`identity` passed in arguments.');
        if (validatedOptions.identityValidation === false) {
            // Do nothing
        }
        else {
            identities = await findIdentities(validatedOptions.keychain || null, validatedOptions.identity);
        }
    }
    else {
        debugWarn('No `identity` passed in arguments...');
        if (validatedOptions.platform === 'mas') {
            debugLog('Finding `3rd Party Mac Developer Installer` certificate for flattening app distribution in the Mac App Store...');
            identities = await findIdentities(validatedOptions.keychain || null, '3rd Party Mac Developer Installer:');
        }
        else {
            debugLog('Finding `Developer ID Application` certificate for distribution outside the Mac App Store...');
            identities = await findIdentities(validatedOptions.keychain || null, 'Developer ID Installer:');
        }
    }
    if (identities.length > 0) {
        // Provisioning profile(s) found
        if (identities.length > 1) {
            debugWarn('Multiple identities found, will use the first discovered.');
        }
        else {
            debugLog('Found 1 identity.');
        }
        identityInUse = identities[0];
    }
    else {
        // No identity found
        throw new Error('No identity found for signing.');
    }
    debugLog('Flattening application...', '\n', '> Application:', validatedOptions.app, '\n', '> Package output:', validatedOptions.pkg, '\n', '> Install path:', validatedOptions.install, '\n', '> Identity:', validatedOptions.identity, '\n', '> Scripts:', validatedOptions.scripts);
    await buildApplicationPkg(validatedOptions, identityInUse);
    debugLog('Application flattened.');
}
/**
 * This function is exported with normal callback implementation.
 *
 * @deprecated Please use the Promise-based {@link flatAsync} method instead.
 * @category Flat
 */
export const flat = (opts, cb) => {
    buildPkg(opts)
        .then(() => {
        debugLog('Application flattened, saved to: ' + opts.app);
        if (cb)
            cb();
    })
        .catch((err) => {
        debugLog('Flat failed:');
        if (err.message)
            debugLog(err.message);
        else if (err.stack)
            debugLog(err.stack);
        else
            debugLog(err);
        if (cb)
            cb(err);
    });
};
//# sourceMappingURL=flat.js.map
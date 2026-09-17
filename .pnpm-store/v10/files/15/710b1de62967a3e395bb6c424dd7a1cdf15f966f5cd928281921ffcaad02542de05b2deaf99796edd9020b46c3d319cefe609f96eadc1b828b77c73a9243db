import * as child from 'child_process';
import * as fs from 'fs-extra';
import { isBinaryFile } from 'isbinaryfile';
import * as path from 'path';
import debug from 'debug';
export const debugLog = debug('electron-osx-sign');
debugLog.log = console.log.bind(console);
export const debugWarn = debug('electron-osx-sign:warn');
debugWarn.log = console.warn.bind(console);
const removePassword = function (input) {
    return input.replace(/(-P |pass:|\/p|-pass )([^ ]+)/, function (_, p1) {
        return `${p1}***`;
    });
};
export async function execFileAsync(file, args, options = {}) {
    if (debugLog.enabled) {
        debugLog('Executing...', file, args && Array.isArray(args) ? removePassword(args.join(' ')) : '');
    }
    return new Promise(function (resolve, reject) {
        child.execFile(file, args, options, function (err, stdout, stderr) {
            if (err) {
                debugLog('Error executing file:', '\n', '> Stdout:', stdout, '\n', '> Stderr:', stderr);
                reject(err);
                return;
            }
            resolve(stdout);
        });
    });
}
export function compactFlattenedList(list) {
    const result = [];
    function populateResult(list) {
        if (!Array.isArray(list)) {
            if (list)
                result.push(list);
        }
        else if (list.length > 0) {
            for (const item of list)
                if (item)
                    populateResult(item);
        }
    }
    populateResult(list);
    return result;
}
/**
 * Returns the path to the "Contents" folder inside the application bundle
 */
export function getAppContentsPath(opts) {
    return path.join(opts.app, 'Contents');
}
/**
 * Returns the path to app "Frameworks" within contents.
 */
export function getAppFrameworksPath(opts) {
    return path.join(getAppContentsPath(opts), 'Frameworks');
}
export async function detectElectronPlatform(opts) {
    const appFrameworksPath = getAppFrameworksPath(opts);
    if (await fs.pathExists(path.resolve(appFrameworksPath, 'Squirrel.framework'))) {
        return 'darwin';
    }
    else {
        return 'mas';
    }
}
/**
 * This function returns a promise resolving the file path if file binary.
 */
async function getFilePathIfBinary(filePath) {
    if (await isBinaryFile(filePath)) {
        return filePath;
    }
    return null;
}
/**
 * This function returns a promise validating opts.app, the application to be signed or flattened.
 */
export async function validateOptsApp(opts) {
    if (!opts.app) {
        throw new Error('Path to application must be specified.');
    }
    if (path.extname(opts.app) !== '.app') {
        throw new Error('Extension of application must be `.app`.');
    }
    if (!(await fs.pathExists(opts.app))) {
        throw new Error(`Application at path "${opts.app}" could not be found`);
    }
}
/**
 * This function returns a promise validating opts.platform, the platform of Electron build. It allows auto-discovery if no opts.platform is specified.
 */
export async function validateOptsPlatform(opts) {
    if (opts.platform) {
        if (opts.platform === 'mas' || opts.platform === 'darwin') {
            return opts.platform;
        }
        else {
            debugWarn('`platform` passed in arguments not supported, checking Electron platform...');
        }
    }
    else {
        debugWarn('No `platform` passed in arguments, checking Electron platform...');
    }
    return await detectElectronPlatform(opts);
}
/**
 * This function returns a promise resolving all child paths within the directory specified.
 * @function
 * @param {string} dirPath - Path to directory.
 * @returns {Promise} Promise resolving child paths needing signing in order.
 * @internal
 */
export async function walkAsync(dirPath) {
    debugLog('Walking... ' + dirPath);
    async function _walkAsync(dirPath) {
        const children = await fs.readdir(dirPath);
        return await Promise.all(children.map(async (child) => {
            const filePath = path.resolve(dirPath, child);
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
                switch (path.extname(filePath)) {
                    case '.cstemp': // Temporary file generated from past codesign
                        debugLog('Removing... ' + filePath);
                        await fs.remove(filePath);
                        return null;
                    default:
                        return await getFilePathIfBinary(filePath);
                }
            }
            else if (stat.isDirectory() && !stat.isSymbolicLink()) {
                const walkResult = await _walkAsync(filePath);
                switch (path.extname(filePath)) {
                    case '.app': // Application
                    case '.framework': // Framework
                        walkResult.push(filePath);
                }
                return walkResult;
            }
            return null;
        }));
    }
    const allPaths = await _walkAsync(dirPath);
    return compactFlattenedList(allPaths);
}
//# sourceMappingURL=util.js.map
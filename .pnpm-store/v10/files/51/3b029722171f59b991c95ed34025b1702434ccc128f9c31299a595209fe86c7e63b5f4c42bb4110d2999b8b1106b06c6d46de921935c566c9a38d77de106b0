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
exports.walkAsync = exports.validateOptsPlatform = exports.validateOptsApp = exports.detectElectronPlatform = exports.getAppFrameworksPath = exports.getAppContentsPath = exports.compactFlattenedList = exports.execFileAsync = exports.debugWarn = exports.debugLog = void 0;
const child = __importStar(require("child_process"));
const fs = __importStar(require("fs-extra"));
const isbinaryfile_1 = require("isbinaryfile");
const path = __importStar(require("path"));
const debug_1 = __importDefault(require("debug"));
exports.debugLog = (0, debug_1.default)('electron-osx-sign');
exports.debugLog.log = console.log.bind(console);
exports.debugWarn = (0, debug_1.default)('electron-osx-sign:warn');
exports.debugWarn.log = console.warn.bind(console);
const removePassword = function (input) {
    return input.replace(/(-P |pass:|\/p|-pass )([^ ]+)/, function (_, p1) {
        return `${p1}***`;
    });
};
async function execFileAsync(file, args, options = {}) {
    if (exports.debugLog.enabled) {
        (0, exports.debugLog)('Executing...', file, args && Array.isArray(args) ? removePassword(args.join(' ')) : '');
    }
    return new Promise(function (resolve, reject) {
        child.execFile(file, args, options, function (err, stdout, stderr) {
            if (err) {
                (0, exports.debugLog)('Error executing file:', '\n', '> Stdout:', stdout, '\n', '> Stderr:', stderr);
                reject(err);
                return;
            }
            resolve(stdout);
        });
    });
}
exports.execFileAsync = execFileAsync;
function compactFlattenedList(list) {
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
exports.compactFlattenedList = compactFlattenedList;
/**
 * Returns the path to the "Contents" folder inside the application bundle
 */
function getAppContentsPath(opts) {
    return path.join(opts.app, 'Contents');
}
exports.getAppContentsPath = getAppContentsPath;
/**
 * Returns the path to app "Frameworks" within contents.
 */
function getAppFrameworksPath(opts) {
    return path.join(getAppContentsPath(opts), 'Frameworks');
}
exports.getAppFrameworksPath = getAppFrameworksPath;
async function detectElectronPlatform(opts) {
    const appFrameworksPath = getAppFrameworksPath(opts);
    if (await fs.pathExists(path.resolve(appFrameworksPath, 'Squirrel.framework'))) {
        return 'darwin';
    }
    else {
        return 'mas';
    }
}
exports.detectElectronPlatform = detectElectronPlatform;
/**
 * This function returns a promise resolving the file path if file binary.
 */
async function getFilePathIfBinary(filePath) {
    if (await (0, isbinaryfile_1.isBinaryFile)(filePath)) {
        return filePath;
    }
    return null;
}
/**
 * This function returns a promise validating opts.app, the application to be signed or flattened.
 */
async function validateOptsApp(opts) {
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
exports.validateOptsApp = validateOptsApp;
/**
 * This function returns a promise validating opts.platform, the platform of Electron build. It allows auto-discovery if no opts.platform is specified.
 */
async function validateOptsPlatform(opts) {
    if (opts.platform) {
        if (opts.platform === 'mas' || opts.platform === 'darwin') {
            return opts.platform;
        }
        else {
            (0, exports.debugWarn)('`platform` passed in arguments not supported, checking Electron platform...');
        }
    }
    else {
        (0, exports.debugWarn)('No `platform` passed in arguments, checking Electron platform...');
    }
    return await detectElectronPlatform(opts);
}
exports.validateOptsPlatform = validateOptsPlatform;
/**
 * This function returns a promise resolving all child paths within the directory specified.
 * @function
 * @param {string} dirPath - Path to directory.
 * @returns {Promise} Promise resolving child paths needing signing in order.
 * @internal
 */
async function walkAsync(dirPath) {
    (0, exports.debugLog)('Walking... ' + dirPath);
    async function _walkAsync(dirPath) {
        const children = await fs.readdir(dirPath);
        return await Promise.all(children.map(async (child) => {
            const filePath = path.resolve(dirPath, child);
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
                switch (path.extname(filePath)) {
                    case '.cstemp': // Temporary file generated from past codesign
                        (0, exports.debugLog)('Removing... ' + filePath);
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
exports.walkAsync = walkAsync;
//# sourceMappingURL=util.js.map
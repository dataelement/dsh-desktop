import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire, builtinModules } from 'node:module';
import colors from 'picocolors';
import { loadEnv as loadEnv$1, mergeConfig, normalizePath, build, createLogger } from 'vite';
import { build as build$1 } from 'esbuild';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs$1 from 'node:fs/promises';
import MagicString from 'magic-string';
import * as babel from '@babel/core';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
function isObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}
const wildcardHosts = new Set(['0.0.0.0', '::', '0000:0000:0000:0000:0000:0000:0000:0000']);
function resolveHostname(optionsHost) {
    return typeof optionsHost === 'string' && !wildcardHosts.has(optionsHost) ? optionsHost : 'localhost';
}
const queryRE = /\?.*$/s;
const hashRE = /#.*$/s;
const cleanUrl = (url) => url.replace(hashRE, '').replace(queryRE, '');
function getHash(text) {
    return createHash('sha256')
        .update(text)
        .digest('hex')
        .substring(0, 8);
}
function toRelativePath(filename, importer) {
    const relPath = path.posix.relative(path.dirname(importer), filename);
    return relPath.startsWith('.') ? relPath : `./${relPath}`;
}
/**
 * Load `.env` files within the `envDir` (default: `process.cwd()`) .
 * By default, only env variables prefixed with `VITE_`, `MAIN_VITE_`, `PRELOAD_VITE_` and
 * `RENDERER_VITE_` are loaded, unless `prefixes` is changed.
 */
function loadEnv(mode, envDir = process.cwd(), prefixes = ['VITE_', 'MAIN_VITE_', 'PRELOAD_VITE_', 'RENDERER_VITE_']) {
    return loadEnv$1(mode, envDir, prefixes);
}
let packageCached = null;
function loadPackageData(root = process.cwd()) {
    if (packageCached)
        return packageCached;
    const pkg = path.join(root, 'package.json');
    if (fs.existsSync(pkg)) {
        const _require = createRequire(import.meta.url);
        const data = _require(pkg);
        packageCached = {
            main: data.main,
            type: data.type,
            dependencies: data.dependencies
        };
        return packageCached;
    }
    return null;
}
function isFilePathESM(filePath) {
    if (/\.m[jt]s$/.test(filePath) || filePath.endsWith('.ts')) {
        return true;
    }
    else if (/\.c[jt]s$/.test(filePath)) {
        return false;
    }
    else {
        const pkg = loadPackageData();
        return pkg?.type === 'module';
    }
}
function deepClone(value) {
    if (Array.isArray(value)) {
        return value.map(v => deepClone(v));
    }
    if (isObject(value)) {
        const cloned = {};
        for (const key in value) {
            cloned[key] = deepClone(value[key]);
        }
        return cloned;
    }
    if (typeof value === 'function') {
        return value;
    }
    if (value instanceof RegExp) {
        return new RegExp(value);
    }
    if (typeof value === 'object' && value != null) {
        throw new Error('Cannot deep clone non-plain object');
    }
    return value;
}
async function asyncFlatten(arr) {
    do {
        arr = (await Promise.all(arr)).flat(Infinity);
    } while (arr.some((v) => v?.then));
    return arr;
}

const _require$2 = createRequire(import.meta.url);
const ensureElectronEntryFile = (root = process.cwd()) => {
    if (process.env.ELECTRON_ENTRY)
        return;
    const pkg = loadPackageData();
    if (pkg) {
        if (!pkg.main) {
            throw new Error('No entry point found for electron app, please add a "main" field to package.json');
        }
        else {
            const entryPath = path.resolve(root, pkg.main);
            if (!fs.existsSync(entryPath)) {
                throw new Error(`No electron app entry file found: ${entryPath}`);
            }
        }
    }
    else {
        throw new Error('Not found: package.json');
    }
};
const getElectronMajorVer = () => {
    let majorVer = process.env.ELECTRON_MAJOR_VER || '';
    if (!majorVer) {
        const pkg = _require$2.resolve('electron/package.json');
        if (fs.existsSync(pkg)) {
            const version = _require$2(pkg).version;
            majorVer = version.split('.')[0];
            process.env.ELECTRON_MAJOR_VER = majorVer;
        }
    }
    return majorVer;
};
function supportESM() {
    const majorVer = getElectronMajorVer();
    return parseInt(majorVer) >= 28;
}
function supportImportMetaPaths() {
    const majorVer = getElectronMajorVer();
    return parseInt(majorVer) >= 30;
}
function getElectronPath() {
    let electronExecPath = process.env.ELECTRON_EXEC_PATH || '';
    if (!electronExecPath) {
        const electronModulePath = path.dirname(_require$2.resolve('electron'));
        const pathFile = path.join(electronModulePath, 'path.txt');
        let executablePath;
        if (fs.existsSync(pathFile)) {
            executablePath = fs.readFileSync(pathFile, 'utf-8');
        }
        if (executablePath) {
            electronExecPath = path.join(electronModulePath, 'dist', executablePath);
            process.env.ELECTRON_EXEC_PATH = electronExecPath;
        }
        else {
            throw new Error('Electron uninstall');
        }
    }
    return electronExecPath;
}
function getElectronNodeTarget() {
    const electronVer = getElectronMajorVer();
    const nodeVer = {
        '39': '22.20',
        '38': '22.19',
        '37': '22.16',
        '36': '22.14',
        '35': '22.14',
        '34': '20.18',
        '33': '20.18',
        '32': '20.16',
        '31': '20.14',
        '30': '20.11',
        '29': '20.9',
        '28': '18.18',
        '27': '18.17',
        '26': '18.16',
        '25': '18.15',
        '24': '18.14',
        '23': '18.12',
        '22': '16.17'
    };
    if (electronVer && parseInt(electronVer) > 10) {
        let target = nodeVer[electronVer];
        if (!target)
            target = Object.values(nodeVer).reverse()[0];
        return 'node' + target;
    }
    return '';
}
function getElectronChromeTarget() {
    const electronVer = getElectronMajorVer();
    const chromeVer = {
        '39': '142',
        '38': '140',
        '37': '138',
        '36': '136',
        '35': '134',
        '34': '132',
        '33': '130',
        '32': '128',
        '31': '126',
        '30': '124',
        '29': '122',
        '28': '120',
        '27': '118',
        '26': '116',
        '25': '114',
        '24': '112',
        '23': '110',
        '22': '108'
    };
    if (electronVer && parseInt(electronVer) > 10) {
        let target = chromeVer[electronVer];
        if (!target)
            target = Object.values(chromeVer).reverse()[0];
        return 'chrome' + target;
    }
    return '';
}
function startElectron(root) {
    ensureElectronEntryFile(root);
    const electronPath = getElectronPath();
    const isDev = process.env.NODE_ENV_ELECTRON_VITE === 'development';
    const args = process.env.ELECTRON_CLI_ARGS ? JSON.parse(process.env.ELECTRON_CLI_ARGS) : [];
    if (!!process.env.REMOTE_DEBUGGING_PORT && isDev) {
        args.push(`--remote-debugging-port=${process.env.REMOTE_DEBUGGING_PORT}`);
    }
    if (!!process.env.V8_INSPECTOR_PORT && isDev) {
        args.push(`--inspect=${process.env.V8_INSPECTOR_PORT}`);
    }
    if (!!process.env.V8_INSPECTOR_BRK_PORT && isDev) {
        args.push(`--inspect-brk=${process.env.V8_INSPECTOR_BRK_PORT}`);
    }
    if (process.env.NO_SANDBOX === '1') {
        args.push('--no-sandbox');
    }
    const entry = process.env.ELECTRON_ENTRY || '.';
    const ps = spawn(electronPath, [entry].concat(args), { stdio: 'inherit' });
    ps.on('close', process.exit);
    return ps;
}

function findLibEntry(root, scope) {
    for (const name of ['index', scope]) {
        for (const ext of ['js', 'ts', 'mjs', 'cjs']) {
            const entryFile = path.resolve(root, 'src', scope, `${name}.${ext}`);
            if (fs.existsSync(entryFile)) {
                return entryFile;
            }
        }
    }
    return undefined;
}
function findInput(root, scope = 'renderer') {
    const rendererDir = path.resolve(root, 'src', scope, 'index.html');
    if (fs.existsSync(rendererDir)) {
        return rendererDir;
    }
    return '';
}
function processEnvDefine() {
    return {
        'process.env': `process.env`,
        'global.process.env': `global.process.env`,
        'globalThis.process.env': `globalThis.process.env`
    };
}
function resolveBuildOutputs$1(outputs, libOptions) {
    if (libOptions && !Array.isArray(outputs)) {
        const libFormats = libOptions.formats || [];
        return libFormats.map(format => ({ ...outputs, format }));
    }
    return outputs;
}
function electronMainConfigPresetPlugin(options) {
    return {
        name: 'vite:electron-main-config-preset',
        apply: 'build',
        enforce: 'pre',
        config(config) {
            const root = options?.root || process.cwd();
            const nodeTarget = getElectronNodeTarget();
            const pkg = loadPackageData() || { type: 'commonjs' };
            const format = pkg.type && pkg.type === 'module' && supportESM() ? 'es' : 'cjs';
            const defaultConfig = {
                resolve: {
                    browserField: false,
                    mainFields: ['module', 'jsnext:main', 'jsnext'],
                    conditions: ['node']
                },
                build: {
                    outDir: path.resolve(root, 'out', 'main'),
                    target: nodeTarget,
                    assetsDir: 'chunks',
                    rollupOptions: {
                        external: ['electron', /^electron\/.+/, ...builtinModules.flatMap(m => [m, `node:${m}`])],
                        output: {}
                    },
                    reportCompressedSize: false,
                    minify: false
                }
            };
            const build = config.build || {};
            const rollupOptions = build.rollupOptions || {};
            if (!rollupOptions.input) {
                const libOptions = build.lib;
                const outputOptions = rollupOptions.output;
                defaultConfig.build['lib'] = {
                    entry: findLibEntry(root, 'main'),
                    formats: libOptions && libOptions.formats && libOptions.formats.length > 0
                        ? []
                        : [outputOptions && !Array.isArray(outputOptions) && outputOptions.format ? outputOptions.format : format]
                };
            }
            else {
                defaultConfig.build.rollupOptions.output['format'] = format;
            }
            defaultConfig.build.rollupOptions.output['assetFileNames'] = path.posix.join(build.assetsDir || defaultConfig.build.assetsDir, '[name]-[hash].[ext]');
            const buildConfig = mergeConfig(defaultConfig.build, build);
            config.build = buildConfig;
            config.resolve = mergeConfig(defaultConfig.resolve, config.resolve || {});
            config.define = config.define || {};
            config.define = { ...processEnvDefine(), ...config.define };
            config.envPrefix = config.envPrefix || ['MAIN_VITE_', 'VITE_'];
            config.publicDir = config.publicDir || 'resources';
            // do not copy public dir
            config.build.copyPublicDir = false;
            // module preload polyfill does not apply to nodejs (main process)
            config.build.modulePreload = false;
            // enable ssr build
            config.build.ssr = true;
            config.build.ssrEmitAssets = true;
            config.ssr = { ...config.ssr, ...{ noExternal: true } };
        }
    };
}
function electronMainConfigValidatorPlugin() {
    return {
        name: 'vite:electron-main-config-validator',
        apply: 'build',
        enforce: 'post',
        configResolved(config) {
            const build = config.build;
            if (!build.target) {
                throw new Error('build.target option is required in the electron vite main config.');
            }
            else {
                const targets = Array.isArray(build.target) ? build.target : [build.target];
                if (targets.some(t => !t.startsWith('node'))) {
                    throw new Error('The electron vite main config build.target option must be "node?".');
                }
            }
            const libOptions = build.lib;
            const rollupOptions = build.rollupOptions;
            if (!(libOptions && libOptions.entry) && !rollupOptions?.input) {
                throw new Error('An entry point is required in the electron vite main config, ' +
                    'which can be specified using "build.lib.entry" or "build.rollupOptions.input".');
            }
            const resolvedOutputs = resolveBuildOutputs$1(rollupOptions.output, libOptions);
            if (resolvedOutputs) {
                const outputs = Array.isArray(resolvedOutputs) ? resolvedOutputs : [resolvedOutputs];
                if (outputs.length > 1) {
                    throw new Error('The electron vite main config does not support multiple outputs.');
                }
                else {
                    const outpout = outputs[0];
                    if (['es', 'cjs'].includes(outpout.format || '')) {
                        if (outpout.format === 'es' && !supportESM()) {
                            throw new Error('The electron vite main config output format does not support "es", ' +
                                'you can upgrade electron to the latest version or switch to "cjs" format.');
                        }
                    }
                    else {
                        throw new Error(`The electron vite main config output format must be "cjs"${supportESM() ? ' or "es"' : ''}.`);
                    }
                }
            }
        }
    };
}
function electronPreloadConfigPresetPlugin(options) {
    return {
        name: 'vite:electron-preload-config-preset',
        apply: 'build',
        enforce: 'pre',
        config(config) {
            const root = options?.root || process.cwd();
            const nodeTarget = getElectronNodeTarget();
            const pkg = loadPackageData() || { type: 'commonjs' };
            const format = pkg.type && pkg.type === 'module' && supportESM() ? 'es' : 'cjs';
            const defaultConfig = {
                ssr: {
                    resolve: {
                        conditions: ['module', 'browser', 'development|production'],
                        mainFields: ['browser', 'module', 'jsnext:main', 'jsnext']
                    }
                },
                build: {
                    outDir: path.resolve(root, 'out', 'preload'),
                    target: nodeTarget,
                    assetsDir: 'chunks',
                    rollupOptions: {
                        external: ['electron', /^electron\/.+/, ...builtinModules.flatMap(m => [m, `node:${m}`])],
                        output: {}
                    },
                    reportCompressedSize: false,
                    minify: false
                }
            };
            const build = config.build || {};
            const rollupOptions = build.rollupOptions || {};
            if (!rollupOptions.input) {
                const libOptions = build.lib;
                const outputOptions = rollupOptions.output;
                defaultConfig.build['lib'] = {
                    entry: findLibEntry(root, 'preload'),
                    formats: libOptions && libOptions.formats && libOptions.formats.length > 0
                        ? []
                        : [outputOptions && !Array.isArray(outputOptions) && outputOptions.format ? outputOptions.format : format]
                };
            }
            else {
                defaultConfig.build.rollupOptions.output['format'] = format;
            }
            defaultConfig.build.rollupOptions.output['assetFileNames'] = path.posix.join(build.assetsDir || defaultConfig.build.assetsDir, '[name]-[hash].[ext]');
            const buildConfig = mergeConfig(defaultConfig.build, build);
            config.build = buildConfig;
            const resolvedOutputs = resolveBuildOutputs$1(config.build.rollupOptions.output, config.build.lib || false);
            if (resolvedOutputs) {
                const outputs = Array.isArray(resolvedOutputs) ? resolvedOutputs : [resolvedOutputs];
                if (outputs.find(({ format }) => format === 'es')) {
                    if (Array.isArray(config.build.rollupOptions.output)) {
                        config.build.rollupOptions.output.forEach(output => {
                            if (output.format === 'es') {
                                output['entryFileNames'] = '[name].mjs';
                                output['chunkFileNames'] = '[name]-[hash].mjs';
                            }
                        });
                    }
                    else {
                        config.build.rollupOptions.output['entryFileNames'] = '[name].mjs';
                        config.build.rollupOptions.output['chunkFileNames'] = '[name]-[hash].mjs';
                    }
                }
            }
            config.define = config.define || {};
            config.define = { ...processEnvDefine(), ...config.define };
            config.envPrefix = config.envPrefix || ['PRELOAD_VITE_', 'VITE_'];
            config.publicDir = config.publicDir || 'resources';
            // do not copy public dir
            config.build.copyPublicDir = false;
            // module preload polyfill does not apply to nodejs (preload scripts)
            config.build.modulePreload = false;
            // enable ssr build
            config.build.ssr = true;
            config.build.ssrEmitAssets = true;
            config.ssr = mergeConfig(defaultConfig.ssr, config.ssr || {});
            config.ssr.noExternal = true;
        }
    };
}
function electronPreloadConfigValidatorPlugin() {
    return {
        name: 'vite:electron-preload-config-validator',
        apply: 'build',
        enforce: 'post',
        configResolved(config) {
            const build = config.build;
            if (!build.target) {
                throw new Error('build.target option is required in the electron vite preload config.');
            }
            else {
                const targets = Array.isArray(build.target) ? build.target : [build.target];
                if (targets.some(t => !t.startsWith('node'))) {
                    throw new Error('The electron vite preload config build.target must be "node?".');
                }
            }
            const libOptions = build.lib;
            const rollupOptions = build.rollupOptions;
            if (!(libOptions && libOptions.entry) && !rollupOptions?.input) {
                throw new Error('An entry point is required in the electron vite preload config, ' +
                    'which can be specified using "build.lib.entry" or "build.rollupOptions.input".');
            }
            const resolvedOutputs = resolveBuildOutputs$1(rollupOptions.output, libOptions);
            if (resolvedOutputs) {
                const outputs = Array.isArray(resolvedOutputs) ? resolvedOutputs : [resolvedOutputs];
                if (outputs.length > 1) {
                    throw new Error('The electron vite preload config does not support multiple outputs.');
                }
                else {
                    const outpout = outputs[0];
                    if (['es', 'cjs'].includes(outpout.format || '')) {
                        if (outpout.format === 'es' && !supportESM()) {
                            throw new Error('The electron vite preload config output format does not support "es", ' +
                                'you can upgrade electron to the latest version or switch to "cjs" format.');
                        }
                    }
                    else {
                        throw new Error(`The electron vite preload config output format must be "cjs"${supportESM() ? ' or "es"' : ''}.`);
                    }
                }
            }
        }
    };
}
function electronRendererConfigPresetPlugin(options) {
    return {
        name: 'vite:electron-renderer-config-preset',
        enforce: 'pre',
        config(config) {
            const root = options?.root || process.cwd();
            config.base =
                config.mode === 'production' || process.env.NODE_ENV_ELECTRON_VITE === 'production' ? './' : config.base;
            config.root = config.root || './src/renderer';
            const chromeTarget = getElectronChromeTarget();
            const emptyOutDir = () => {
                let outDir = config.build?.outDir;
                if (outDir) {
                    if (!path.isAbsolute(outDir)) {
                        outDir = path.resolve(root, outDir);
                    }
                    const resolvedRoot = normalizePath(path.resolve(root));
                    return normalizePath(outDir).startsWith(resolvedRoot + '/');
                }
                return true;
            };
            const defaultConfig = {
                build: {
                    outDir: path.resolve(root, 'out', 'renderer'),
                    target: chromeTarget,
                    modulePreload: { polyfill: false },
                    rollupOptions: {
                        input: findInput(root)
                    },
                    reportCompressedSize: false,
                    minify: false,
                    emptyOutDir: emptyOutDir()
                }
            };
            if (config.build?.outDir) {
                config.build.outDir = path.resolve(root, config.build.outDir);
            }
            const buildConfig = mergeConfig(defaultConfig.build, config.build || {});
            config.build = buildConfig;
            config.envDir = config.envDir || path.resolve(root);
            config.envPrefix = config.envPrefix || ['RENDERER_VITE_', 'VITE_'];
        }
    };
}
function electronRendererConfigValidatorPlugin() {
    return {
        name: 'vite:electron-renderer-config-validator',
        enforce: 'post',
        configResolved(config) {
            if (config.base !== './' && config.base !== '/') {
                config.logger.warn(colors.yellow('(!) Should not set "base" option for the electron vite renderer config.'));
            }
            const build = config.build;
            if (!build.target) {
                throw new Error('build.target option is required in the electron vite renderer config.');
            }
            else {
                const targets = Array.isArray(build.target) ? build.target : [build.target];
                if (targets.some(t => !t.startsWith('chrome') && !/^es((202\d{1})|next)$/.test(t))) {
                    config.logger.warn('The electron vite renderer config build.target is not "chrome?" or "es?". This could be a mistake.');
                }
            }
            const rollupOptions = build.rollupOptions;
            if (!rollupOptions.input) {
                config.logger.warn(colors.yellow(`index.html file is not found in ${colors.dim('/src/renderer')} directory.`));
                throw new Error('build.rollupOptions.input option is required in the electron vite renderer config.');
            }
        }
    };
}

const nodeAssetRE = /__VITE_NODE_ASSET__([\w$]+)__/g;
const nodePublicAssetRE = /__VITE_NODE_PUBLIC_ASSET__([a-z\d]{8})__/g;
const assetImportRE = /(?:[?|&]asset(?:&|$)|\.wasm\?loader$|\.node$)/;
const assetRE = /[?|&]asset(?:&|$)/;
const assetUnpackRE = /[?|&]asset&asarUnpack$/;
const wasmHelperId = '\0__electron-vite-wasm-helper';
const wasmHelperCode = `
import { join } from 'path'
import { readFile } from 'fs/promises'

export default async function loadWasm(file, importObject = {}) {
  const wasmBuffer = await readFile(join(__dirname, file))
  const result = await WebAssembly.instantiate(wasmBuffer, importObject)
  return result.instance
}
`;
function assetPlugin() {
    let publicDir = '';
    const publicAssetPathCache = new Map();
    const assetCache = new Map();
    const isImportMetaPathSupported = supportImportMetaPaths();
    return {
        name: 'vite:node-asset',
        apply: 'build',
        enforce: 'pre',
        buildStart() {
            publicAssetPathCache.clear();
            assetCache.clear();
        },
        configResolved(config) {
            publicDir = config.publicDir;
        },
        resolveId(id) {
            if (id === wasmHelperId) {
                return id;
            }
        },
        async load(id) {
            if (id === wasmHelperId) {
                return wasmHelperCode;
            }
            if (id.startsWith('\0') || !assetImportRE.test(id)) {
                return;
            }
            let referenceId;
            const file = cleanUrl(id);
            if (publicDir && file.startsWith(publicDir)) {
                const hash = getHash(file);
                if (!publicAssetPathCache.get(hash)) {
                    publicAssetPathCache.set(hash, file);
                }
                referenceId = `__VITE_NODE_PUBLIC_ASSET__${hash}__`;
            }
            else {
                const cached = assetCache.get(file);
                if (cached) {
                    referenceId = cached;
                }
                else {
                    const source = await fs$1.readFile(file);
                    const hash = this.emitFile({
                        type: 'asset',
                        name: path.basename(file),
                        source: source
                    });
                    referenceId = `__VITE_NODE_ASSET__${hash}__`;
                    assetCache.set(file, referenceId);
                }
            }
            if (assetRE.test(id)) {
                const dirnameExpr = isImportMetaPathSupported ? 'import.meta.dirname' : '__dirname';
                if (assetUnpackRE.test(id)) {
                    return `
          import { join } from 'path'
          export default join(${dirnameExpr}, ${referenceId}).replace('app.asar', 'app.asar.unpacked')`;
                }
                else {
                    return `
          import { join } from 'path'
          export default join(${dirnameExpr}, ${referenceId})`;
                }
            }
            if (id.endsWith('.node')) {
                return `export default require(${referenceId})`;
            }
            if (id.endsWith('.wasm?loader')) {
                return `
        import loadWasm from ${JSON.stringify(wasmHelperId)}
        export default importObject => loadWasm(${referenceId}, importObject)`;
            }
        },
        renderChunk(code, chunk, { sourcemap, dir }) {
            let match;
            let s;
            nodeAssetRE.lastIndex = 0;
            while ((match = nodeAssetRE.exec(code))) {
                s ||= new MagicString(code);
                const [full, hash] = match;
                const filename = this.getFileName(hash);
                const outputFilepath = toRelativePath(filename, chunk.fileName);
                const replacement = JSON.stringify(outputFilepath);
                s.overwrite(match.index, match.index + full.length, replacement, {
                    contentOnly: true
                });
            }
            nodePublicAssetRE.lastIndex = 0;
            while ((match = nodePublicAssetRE.exec(code))) {
                s ||= new MagicString(code);
                const [full, hash] = match;
                const filename = publicAssetPathCache.get(hash);
                const outputFilepath = toRelativePath(filename, normalizePath(path.join(dir, chunk.fileName)));
                const replacement = JSON.stringify(outputFilepath);
                s.overwrite(match.index, match.index + full.length, replacement, {
                    contentOnly: true
                });
            }
            if (s) {
                return {
                    code: s.toString(),
                    map: sourcemap ? s.generateMap({ hires: 'boundary' }) : null
                };
            }
            return null;
        }
    };
}

const nodeWorkerAssetUrlRE = /__VITE_NODE_WORKER_ASSET__([\w$]+)__/g;
const nodeWorkerRE = /\?nodeWorker(?:&|$)/;
const nodeWorkerImporterRE = /(?:\?)nodeWorker&importer=([^&]+)(?:&|$)/;
/**
 * Resolve `?nodeWorker` import and automatically generate `Worker` wrapper.
 */
function workerPlugin() {
    return {
        name: 'vite:node-worker',
        apply: 'build',
        enforce: 'pre',
        resolveId(id, importer) {
            if (id.endsWith('?nodeWorker')) {
                return id + `&importer=${importer}`;
            }
        },
        load(id) {
            if (nodeWorkerRE.test(id)) {
                const match = nodeWorkerImporterRE.exec(id);
                if (match) {
                    const hash = this.emitFile({
                        type: 'chunk',
                        id: cleanUrl(id),
                        importer: match[1]
                    });
                    const assetRefId = `__VITE_NODE_WORKER_ASSET__${hash}__`;
                    return `
          import { Worker } from 'node:worker_threads';
          export default function (options) { return new Worker(new URL(${assetRefId}, import.meta.url), options); }`;
                }
            }
        },
        renderChunk(code, chunk, { sourcemap }) {
            let match;
            let s;
            nodeWorkerAssetUrlRE.lastIndex = 0;
            while ((match = nodeWorkerAssetUrlRE.exec(code))) {
                s ||= new MagicString(code);
                const [full, hash] = match;
                const filename = this.getFileName(hash);
                const outputFilepath = toRelativePath(filename, chunk.fileName);
                const replacement = JSON.stringify(outputFilepath);
                s.overwrite(match.index, match.index + full.length, replacement, {
                    contentOnly: true
                });
            }
            if (s) {
                return {
                    code: s.toString(),
                    map: sourcemap ? s.generateMap({ hires: 'boundary' }) : null
                };
            }
            return null;
        }
    };
}

function importMetaPlugin() {
    return {
        name: 'vite:import-meta',
        apply: 'build',
        enforce: 'pre',
        resolveImportMeta(property, { format }) {
            if (property === 'url' && format === 'cjs') {
                return `require("url").pathToFileURL(__filename).href`;
            }
            if (property === 'filename' && format === 'cjs') {
                return `__filename`;
            }
            if (property === 'dirname' && format === 'cjs') {
                return `__dirname`;
            }
            return null;
        }
    };
}

/*
 * The core of this plugin was conceived by pi0 and is taken from the following repository:
 * https://github.com/unjs/unbuild/blob/main/src/builder/plugins/cjs.ts
 * license: https://github.com/unjs/unbuild/blob/main/LICENSE
 */
const CJSyntaxRe = /__filename|__dirname|require\(|require\.resolve\(/;
const CJSShim_normal = `
// -- CommonJS Shims --
import __cjs_url__ from 'node:url';
import __cjs_path__ from 'node:path';
import __cjs_mod__ from 'node:module';
const __filename = __cjs_url__.fileURLToPath(import.meta.url);
const __dirname = __cjs_path__.dirname(__filename);
const require = __cjs_mod__.createRequire(import.meta.url);
`;
const CJSShim_node_20_11 = `
// -- CommonJS Shims --
import __cjs_mod__ from 'node:module';
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require = __cjs_mod__.createRequire(import.meta.url);
`;
const ESMStaticImportRe = /(?<=\s|^|;)import\s*([\s"']*(?<imports>[\p{L}\p{M}\w\t\n\r $*,/{}@.]+)from\s*)?["']\s*(?<specifier>(?<="\s*)[^"]*[^\s"](?=\s*")|(?<='\s*)[^']*[^\s'](?=\s*'))\s*["'][\s;]*/gmu;
function findStaticImports(code) {
    const matches = [];
    for (const match of code.matchAll(ESMStaticImportRe)) {
        matches.push({ end: (match.index || 0) + match[0].length });
    }
    return matches;
}
function esmShimPlugin() {
    const CJSShim = supportImportMetaPaths() ? CJSShim_node_20_11 : CJSShim_normal;
    return {
        name: 'vite:esm-shim',
        apply: 'build',
        enforce: 'post',
        renderChunk(code, _chunk, { format, sourcemap }) {
            if (format === 'es') {
                if (code.includes(CJSShim) || !CJSyntaxRe.test(code)) {
                    return null;
                }
                const lastESMImport = findStaticImports(code).pop();
                const indexToAppend = lastESMImport ? lastESMImport.end : 0;
                const s = new MagicString(code);
                s.appendRight(indexToAppend, CJSShim);
                return {
                    code: s.toString(),
                    map: sourcemap ? s.generateMap({ hires: 'boundary' }) : null
                };
            }
            return null;
        }
    };
}

function buildReporterPlugin() {
    const moduleIds = [];
    return {
        name: 'vite:build-reporter',
        buildEnd() {
            const allModuleIds = Array.from(this.getModuleIds());
            const sourceFiles = allModuleIds.filter(id => {
                if (id.includes('node_modules')) {
                    return false;
                }
                const info = this.getModuleInfo(id);
                return info && !info.isExternal;
            });
            moduleIds.push(...sourceFiles);
        },
        api: {
            getWatchFiles() {
                return moduleIds;
            }
        }
    };
}

const modulePathRE = /__VITE_MODULE_PATH__([\w$]+)__/g;
/**
 * Resolve `?modulePath` import and return the module bundle path.
 */
function modulePathPlugin(config) {
    const isImportMetaPathSupported = supportImportMetaPaths();
    const assetCache = new Set();
    return {
        name: 'vite:module-path',
        apply: 'build',
        enforce: 'pre',
        buildStart() {
            assetCache.clear();
        },
        async load(id) {
            if (id.endsWith('?modulePath')) {
                // id resolved by Vite resolve plugin
                const re = await bundleEntryFile$1(cleanUrl(id), config, this.meta.watchMode);
                const [outputChunk, ...outputChunks] = re.bundles.output;
                const hash = this.emitFile({
                    type: 'asset',
                    fileName: outputChunk.fileName,
                    source: outputChunk.code
                });
                for (const chunk of outputChunks) {
                    if (assetCache.has(chunk.fileName)) {
                        continue;
                    }
                    this.emitFile({
                        type: 'asset',
                        fileName: chunk.fileName,
                        source: chunk.type === 'chunk' ? chunk.code : chunk.source
                    });
                    assetCache.add(chunk.fileName);
                }
                for (const id of re.watchFiles) {
                    this.addWatchFile(id);
                }
                const refId = `__VITE_MODULE_PATH__${hash}__`;
                const dirnameExpr = isImportMetaPathSupported ? 'import.meta.dirname' : '__dirname';
                return `
          import { join } from 'path'
          export default join(${dirnameExpr}, ${refId})`;
            }
        },
        renderChunk(code, chunk, { sourcemap }) {
            let match;
            let s;
            modulePathRE.lastIndex = 0;
            while ((match = modulePathRE.exec(code))) {
                s ||= new MagicString(code);
                const [full, hash] = match;
                const filename = this.getFileName(hash);
                const outputFilepath = toRelativePath(filename, chunk.fileName);
                const replacement = JSON.stringify(outputFilepath);
                s.overwrite(match.index, match.index + full.length, replacement, {
                    contentOnly: true
                });
            }
            if (s) {
                return {
                    code: s.toString(),
                    map: sourcemap ? s.generateMap({ hires: 'boundary' }) : null
                };
            }
            return null;
        }
    };
}
async function bundleEntryFile$1(input, config, watch) {
    const reporter = watch ? buildReporterPlugin() : undefined;
    const viteConfig = mergeConfig(config, {
        build: {
            write: false,
            watch: false
        },
        plugins: [
            {
                name: 'vite:entry-file-name',
                outputOptions(output) {
                    if (typeof output.entryFileNames !== 'function' && output.entryFileNames) {
                        output.entryFileNames = '[name]-[hash]' + path.extname(output.entryFileNames);
                    }
                    return output;
                }
            },
            reporter
        ],
        logLevel: 'warn',
        configFile: false
    });
    // rewrite the input instead of merging
    const buildOptions = viteConfig.build;
    buildOptions.rollupOptions = {
        ...buildOptions.rollupOptions,
        input
    };
    const bundles = await build(viteConfig);
    return {
        bundles: bundles,
        watchFiles: reporter?.api?.getWatchFiles() || []
    };
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
const VIRTUAL_ENTRY_ID = '\0virtual:isolate-entries';
const LogLevels = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3
};
function isolateEntriesPlugin(userConfig) {
    let logger;
    let entries;
    let transformedCount = 0;
    const assetCache = new Set();
    return {
        name: 'vite:isolate-entries',
        apply: 'build',
        configResolved(config) {
            logger = config.logger;
        },
        options(opts) {
            const { input } = opts;
            if (input && typeof input === 'object') {
                if ((Array.isArray(input) && input.length > 0) || Object.keys(input).length > 1) {
                    opts.input = VIRTUAL_ENTRY_ID;
                    entries = Array.isArray(input) ? input : Object.entries(input).map(([key, value]) => ({ [key]: value }));
                    return opts;
                }
            }
        },
        buildStart() {
            transformedCount = 0;
            assetCache.clear();
        },
        resolveId(id) {
            if (id === VIRTUAL_ENTRY_ID) {
                return id;
            }
            return null;
        },
        async load(id) {
            if (id === VIRTUAL_ENTRY_ID) {
                const shouldLog = LogLevels[userConfig.logLevel || 'info'] >= LogLevels.info;
                const shouldWatch = this.meta.watchMode;
                const watchFiles = new Set();
                for (const entry of entries) {
                    const re = await bundleEntryFile(entry, userConfig, shouldWatch, shouldLog, transformedCount);
                    const outputChunks = re.bundles.output;
                    for (const chunk of outputChunks) {
                        if (assetCache.has(chunk.fileName)) {
                            continue;
                        }
                        this.emitFile({
                            type: 'asset',
                            fileName: chunk.fileName,
                            source: chunk.type === 'chunk' ? chunk.code : chunk.source
                        });
                        assetCache.add(chunk.fileName);
                    }
                    for (const id of re.watchFiles) {
                        watchFiles.add(id);
                    }
                    transformedCount += re.transformedCount;
                }
                for (const id of watchFiles) {
                    this.addWatchFile(id);
                }
                return `
        // This is the virtual entry file
        console.log(1)`;
            }
        },
        renderStart() {
            clearLine(-1);
            logger.info(`${colors.green(`✓`)} ${transformedCount} modules transformed.`);
        },
        generateBundle(_, bundle) {
            for (const chunkName in bundle) {
                if (chunkName.includes('virtual_isolate-entries')) {
                    delete bundle[chunkName];
                }
            }
        }
    };
}
async function bundleEntryFile(input, config, watch, shouldLog, preTransformedCount) {
    const transformReporter = transformReporterPlugin(preTransformedCount, shouldLog);
    const buildReporter = watch ? buildReporterPlugin() : undefined;
    const viteConfig = mergeConfig(config, {
        build: {
            write: false,
            watch: false
        },
        plugins: [transformReporter, buildReporter],
        logLevel: 'warn',
        configFile: false
    });
    // rewrite the input instead of merging
    viteConfig.build.rollupOptions.input = input;
    const bundles = await build(viteConfig);
    return {
        bundles: bundles,
        watchFiles: buildReporter?.api?.getWatchFiles() || [],
        transformedCount: transformReporter?.api?.getTransformedCount() || 0
    };
}
function transformReporterPlugin(preTransformedCount = 0, shouldLog = true) {
    let transformedCount = 0;
    let root;
    const log = throttle(id => {
        writeLine(`transforming (${preTransformedCount + transformedCount}) ${colors.dim(path.relative(root, id))}`);
    });
    return {
        name: 'vite:transform-reporter',
        configResolved(config) {
            root = config.root;
        },
        transform(_, id) {
            transformedCount++;
            if (!shouldLog)
                return;
            if (id.includes('?'))
                return;
            log(id);
        },
        api: {
            getTransformedCount() {
                return transformedCount;
            }
        }
    };
}
function writeLine(output) {
    clearLine();
    if (output.length < process.stdout.columns) {
        process.stdout.write(output);
    }
    else {
        process.stdout.write(output.substring(0, process.stdout.columns - 1));
    }
}
function clearLine(move = 0) {
    if (move < 0) {
        process.stdout.moveCursor(0, move);
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
}
function throttle(fn) {
    let timerHandle = null;
    return (...args) => {
        if (timerHandle)
            return;
        fn(...args);
        timerHandle = setTimeout(() => {
            timerHandle = null;
        }, 100);
    };
}

/**
 * Automatically externalize dependencies.
 *
 * @deprecated use `build.externalizeDeps` config option instead
 */
function externalizeDepsPlugin(options = {}) {
    const { exclude = [], include = [] } = options;
    const pkg = loadPackageData() || {};
    let deps = Object.keys(pkg.dependencies || {});
    if (include.length) {
        deps = deps.concat(include.filter(dep => dep.trim() !== ''));
    }
    if (exclude.length) {
        deps = deps.filter(dep => !exclude.includes(dep));
    }
    deps = [...new Set(deps)];
    return {
        name: 'vite:externalize-deps',
        enforce: 'pre',
        config(config) {
            const defaultConfig = {
                build: {
                    rollupOptions: {
                        external: deps.length > 0 ? [...deps, new RegExp(`^(${deps.join('|')})/.+`)] : []
                    }
                }
            };
            const buildConfig = mergeConfig(defaultConfig.build, config.build || {});
            config.build = buildConfig;
        }
    };
}

// Inspired by https://github.com/bytenode/bytenode
const _require$1 = createRequire(import.meta.url);
function getBytecodeCompilerPath() {
    return path.join(path.dirname(_require$1.resolve('electron-vite/package.json')), 'bin', 'electron-bytecode.cjs');
}
function compileToBytecode(code) {
    return new Promise((resolve, reject) => {
        let data = Buffer.from([]);
        const electronPath = getElectronPath();
        const bytecodePath = getBytecodeCompilerPath();
        const proc = spawn(electronPath, [bytecodePath], {
            env: { ELECTRON_RUN_AS_NODE: '1' },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        if (proc.stdin) {
            proc.stdin.write(code);
            proc.stdin.end();
        }
        if (proc.stdout) {
            proc.stdout.on('data', chunk => {
                data = Buffer.concat([data, chunk]);
            });
            proc.stdout.on('error', err => {
                console.error(err);
            });
            proc.stdout.on('end', () => {
                resolve(data);
            });
        }
        if (proc.stderr) {
            proc.stderr.on('data', chunk => {
                console.error('Error: ', chunk.toString());
            });
            proc.stderr.on('error', err => {
                console.error('Error: ', err);
            });
        }
        proc.addListener('message', message => console.log(message));
        proc.addListener('error', err => console.error(err));
        proc.on('error', err => reject(err));
        proc.on('exit', () => {
            resolve(data);
        });
    });
}
const bytecodeModuleLoaderCode = [
    `"use strict";`,
    `const fs = require("fs");`,
    `const path = require("path");`,
    `const vm = require("vm");`,
    `const v8 = require("v8");`,
    `const Module = require("module");`,
    `v8.setFlagsFromString("--no-lazy");`,
    `v8.setFlagsFromString("--no-flush-bytecode");`,
    `const FLAG_HASH_OFFSET = 12;`,
    `const SOURCE_HASH_OFFSET = 8;`,
    `let dummyBytecode;`,
    `function setFlagHashHeader(bytecodeBuffer) {`,
    `  if (!dummyBytecode) {`,
    `    const script = new vm.Script("", {`,
    `      produceCachedData: true`,
    `    });`,
    `    dummyBytecode = script.createCachedData();`,
    `  }`,
    `  dummyBytecode.slice(FLAG_HASH_OFFSET, FLAG_HASH_OFFSET + 4).copy(bytecodeBuffer, FLAG_HASH_OFFSET);`,
    `};`,
    `function getSourceHashHeader(bytecodeBuffer) {`,
    `  return bytecodeBuffer.slice(SOURCE_HASH_OFFSET, SOURCE_HASH_OFFSET + 4);`,
    `};`,
    `function buffer2Number(buffer) {`,
    `  let ret = 0;`,
    `  ret |= buffer[3] << 24;`,
    `  ret |= buffer[2] << 16;`,
    `  ret |= buffer[1] << 8;`,
    `  ret |= buffer[0];`,
    `  return ret;`,
    `};`,
    `Module._extensions[".jsc"] = Module._extensions[".cjsc"] = function (module, filename) {`,
    `  const bytecodeBuffer = fs.readFileSync(filename);`,
    `  if (!Buffer.isBuffer(bytecodeBuffer)) {`,
    `    throw new Error("BytecodeBuffer must be a buffer object.");`,
    `  }`,
    `  setFlagHashHeader(bytecodeBuffer);`,
    `  const length = buffer2Number(getSourceHashHeader(bytecodeBuffer));`,
    `  let dummyCode = "";`,
    `  if (length > 1) {`,
    `    dummyCode = "\\"" + "\\u200b".repeat(length - 2) + "\\"";`,
    `  }`,
    `  const script = new vm.Script(dummyCode, {`,
    `    filename: filename,`,
    `    lineOffset: 0,`,
    `    displayErrors: true,`,
    `    cachedData: bytecodeBuffer`,
    `  });`,
    `  if (script.cachedDataRejected) {`,
    `    throw new Error("Invalid or incompatible cached data (cachedDataRejected)");`,
    `  }`,
    `  const require = function (id) {`,
    `    return module.require(id);`,
    `  };`,
    `  require.resolve = function (request, options) {`,
    `    return Module._resolveFilename(request, module, false, options);`,
    `  };`,
    `  if (process.mainModule) {`,
    `    require.main = process.mainModule;`,
    `  }`,
    `  require.extensions = Module._extensions;`,
    `  require.cache = Module._cache;`,
    `  const compiledWrapper = script.runInThisContext({`,
    `    filename: filename,`,
    `    lineOffset: 0,`,
    `    columnOffset: 0,`,
    `    displayErrors: true`,
    `  });`,
    `  const dirname = path.dirname(filename);`,
    `  const args = [module.exports, require, module, filename, dirname, process, global];`,
    `  return compiledWrapper.apply(module.exports, args);`,
    `};`
];
const bytecodeChunkExtensionRE = /.(jsc|cjsc)$/;
/**
 * Compile source code to v8 bytecode.
 *
 * @deprecated use `build.bytecode` config option instead
 */
function bytecodePlugin(options = {}) {
    if (process.env.NODE_ENV_ELECTRON_VITE !== 'production') {
        return null;
    }
    const { chunkAlias = [], transformArrowFunctions = true, removeBundleJS = true, protectedStrings = [] } = options;
    const _chunkAlias = Array.isArray(chunkAlias) ? chunkAlias : [chunkAlias];
    const transformAllChunks = _chunkAlias.length === 0;
    const isBytecodeChunk = (chunkName) => {
        return transformAllChunks || _chunkAlias.some(alias => alias === chunkName);
    };
    const plugins = [];
    if (transformArrowFunctions) {
        plugins.push('@babel/plugin-transform-arrow-functions');
    }
    if (protectedStrings.length > 0) {
        plugins.push([protectStringsPlugin, { protectedStrings: new Set(protectedStrings) }]);
    }
    const shouldTransformBytecodeChunk = plugins.length !== 0;
    const _transform = (code, sourceMaps = false) => {
        const re = babel.transform(code, { plugins, sourceMaps });
        return re ? { code: re.code || '', map: re.map } : null;
    };
    const useStrict = '"use strict";';
    const bytecodeModuleLoader = 'bytecode-loader.cjs';
    let logger;
    let supported = false;
    return {
        name: 'vite:bytecode',
        apply: 'build',
        enforce: 'post',
        configResolved(config) {
            if (supported) {
                return;
            }
            logger = config.logger;
            const useInRenderer = config.plugins.some(p => p.name === 'vite:electron-renderer-preset-config');
            if (useInRenderer) {
                config.logger.warn(colors.yellow('bytecodePlugin does not support renderer.'));
                return;
            }
            const build = config.build;
            const resolvedOutputs = resolveBuildOutputs(build.rollupOptions.output, build.lib);
            if (resolvedOutputs) {
                const outputs = Array.isArray(resolvedOutputs) ? resolvedOutputs : [resolvedOutputs];
                const output = outputs[0];
                if (output.format === 'es') {
                    config.logger.warn(colors.yellow('bytecodePlugin does not support ES module, please remove "type": "module" ' +
                        'in package.json or set the "build.rollupOptions.output.format" option to "cjs".'));
                }
                supported = output.format === 'cjs' && !useInRenderer;
            }
        },
        renderChunk(code, chunk, { sourcemap }) {
            if (supported && isBytecodeChunk(chunk.name) && shouldTransformBytecodeChunk) {
                return _transform(code, !!sourcemap);
            }
            return null;
        },
        async generateBundle(_, output) {
            if (!supported) {
                return;
            }
            const _chunks = Object.values(output);
            const chunks = _chunks.filter(chunk => chunk.type === 'chunk' && isBytecodeChunk(chunk.name));
            if (chunks.length === 0) {
                return;
            }
            const bytecodeChunks = chunks.map(chunk => chunk.fileName);
            const nonEntryChunks = chunks.filter(chunk => !chunk.isEntry).map(chunk => path.basename(chunk.fileName));
            const pattern = nonEntryChunks.map(chunk => `(${chunk})`).join('|');
            const bytecodeRE = pattern ? new RegExp(`require\\(\\S*(?=(${pattern})\\S*\\))`, 'g') : null;
            const getBytecodeLoaderBlock = (chunkFileName) => {
                return `require("${toRelativePath(bytecodeModuleLoader, normalizePath(chunkFileName))}");`;
            };
            let bytecodeChunkCount = 0;
            const bundles = Object.keys(output);
            await Promise.all(bundles.map(async (name) => {
                const chunk = output[name];
                if (chunk.type === 'chunk') {
                    let _code = chunk.code;
                    if (bytecodeRE) {
                        let match;
                        let s;
                        while ((match = bytecodeRE.exec(_code))) {
                            s ||= new MagicString(_code);
                            const [prefix, chunkName] = match;
                            const len = prefix.length + chunkName.length;
                            s.overwrite(match.index, match.index + len, prefix + chunkName + 'c', {
                                contentOnly: true
                            });
                        }
                        if (s) {
                            _code = s.toString();
                        }
                    }
                    if (bytecodeChunks.includes(name)) {
                        const bytecodeBuffer = await compileToBytecode(_code);
                        this.emitFile({
                            type: 'asset',
                            fileName: name + 'c',
                            source: bytecodeBuffer
                        });
                        if (!removeBundleJS) {
                            this.emitFile({
                                type: 'asset',
                                fileName: '_' + chunk.fileName,
                                source: chunk.code
                            });
                        }
                        if (chunk.isEntry) {
                            const bytecodeLoaderBlock = getBytecodeLoaderBlock(chunk.fileName);
                            const bytecodeModuleBlock = `require("./${path.basename(name) + 'c'}");`;
                            const code = `${useStrict}\n${bytecodeLoaderBlock}\n${bytecodeModuleBlock}\n`;
                            chunk.code = code;
                        }
                        else {
                            delete output[chunk.fileName];
                        }
                        bytecodeChunkCount += 1;
                    }
                    else {
                        if (chunk.isEntry) {
                            let hasBytecodeMoudle = false;
                            const idsToHandle = new Set([...chunk.imports, ...chunk.dynamicImports]);
                            for (const moduleId of idsToHandle) {
                                if (bytecodeChunks.includes(moduleId)) {
                                    hasBytecodeMoudle = true;
                                    break;
                                }
                                const moduleInfo = this.getModuleInfo(moduleId);
                                if (moduleInfo && !moduleInfo.isExternal) {
                                    const { importers, dynamicImporters } = moduleInfo;
                                    for (const importerId of importers)
                                        idsToHandle.add(importerId);
                                    for (const importerId of dynamicImporters)
                                        idsToHandle.add(importerId);
                                }
                            }
                            _code = hasBytecodeMoudle
                                ? _code.replace(/("use strict";)|('use strict';)/, `${useStrict}\n${getBytecodeLoaderBlock(chunk.fileName)}`)
                                : _code;
                        }
                        chunk.code = _code;
                    }
                }
            }));
            if (bytecodeChunkCount && !_chunks.some(ass => ass.type === 'asset' && ass.fileName === bytecodeModuleLoader)) {
                this.emitFile({
                    type: 'asset',
                    source: bytecodeModuleLoaderCode.join('\n') + '\n',
                    name: 'Bytecode Loader File',
                    fileName: bytecodeModuleLoader
                });
            }
        },
        writeBundle(_, output) {
            if (supported) {
                const bytecodeChunkCount = Object.keys(output).filter(chunk => bytecodeChunkExtensionRE.test(chunk)).length;
                logger.info(`${colors.green(`✓`)} ${bytecodeChunkCount} chunks compiled into bytecode.`);
            }
        }
    };
}
function resolveBuildOutputs(outputs, libOptions) {
    if (libOptions && !Array.isArray(outputs)) {
        const libFormats = libOptions.formats || [];
        return libFormats.map(format => ({ ...outputs, format }));
    }
    return outputs;
}
function protectStringsPlugin(api) {
    const { types: t } = api;
    function createFromCharCodeFunction(value) {
        const charCodes = Array.from(value).map(s => s.charCodeAt(0));
        const charCodeLiterals = charCodes.map(code => t.numericLiteral(code));
        // String.fromCharCode
        const memberExpression = t.memberExpression(t.identifier('String'), t.identifier('fromCharCode'));
        // String.fromCharCode(...arr)
        const callExpression = t.callExpression(memberExpression, [t.spreadElement(t.identifier('arr'))]);
        // return String.fromCharCode(...arr)
        const returnStatement = t.returnStatement(callExpression);
        // function (arr) { return ... }
        const functionExpression = t.functionExpression(null, [t.identifier('arr')], t.blockStatement([returnStatement]));
        // (function(...) { ... })([x, x, x])
        return t.callExpression(functionExpression, [t.arrayExpression(charCodeLiterals)]);
    }
    return {
        name: 'protect-strings-plugin',
        visitor: {
            StringLiteral(path, state) {
                // obj['property']
                if (path.parentPath.isMemberExpression({ property: path.node, computed: true })) {
                    return;
                }
                // { 'key': value }
                if (path.parentPath.isObjectProperty({ key: path.node, computed: false })) {
                    return;
                }
                // require('fs')
                if (path.parentPath.isCallExpression() &&
                    t.isIdentifier(path.parentPath.node.callee) &&
                    path.parentPath.node.callee.name === 'require' &&
                    path.parentPath.node.arguments[0] === path.node) {
                    return;
                }
                // Only CommonJS is supported, import declaration and export declaration checks are ignored
                const { value } = path.node;
                if (state.opts.protectedStrings.has(value)) {
                    path.replaceWith(createFromCharCodeFunction(value));
                }
            },
            TemplateLiteral(path, state) {
                // Must be a pure static template literal
                // expressions must be empty (no ${variables})
                // quasis must have only one element (meaning the entire string is a single static part).
                if (path.node.expressions.length > 0 || path.node.quasis.length !== 1) {
                    return;
                }
                // Extract the raw value of the template literal
                // path.node.quasis[0].value.raw is used to get the raw string, including escape sequences
                // path.node.quasis[0].value.cooked is used to get the processed/cooked string (with escape sequences handled)
                const value = path.node.quasis[0].value.cooked;
                if (value && state.opts.protectedStrings.has(value)) {
                    path.replaceWith(createFromCharCodeFunction(value));
                }
            }
        }
    };
}

function defineConfig(config) {
    return config;
}
async function resolveConfig(inlineConfig, command, defaultMode = 'development') {
    const config = inlineConfig;
    const mode = inlineConfig.mode || defaultMode;
    process.env.NODE_ENV = defaultMode;
    let userConfig;
    let configFileDependencies = [];
    let { configFile } = config;
    if (configFile !== false) {
        const configEnv = {
            mode,
            command
        };
        const loadResult = await loadConfigFromFile(configEnv, configFile, config.root, config.logLevel, config.ignoreConfigWarning);
        if (loadResult) {
            const root = config.root;
            delete config.root;
            delete config.configFile;
            config.configFile = false;
            const outDir = config.build?.outDir;
            if (loadResult.config.main) {
                const mainViteConfig = mergeConfig(loadResult.config.main, deepClone(config));
                mainViteConfig.mode = inlineConfig.mode || mainViteConfig.mode || defaultMode;
                if (outDir) {
                    resetOutDir(mainViteConfig, outDir, 'main');
                }
                const configDrivenPlugins = await resolveConfigDrivenPlugins(mainViteConfig);
                const builtInMainPlugins = [
                    electronMainConfigPresetPlugin({ root }),
                    electronMainConfigValidatorPlugin(),
                    assetPlugin(),
                    workerPlugin(),
                    modulePathPlugin(mergeConfig({
                        plugins: [
                            electronMainConfigPresetPlugin({ root }),
                            assetPlugin(),
                            importMetaPlugin(),
                            esmShimPlugin(),
                            ...configDrivenPlugins
                        ]
                    }, mainViteConfig)),
                    importMetaPlugin(),
                    esmShimPlugin(),
                    ...configDrivenPlugins
                ];
                mainViteConfig.plugins = builtInMainPlugins.concat(mainViteConfig.plugins || []);
                loadResult.config.main = mainViteConfig;
            }
            if (loadResult.config.preload) {
                const preloadViteConfig = mergeConfig(loadResult.config.preload, deepClone(config));
                preloadViteConfig.mode = inlineConfig.mode || preloadViteConfig.mode || defaultMode;
                if (outDir) {
                    resetOutDir(preloadViteConfig, outDir, 'preload');
                }
                const configDrivenPlugins = await resolveConfigDrivenPlugins(preloadViteConfig);
                const builtInPreloadPlugins = [
                    electronPreloadConfigPresetPlugin({ root }),
                    electronPreloadConfigValidatorPlugin(),
                    assetPlugin(),
                    importMetaPlugin(),
                    esmShimPlugin(),
                    ...configDrivenPlugins
                ];
                if (preloadViteConfig.build?.isolatedEntries) {
                    builtInPreloadPlugins.push(isolateEntriesPlugin(mergeConfig({
                        plugins: [
                            electronPreloadConfigPresetPlugin({ root }),
                            assetPlugin(),
                            importMetaPlugin(),
                            esmShimPlugin(),
                            ...configDrivenPlugins
                        ]
                    }, preloadViteConfig)));
                }
                preloadViteConfig.plugins = builtInPreloadPlugins.concat(preloadViteConfig.plugins);
                loadResult.config.preload = preloadViteConfig;
            }
            if (loadResult.config.renderer) {
                const rendererViteConfig = mergeConfig(loadResult.config.renderer, deepClone(config));
                rendererViteConfig.mode = inlineConfig.mode || rendererViteConfig.mode || defaultMode;
                if (outDir) {
                    resetOutDir(rendererViteConfig, outDir, 'renderer');
                }
                const builtInRendererPlugins = [
                    electronRendererConfigPresetPlugin({ root }),
                    electronRendererConfigValidatorPlugin()
                ];
                if (rendererViteConfig.build?.isolatedEntries) {
                    builtInRendererPlugins.push(isolateEntriesPlugin(mergeConfig({
                        plugins: [electronRendererConfigPresetPlugin({ root })]
                    }, rendererViteConfig)));
                }
                rendererViteConfig.plugins = builtInRendererPlugins.concat(rendererViteConfig.plugins || []);
                loadResult.config.renderer = rendererViteConfig;
            }
            userConfig = loadResult.config;
            configFile = loadResult.path;
            configFileDependencies = loadResult.dependencies;
        }
    }
    const resolved = {
        config: userConfig,
        configFile: configFile ? normalizePath(configFile) : undefined,
        configFileDependencies
    };
    return resolved;
}
function resetOutDir(config, outDir, subOutDir) {
    let userOutDir = config.build?.outDir;
    if (outDir === userOutDir) {
        userOutDir = path.resolve(config.root || process.cwd(), outDir, subOutDir);
        if (config.build) {
            config.build.outDir = userOutDir;
        }
        else {
            config.build = { outDir: userOutDir };
        }
    }
}
async function resolveConfigDrivenPlugins(config) {
    const userPlugins = (await asyncFlatten(config.plugins || [])).filter(Boolean);
    const configDrivenPlugins = [];
    const hasExternalizeDepsPlugin = userPlugins.some(p => p.name === 'vite:externalize-deps');
    if (!hasExternalizeDepsPlugin) {
        const externalOptions = config.build?.externalizeDeps ?? true;
        if (externalOptions) {
            isOptions(externalOptions)
                ? configDrivenPlugins.push(externalizeDepsPlugin(externalOptions))
                : configDrivenPlugins.push(externalizeDepsPlugin());
        }
    }
    const hasBytecodePlugin = userPlugins.some(p => p.name === 'vite:bytecode');
    if (!hasBytecodePlugin) {
        const bytecodeOptions = config.build?.bytecode;
        if (bytecodeOptions) {
            isOptions(bytecodeOptions)
                ? configDrivenPlugins.push(bytecodePlugin(bytecodeOptions))
                : configDrivenPlugins.push(bytecodePlugin());
        }
    }
    return configDrivenPlugins;
}
function isOptions(value) {
    return typeof value === 'object' && value !== null;
}
const CONFIG_FILE_NAME = 'electron.vite.config';
async function loadConfigFromFile(configEnv, configFile, configRoot = process.cwd(), logLevel, ignoreConfigWarning = false) {
    if (configFile && /^vite.config.(js|ts|mjs|cjs|mts|cts)$/.test(configFile)) {
        throw new Error(`config file cannot be named ${configFile}.`);
    }
    const resolvedPath = configFile
        ? path.resolve(configFile)
        : findConfigFile(configRoot, ['js', 'ts', 'mjs', 'cjs', 'mts', 'cts']);
    if (!resolvedPath) {
        return {
            path: '',
            config: { main: {}, preload: {}, renderer: {} },
            dependencies: []
        };
    }
    const isESM = isFilePathESM(resolvedPath);
    try {
        const { code, dependencies } = await bundleConfigFile(resolvedPath, isESM);
        const configExport = await loadConfigFormBundledFile(configRoot, resolvedPath, code, isESM);
        const config = await (typeof configExport === 'function' ? configExport(configEnv) : configExport);
        if (!isObject(config)) {
            throw new Error(`config must export or return an object`);
        }
        if (!ignoreConfigWarning) {
            const missingFields = ['main', 'renderer', 'preload'].filter(field => !config[field]);
            if (missingFields.length > 0) {
                createLogger(logLevel).warn(`${colors.yellow(colors.bold('(!)'))} ${colors.yellow(`${missingFields.join(' and ')} config is missing`)}\n`);
            }
        }
        return {
            path: normalizePath(resolvedPath),
            config,
            dependencies
        };
    }
    catch (e) {
        createLogger(logLevel).error(colors.red(`failed to load config from ${resolvedPath}`), { error: e });
        throw e;
    }
}
function findConfigFile(configRoot, extensions) {
    for (const ext of extensions) {
        const configFile = path.resolve(configRoot, `${CONFIG_FILE_NAME}.${ext}`);
        if (fs.existsSync(configFile)) {
            return configFile;
        }
    }
    return '';
}
async function bundleConfigFile(fileName, isESM) {
    const dirnameVarName = '__electron_vite_injected_dirname';
    const filenameVarName = '__electron_vite_injected_filename';
    const importMetaUrlVarName = '__electron_vite_injected_import_meta_url';
    const result = await build$1({
        absWorkingDir: process.cwd(),
        entryPoints: [fileName],
        write: false,
        target: ['node20'],
        platform: 'node',
        bundle: true,
        format: isESM ? 'esm' : 'cjs',
        sourcemap: false,
        metafile: true,
        define: {
            __dirname: dirnameVarName,
            __filename: filenameVarName,
            'import.meta.url': importMetaUrlVarName
        },
        plugins: [
            {
                name: 'externalize-deps',
                setup(build) {
                    build.onResolve({ filter: /.*/ }, args => {
                        const id = args.path;
                        if (id[0] !== '.' && !path.isAbsolute(id)) {
                            return {
                                external: true
                            };
                        }
                        return null;
                    });
                }
            },
            {
                name: 'replace-import-meta',
                setup(build) {
                    build.onLoad({ filter: /\.[cm]?[jt]s$/ }, async (args) => {
                        const contents = await fs.promises.readFile(args.path, 'utf8');
                        const injectValues = `const ${dirnameVarName} = ${JSON.stringify(path.dirname(args.path))};` +
                            `const ${filenameVarName} = ${JSON.stringify(args.path)};` +
                            `const ${importMetaUrlVarName} = ${JSON.stringify(pathToFileURL(args.path).href)};`;
                        return {
                            loader: args.path.endsWith('ts') ? 'ts' : 'js',
                            contents: injectValues + contents
                        };
                    });
                }
            }
        ]
    });
    const { text } = result.outputFiles[0];
    return {
        code: text,
        dependencies: result.metafile ? Object.keys(result.metafile.inputs) : []
    };
}
const _require = createRequire(import.meta.url);
async function loadConfigFormBundledFile(configRoot, configFile, bundledCode, isESM) {
    if (isESM) {
        const fileNameTmp = path.resolve(configRoot, `${CONFIG_FILE_NAME}.${Date.now()}.mjs`);
        fs.writeFileSync(fileNameTmp, bundledCode);
        const fileUrl = pathToFileURL(fileNameTmp);
        try {
            return (await import(fileUrl.href)).default;
        }
        finally {
            try {
                fs.unlinkSync(fileNameTmp);
            }
            catch { }
        }
    }
    else {
        const extension = path.extname(configFile);
        const realFileName = fs.realpathSync(configFile);
        const loaderExt = extension in _require.extensions ? extension : '.js';
        const defaultLoader = _require.extensions[loaderExt];
        _require.extensions[loaderExt] = (module, filename) => {
            if (filename === realFileName) {
                module._compile(bundledCode, filename);
            }
            else {
                defaultLoader(module, filename);
            }
        };
        delete _require.cache[_require.resolve(configFile)];
        const raw = _require(configFile);
        _require.extensions[loaderExt] = defaultLoader;
        return raw.__esModule ? raw.default : raw;
    }
}

export { loadConfigFromFile as a, bytecodePlugin as b, resolveHostname as c, defineConfig as d, externalizeDepsPlugin as e, loadEnv as l, resolveConfig as r, startElectron as s };

import debug from 'debug';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { getAbi } from 'node-abi';
import os from 'node:os';
import path from 'node:path';
import { generateCacheKey, lookupModuleState } from './cache.js';
import { BuildType } from './types.js';
import { ModuleRebuilder } from './module-rebuilder.js';
import { ModuleWalker } from './module-walker.js';
const d = debug('electron-rebuild');
const defaultMode = 'sequential';
const defaultTypes = ['prod', 'optional'];
export class Rebuilder {
    ABIVersion;
    moduleWalker;
    rebuilds;
    lifecycle;
    buildPath;
    electronVersion;
    platform;
    arch;
    force;
    headerURL;
    mode;
    debug;
    useCache;
    cachePath;
    prebuildTagPrefix;
    msvsVersion;
    useElectronClang;
    disablePreGypCopy;
    buildFromSource;
    ignoreModules;
    jobs;
    constructor(options) {
        this.lifecycle = options.lifecycle;
        this.buildPath = options.buildPath;
        this.electronVersion = options.electronVersion;
        this.platform = options.platform || process.platform;
        this.arch = options.arch || process.arch;
        this.force = options.force || false;
        this.headerURL = options.headerURL || 'https://www.electronjs.org/headers';
        this.mode = options.mode || defaultMode;
        this.debug = options.debug || false;
        this.useCache = options.useCache || false;
        this.useElectronClang = options.useElectronClang || false;
        this.cachePath = options.cachePath || path.resolve(os.homedir(), '.electron-rebuild-cache');
        this.prebuildTagPrefix = options.prebuildTagPrefix ?? 'v';
        this.msvsVersion = process.env.GYP_MSVS_VERSION;
        this.disablePreGypCopy = options.disablePreGypCopy || false;
        this.buildFromSource = options.buildFromSource || false;
        this.ignoreModules = options.ignoreModules || [];
        this.jobs = options.jobs;
        d('ignoreModules', this.ignoreModules);
        if (this.useCache && this.force) {
            console.warn('[WARNING]: Electron Rebuild has force enabled and cache enabled, force take precedence and the cache will not be used.');
            this.useCache = false;
        }
        // FIXME: this entire guard is unreachable according to the types
        /* oxlint-disable typescript-eslint(restrict-template-expressions) */
        if (typeof this.electronVersion === 'number') {
            if (`${this.electronVersion}`.split('.').length === 1) {
                this.electronVersion = `${this.electronVersion}.0.0`;
            }
            else {
                this.electronVersion = `${this.electronVersion}.0`;
            }
        }
        /* oxlint-enable typescript-eslint(restrict-template-expressions) */
        if (typeof this.electronVersion !== 'string') {
            throw new Error(`Expected a string version for electron version, got a "${typeof this.electronVersion}"`);
        }
        this.ABIVersion = options.forceABI?.toString();
        const onlyModules = options.onlyModules || null;
        const extraModules = new Set(options.extraModules);
        const types = options.types || defaultTypes;
        this.moduleWalker = new ModuleWalker(this.buildPath, options.projectRootPath, types, extraModules, onlyModules);
        this.rebuilds = [];
        d('rebuilding with args:', this.buildPath, this.electronVersion, this.platform, this.arch, extraModules, this.force, this.headerURL, types, this.debug);
    }
    get ABI() {
        if (this.ABIVersion === undefined) {
            this.ABIVersion = getAbi(this.electronVersion, 'electron');
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.ABIVersion;
    }
    get buildType() {
        return this.debug ? BuildType.Debug : BuildType.Release;
    }
    async rebuild() {
        if (!path.isAbsolute(this.buildPath)) {
            throw new Error('Expected buildPath to be an absolute path');
        }
        this.lifecycle.emit('start');
        const candidatePaths = [...(await this.modulesToRebuild()), this.buildPath];
        const nativeModulePaths = candidatePaths.filter((p) => fs.existsSync(path.resolve(p, 'binding.gyp')));
        this.lifecycle.emit('modules-found', nativeModulePaths.map((p) => {
            const name = path.basename(p);
            const parent = path.basename(path.dirname(p));
            return parent !== 'node_modules' ? `${parent}/${name}` : name;
        }));
        for (const modulePath of nativeModulePaths) {
            this.rebuilds.push(() => this.rebuildModuleAt(modulePath));
        }
        if (this.mode !== 'sequential') {
            await Promise.all(this.rebuilds.map((fn) => fn()));
        }
        else {
            for (const rebuildFn of this.rebuilds) {
                await rebuildFn();
            }
        }
    }
    async modulesToRebuild() {
        await this.moduleWalker.walkModules();
        for (const nodeModulesPath of await this.moduleWalker.nodeModulesPaths) {
            await this.moduleWalker.findAllModulesIn(nodeModulesPath);
        }
        return this.moduleWalker.modulesToRebuild;
    }
    async rebuildModuleAt(modulePath) {
        const moduleRebuilder = new ModuleRebuilder(this, modulePath);
        let moduleName = path.basename(modulePath);
        const parentName = path.basename(path.dirname(modulePath));
        if (parentName !== 'node_modules') {
            moduleName = `${parentName}/${moduleName}`;
        }
        this.lifecycle.emit('module-found', moduleName);
        if (!this.force && (await moduleRebuilder.alreadyBuiltByRebuild())) {
            d(`skipping: ${moduleName} as it is already built`);
            this.lifecycle.emit('module-done', moduleName);
            this.lifecycle.emit('module-skip', moduleName);
            return;
        }
        d('checking', moduleName, 'against', this.ignoreModules);
        if (this.ignoreModules.includes(moduleName)) {
            d(`skipping: ${moduleName} as it is in the ignoreModules array`);
            this.lifecycle.emit('module-done', moduleName);
            this.lifecycle.emit('module-skip', moduleName);
            return;
        }
        if (await moduleRebuilder.prebuildInstallNativeModuleExists()) {
            d(`skipping: ${moduleName} as it was prebuilt`);
            return;
        }
        let cacheKey;
        if (this.useCache) {
            cacheKey = await generateCacheKey({
                ABI: this.ABI,
                arch: this.arch,
                platform: this.platform,
                debug: this.debug,
                electronVersion: this.electronVersion,
                headerURL: this.headerURL,
                modulePath,
            });
            const applyDiffFn = await lookupModuleState(this.cachePath, cacheKey);
            if (typeof applyDiffFn === 'function') {
                await applyDiffFn(modulePath);
                this.lifecycle.emit('module-done', moduleName);
                return;
            }
        }
        if (await moduleRebuilder.rebuild(cacheKey)) {
            this.lifecycle.emit('module-done', moduleName);
        }
    }
}
export function rebuild(options) {
    // eslint-disable-next-line prefer-rest-params
    d('rebuilding with args:', arguments);
    const lifecycle = new EventEmitter();
    const rebuilderOptions = { ...options, lifecycle };
    const rebuilder = new Rebuilder(rebuilderOptions);
    const ret = rebuilder.rebuild();
    ret.lifecycle = lifecycle;
    return ret;
}
//# sourceMappingURL=rebuild.js.map
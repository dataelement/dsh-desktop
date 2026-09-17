import debug from 'debug';
import fs from 'node:fs';
import path from 'node:path';
import { getNodeArch } from '../arch.js';
import { NativeModule } from './index.js';
const d = debug('electron-rebuild');
export function determineNativePrebuildArch(arch) {
    if (arch === 'armv7l') {
        return 'arm';
    }
    return arch;
}
/**
 * The extension of `prebuildify`-generated native modules, after the last `.`. This value differs
 * based on whether the target arch is ARM-based.
 */
export function determineNativePrebuildExtension(arch) {
    switch (arch) {
        case 'arm64':
            return 'armv8.node';
        case 'armv7l':
            return 'armv7.node';
    }
    return 'node';
}
export class Prebuildify extends NativeModule {
    async usesTool() {
        const packageName = await this.findPackageInDependencies('prebuildify', 'devDependencies');
        return !!packageName;
    }
    async findPrebuiltModule() {
        d(`Checking for prebuilds for "${this.moduleName}"`);
        const prebuildsDir = path.join(this.modulePath, 'prebuilds');
        if (!fs.existsSync(prebuildsDir)) {
            d(`Could not find the prebuilds directory at "${prebuildsDir}"`);
            return false;
        }
        const nodeArch = getNodeArch(this.rebuilder.arch, process.config.variables);
        const prebuiltModuleDir = path.join(prebuildsDir, `${this.rebuilder.platform}-${determineNativePrebuildArch(nodeArch)}`);
        const nativeExt = determineNativePrebuildExtension(nodeArch);
        const electronNapiModuleFilename = path.join(prebuiltModuleDir, `electron.napi.${nativeExt}`);
        const nodejsNapiModuleFilename = path.join(prebuiltModuleDir, `node.napi.${nativeExt}`);
        const abiModuleFilename = path.join(prebuiltModuleDir, `electron.abi${this.rebuilder.ABI}.${nativeExt}`);
        if (fs.existsSync(electronNapiModuleFilename) || fs.existsSync(nodejsNapiModuleFilename)) {
            this.nodeAPI.ensureElectronSupport();
            d(`Found prebuilt Node-API module in ${prebuiltModuleDir}"`);
        }
        else if (fs.existsSync(abiModuleFilename)) {
            d(`Found prebuilt module: "${abiModuleFilename}"`);
        }
        else {
            d(`Could not locate "${electronNapiModuleFilename}", "${nodejsNapiModuleFilename}", or "${abiModuleFilename}"`);
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=prebuildify.js.map
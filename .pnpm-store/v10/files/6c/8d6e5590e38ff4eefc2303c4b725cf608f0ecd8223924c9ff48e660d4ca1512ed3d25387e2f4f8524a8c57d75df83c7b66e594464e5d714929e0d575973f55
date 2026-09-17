import debug from 'debug';
import fs from 'node:fs';
import path from 'node:path';
import { locateBinary, NativeModule } from './index.js';
import { spawn } from '@malept/cross-spawn-promise';
const d = debug('electron-rebuild');
export class PrebuildInstall extends NativeModule {
    async usesTool() {
        const packageName = await this.findPackageInDependencies('prebuild-install');
        return !!packageName;
    }
    async locateBinary() {
        const packageName = await this.findPackageInDependencies('prebuild-install');
        if (!packageName)
            return null;
        return locateBinary(this.modulePath, `node_modules/${packageName}/bin.js`);
    }
    async run(prebuildInstallPath) {
        await spawn(process.execPath, [
            path.resolve(import.meta.dirname, '..', `prebuild-shim.js`),
            prebuildInstallPath,
            `--arch=${this.rebuilder.arch}`,
            `--platform=${this.rebuilder.platform}`,
            `--tag-prefix=${this.rebuilder.prebuildTagPrefix}`,
            ...(await this.getPrebuildInstallRuntimeArgs()),
        ], {
            cwd: this.modulePath,
        });
    }
    async findPrebuiltModule() {
        const prebuildInstallPath = await this.locateBinary();
        if (prebuildInstallPath) {
            d(`triggering prebuild download step: ${this.moduleName}`);
            try {
                await this.run(prebuildInstallPath);
                return true;
            }
            catch (err) {
                d('failed to use prebuild-install:', err);
                if (err?.message?.includes('requires Node-API but Electron')) {
                    throw err;
                }
            }
        }
        else {
            d(`could not find prebuild-install relative to: ${this.modulePath}`);
        }
        return false;
    }
    /**
     * Whether a prebuild-install-based native module exists.
     */
    async prebuiltModuleExists() {
        return fs.existsSync(path.resolve(this.modulePath, 'prebuilds', `${this.rebuilder.platform}-${this.rebuilder.arch}`, `electron-${this.rebuilder.ABI}.node`));
    }
    async getPrebuildInstallRuntimeArgs() {
        const moduleNapiVersions = await this.getSupportedNapiVersions();
        if (moduleNapiVersions) {
            const napiVersion = this.nodeAPI.getNapiVersion(moduleNapiVersions);
            return ['--runtime=napi', `--target=${napiVersion}`];
        }
        else {
            return ['--runtime=electron', `--target=${this.rebuilder.electronVersion}`];
        }
    }
}
//# sourceMappingURL=prebuild-install.js.map
import debug from 'debug';
import { readBinaryFileArch } from 'read-binary-file-arch';
import { locateBinary, NativeModule } from './index.js';
import { spawn } from '@malept/cross-spawn-promise';
const d = debug('electron-rebuild');
export class NodePreGyp extends NativeModule {
    async usesTool() {
        const packageName = await this.findPackageInDependencies('node-pre-gyp');
        return !!packageName;
    }
    async locateBinary() {
        const packageName = await this.findPackageInDependencies('node-pre-gyp');
        if (!packageName)
            return null;
        return locateBinary(this.modulePath, `node_modules/${packageName}/bin/node-pre-gyp`);
    }
    async run(nodePreGypPath) {
        const redownloadBinary = await this.shouldUpdateBinary(nodePreGypPath);
        await spawn(process.execPath, [
            nodePreGypPath,
            'reinstall',
            '--fallback-to-build',
            ...(redownloadBinary ? ['--update-binary'] : []),
            `--arch=${this.rebuilder.arch}`, // fallback build arch
            `--target_arch=${this.rebuilder.arch}`, // prebuild arch
            `--target_platform=${this.rebuilder.platform}`,
            ...(await this.getNodePreGypRuntimeArgs()),
        ], {
            cwd: this.modulePath,
        });
    }
    async findPrebuiltModule() {
        const nodePreGypPath = await this.locateBinary();
        if (nodePreGypPath) {
            d(`triggering prebuild download step: ${this.moduleName}`);
            try {
                await this.run(nodePreGypPath);
                return true;
            }
            catch (err) {
                d('failed to use node-pre-gyp:', err);
                if (err?.message?.includes('requires Node-API but Electron')) {
                    throw err;
                }
            }
        }
        else {
            d(`could not find node-pre-gyp relative to: ${this.modulePath}`);
        }
        return false;
    }
    async getNodePreGypRuntimeArgs() {
        const moduleNapiVersions = await this.getSupportedNapiVersions();
        if (moduleNapiVersions) {
            return [];
        }
        else {
            return [
                '--runtime=electron',
                `--target=${this.rebuilder.electronVersion}`,
                `--dist-url=${this.rebuilder.headerURL}`,
            ];
        }
    }
    async shouldUpdateBinary(nodePreGypPath) {
        let shouldUpdate = false;
        // Redownload binary only if the existing module arch differs from the
        // target arch.
        try {
            const modulePaths = await this.getModulePaths(nodePreGypPath);
            d('module paths:', modulePaths);
            for (const modulePath of modulePaths) {
                let moduleArch;
                try {
                    moduleArch = await readBinaryFileArch(modulePath);
                    d('module arch:', moduleArch);
                }
                catch (error) {
                    d('failed to read module arch:', error.message);
                    continue;
                }
                if (moduleArch && moduleArch !== this.rebuilder.arch) {
                    shouldUpdate = true;
                    d('module architecture differs:', `${moduleArch} !== ${this.rebuilder.arch}`);
                    break;
                }
            }
        }
        catch (error) {
            d('failed to get existing binary arch:', error.message);
            // Assume architecture differs
            shouldUpdate = true;
        }
        return shouldUpdate;
    }
    async getModulePaths(nodePreGypPath) {
        const results = await spawn(process.execPath, [
            nodePreGypPath,
            'reveal',
            'module', // pick property with module path
            `--target_arch=${this.rebuilder.arch}`,
            `--target_platform=${this.rebuilder.platform}`,
        ], {
            cwd: this.modulePath,
        });
        // Packages with multiple binaries will output one per line
        return results.split('\n').filter(Boolean);
    }
}
//# sourceMappingURL=node-pre-gyp.js.map
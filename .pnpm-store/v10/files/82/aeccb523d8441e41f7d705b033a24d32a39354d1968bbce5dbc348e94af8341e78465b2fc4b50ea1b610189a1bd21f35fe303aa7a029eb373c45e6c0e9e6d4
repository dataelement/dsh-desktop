import fs from 'node:fs';
import path from 'node:path';
import { NodeAPI } from '../node-api.js';
import { readPackageJson } from '../read-package-json.js';
export class NativeModule {
    rebuilder;
    _moduleName;
    modulePath;
    nodeAPI;
    packageJSON;
    constructor(rebuilder, modulePath) {
        this.rebuilder = rebuilder;
        this.modulePath = modulePath;
        this.nodeAPI = new NodeAPI(this.moduleName, this.rebuilder.electronVersion);
    }
    get moduleName() {
        if (!this._moduleName) {
            const basename = path.basename(this.modulePath);
            const parentDir = path.basename(path.dirname(this.modulePath));
            if (parentDir.startsWith('@')) {
                this._moduleName = `${parentDir}/${basename}`;
            }
            this._moduleName = basename;
        }
        return this._moduleName;
    }
    async packageJSONFieldWithDefault(key, defaultValue) {
        const result = await this.packageJSONField(key);
        return result === undefined ? defaultValue : result;
    }
    async packageJSONField(key) {
        this.packageJSON ||= await readPackageJson(this.modulePath);
        return this.packageJSON[key];
    }
    async getSupportedNapiVersions() {
        const binary = (await this.packageJSONFieldWithDefault('binary', {}));
        return binary?.napi_versions;
    }
    /**
     * Search dependencies for package using either `packageName` or
     * `@namespace/packageName` in the case of forks.
     */
    async findPackageInDependencies(packageName, packageProperty = 'dependencies') {
        const dependencies = await this.packageJSONFieldWithDefault(packageProperty, {});
        if (typeof dependencies !== 'object')
            return null;
        // Look for direct dependency match
        // eslint-disable-next-line no-prototype-builtins
        if (dependencies.hasOwnProperty(packageName))
            return packageName;
        const forkedPackage = Object.keys(dependencies).find((dependency) => dependency.startsWith('@') && dependency.endsWith(`/${packageName}`));
        return forkedPackage || null;
    }
}
export async function locateBinary(basePath, suffix) {
    let parentPath = basePath;
    let testPath;
    while (testPath !== parentPath) {
        testPath = parentPath;
        const checkPath = path.resolve(testPath, suffix);
        if (fs.existsSync(checkPath)) {
            return checkPath;
        }
        parentPath = path.resolve(testPath, '..');
    }
    return null;
}
//# sourceMappingURL=index.js.map
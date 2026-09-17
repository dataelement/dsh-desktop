import fs from 'node:fs';
import path from 'node:path';
import { searchForModule } from './search-module.js';
import { fileURLToPath } from 'node:url';
const electronModuleNames = ['electron', 'electron-prebuilt-compile'];
async function locateModuleByImport() {
    for (const moduleName of electronModuleNames) {
        try {
            const modulePath = path.resolve(fileURLToPath(import.meta.resolve(`${moduleName}/package.json`)), '..');
            if (fs.existsSync(path.join(modulePath, 'package.json'))) {
                return modulePath;
            }
        }
        catch {
            // eslint-disable-line no-empty
        }
    }
    return null;
}
export async function locateElectronModule(projectRootPath, startDir) {
    startDir ??= process.cwd();
    for (const moduleName of electronModuleNames) {
        const electronPaths = await searchForModule(startDir, moduleName, projectRootPath);
        const electronPath = electronPaths.find((ePath) => fs.existsSync(path.join(ePath, 'package.json')));
        if (electronPath) {
            return electronPath;
        }
    }
    return locateModuleByImport();
}
//# sourceMappingURL=electron-locator.js.map
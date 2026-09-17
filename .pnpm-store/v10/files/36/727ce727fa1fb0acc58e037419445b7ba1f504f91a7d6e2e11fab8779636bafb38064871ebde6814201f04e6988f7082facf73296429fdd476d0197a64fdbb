import * as fs from 'fs-extra';
import path from 'path';
import { AppFileType, getAllAppFiles } from './file-utils';
import { generateAsarIntegrity } from './asar-utils';
export async function computeIntegrityData(contentsPath) {
    const root = await fs.realpath(contentsPath);
    const resourcesRelativePath = 'Resources';
    const resourcesPath = path.resolve(root, resourcesRelativePath);
    const resources = await getAllAppFiles(resourcesPath);
    const resourceAsars = resources
        .filter((file) => file.type === AppFileType.APP_CODE)
        .reduce((prev, file) => (Object.assign(Object.assign({}, prev), { [path.join(resourcesRelativePath, file.relativePath)]: path.join(resourcesPath, file.relativePath) })), {});
    // sort to produce constant result
    const allAsars = Object.entries(resourceAsars).sort(([name1], [name2]) => name1.localeCompare(name2));
    const hashes = await Promise.all(allAsars.map(async ([, from]) => generateAsarIntegrity(from)));
    const asarIntegrity = {};
    for (let i = 0; i < allAsars.length; i++) {
        const [asar] = allAsars[i];
        asarIntegrity[asar] = hashes[i];
    }
    return asarIntegrity;
}
//# sourceMappingURL=integrity.js.map
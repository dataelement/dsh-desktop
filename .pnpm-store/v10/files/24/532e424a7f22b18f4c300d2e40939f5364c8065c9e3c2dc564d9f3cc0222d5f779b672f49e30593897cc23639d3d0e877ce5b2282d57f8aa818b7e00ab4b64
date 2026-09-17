import fs from 'node:fs/promises';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readPackageJson(dir, safe = false) {
    try {
        return JSON.parse(await fs.readFile(path.resolve(dir, 'package.json'), {
            encoding: 'utf-8',
        }));
    }
    catch (err) {
        if (safe) {
            return {};
        }
        else {
            throw err;
        }
    }
}
//# sourceMappingURL=read-package-json.js.map
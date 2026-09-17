import crypto from 'node:crypto';
import debug from 'debug';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const d = debug('electron-rebuild');
// Update this number if you change the caching logic to ensure no bad cache hits
const ELECTRON_REBUILD_CACHE_ID = 1;
class Snap {
    hash;
    data;
    constructor(hash, data) {
        this.hash = hash;
        this.data = data;
    }
}
const takeSnapshot = async (dir, relativeTo = dir) => {
    const snap = {};
    await Promise.all((await fs.promises.readdir(dir)).map(async (child) => {
        if (child === 'node_modules')
            return;
        const childPath = path.resolve(dir, child);
        const relative = path.relative(relativeTo, childPath);
        if ((await fs.promises.stat(childPath)).isDirectory()) {
            snap[relative] = await takeSnapshot(childPath, relativeTo);
        }
        else {
            const data = await fs.promises.readFile(childPath);
            snap[relative] = new Snap(crypto.createHash('SHA256').update(data).digest('hex'), data);
        }
    }));
    return snap;
};
const writeSnapshot = async (diff, dir) => {
    for (const key in diff) {
        if (diff[key] instanceof Snap) {
            await fs.promises.mkdir(path.dirname(path.resolve(dir, key)), { recursive: true });
            await fs.promises.writeFile(path.resolve(dir, key), diff[key].data);
        }
        else {
            await fs.promises.mkdir(path.resolve(dir, key), { recursive: true });
            await writeSnapshot(diff[key], dir);
        }
    }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serialize = (snap) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonReady = {};
    for (const key in snap) {
        if (snap[key] instanceof Snap) {
            const s = snap[key];
            jsonReady[key] = {
                __isSnap: true,
                hash: s.hash,
                data: s.data.toString('base64'),
            };
        }
        else {
            jsonReady[key] = serialize(snap[key]);
        }
    }
    return jsonReady;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unserialize = (jsonReady) => {
    const snap = {};
    for (const key in jsonReady) {
        if (jsonReady[key].__isSnap) {
            snap[key] = new Snap(jsonReady[key].hash, Buffer.from(jsonReady[key].data, 'base64'));
        }
        else {
            snap[key] = unserialize(jsonReady[key]);
        }
    }
    return snap;
};
export const cacheModuleState = async (dir, cachePath, key) => {
    const snap = await takeSnapshot(dir);
    const moduleBuffer = Buffer.from(JSON.stringify(serialize(snap)));
    const zipped = await new Promise((resolve) => zlib.gzip(moduleBuffer, (_, result) => resolve(result)));
    await fs.promises.mkdir(cachePath, { recursive: true });
    await fs.promises.writeFile(path.resolve(cachePath, key), zipped);
};
export const lookupModuleState = async (cachePath, key) => {
    if (fs.existsSync(path.resolve(cachePath, key))) {
        return async function applyDiff(dir) {
            const zipped = await fs.promises.readFile(path.resolve(cachePath, key));
            const unzipped = await new Promise((resolve) => {
                zlib.gunzip(zipped, (_, result) => resolve(result));
            });
            const diff = unserialize(JSON.parse(unzipped.toString()));
            await writeSnapshot(diff, dir);
        };
    }
    return false;
};
function dHashTree(tree, hash) {
    for (const key of Object.keys(tree).sort()) {
        hash.update(key);
        if (typeof tree[key] === 'string') {
            hash.update(tree[key]);
        }
        else {
            dHashTree(tree[key], hash);
        }
    }
}
async function hashDirectory(dir, relativeTo) {
    relativeTo ??= dir;
    d('hashing dir', dir);
    const dirTree = {};
    await Promise.all((await fs.promises.readdir(dir)).map(async (child) => {
        d('found child', child, 'in dir', dir);
        // Ignore output directories
        if (dir === relativeTo && (child === 'build' || child === 'bin'))
            return;
        // Don't hash nested node_modules
        if (child === 'node_modules')
            return;
        const childPath = path.resolve(dir, child);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const relative = path.relative(relativeTo, childPath);
        if ((await fs.promises.stat(childPath)).isDirectory()) {
            dirTree[relative] = await hashDirectory(childPath, relativeTo);
        }
        else {
            dirTree[relative] = crypto
                .createHash('SHA256')
                .update(await fs.promises.readFile(childPath))
                .digest('hex');
        }
    }));
    return dirTree;
}
export async function generateCacheKey(opts) {
    const tree = await hashDirectory(opts.modulePath);
    const hasher = crypto
        .createHash('SHA256')
        .update(`${ELECTRON_REBUILD_CACHE_ID}`)
        .update(path.basename(opts.modulePath))
        .update(opts.ABI)
        .update(opts.arch)
        .update(opts.platform)
        .update(opts.debug ? 'debug' : 'not debug')
        .update(opts.headerURL)
        .update(opts.electronVersion);
    dHashTree(tree, hasher);
    const hash = hasher.digest('hex');
    d('calculated hash of', opts.modulePath, 'to be', hash);
    return hash;
}
//# sourceMappingURL=cache.js.map
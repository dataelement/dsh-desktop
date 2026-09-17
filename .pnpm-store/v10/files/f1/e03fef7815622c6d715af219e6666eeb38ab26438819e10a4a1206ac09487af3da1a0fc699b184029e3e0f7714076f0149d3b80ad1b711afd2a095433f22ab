"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = 'electron' in process.versions ? require('original-fs') : require('fs');
const promisifiedMethods = [
    'lstat',
    'mkdtemp',
    'readFile',
    'stat',
    'writeFile',
    'symlink',
    'readlink',
];
const promisified = {};
for (const method of Object.keys(fs)) {
    if (promisifiedMethods.includes(method)) {
        promisified[method] = fs.promises[method];
    }
    else {
        promisified[method] = fs[method];
    }
}
// To make it more like fs-extra
promisified.mkdirp = (dir) => fs.promises.mkdir(dir, { recursive: true });
promisified.mkdirpSync = (dir) => fs.mkdirSync(dir, { recursive: true });
exports.default = promisified;
//# sourceMappingURL=wrapped-fs.js.map
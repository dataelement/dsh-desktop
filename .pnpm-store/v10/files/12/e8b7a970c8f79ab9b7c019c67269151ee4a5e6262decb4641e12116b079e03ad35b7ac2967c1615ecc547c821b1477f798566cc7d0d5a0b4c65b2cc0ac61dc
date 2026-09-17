"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const debug_1 = require("debug");
const env_paths_1 = require("env-paths");
const fs = require("fs-extra");
const path = require("path");
const url = require("url");
const crypto = require("crypto");
const d = (0, debug_1.default)('@electron/get:cache');
const defaultCacheRoot = (0, env_paths_1.default)('electron', {
    suffix: '',
}).cache;
class Cache {
    constructor(cacheRoot = defaultCacheRoot) {
        this.cacheRoot = cacheRoot;
    }
    static getCacheDirectory(downloadUrl) {
        const parsedDownloadUrl = url.parse(downloadUrl);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { search, hash, pathname } = parsedDownloadUrl, rest = __rest(parsedDownloadUrl, ["search", "hash", "pathname"]);
        const strippedUrl = url.format(Object.assign(Object.assign({}, rest), { pathname: path.dirname(pathname || 'electron') }));
        return crypto
            .createHash('sha256')
            .update(strippedUrl)
            .digest('hex');
    }
    getCachePath(downloadUrl, fileName) {
        return path.resolve(this.cacheRoot, Cache.getCacheDirectory(downloadUrl), fileName);
    }
    async getPathForFileInCache(url, fileName) {
        const cachePath = this.getCachePath(url, fileName);
        if (await fs.pathExists(cachePath)) {
            return cachePath;
        }
        return null;
    }
    async putFileInCache(url, currentPath, fileName) {
        const cachePath = this.getCachePath(url, fileName);
        d(`Moving ${currentPath} to ${cachePath}`);
        if (await fs.pathExists(cachePath)) {
            d('* Replacing existing file');
            await fs.remove(cachePath);
        }
        await fs.move(currentPath, cachePath);
        return cachePath;
    }
}
exports.Cache = Cache;
//# sourceMappingURL=Cache.js.map
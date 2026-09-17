"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronDownloadCacheMode = exports.GotDownloader = void 0;
const GotDownloader_1 = require("./GotDownloader");
Object.defineProperty(exports, "GotDownloader", { enumerable: true, get: function () { return GotDownloader_1.GotDownloader; } });
var ElectronDownloadCacheMode;
(function (ElectronDownloadCacheMode) {
    /**
     * Reads from the cache if present
     * Writes to the cache after fetch if not present
     */
    ElectronDownloadCacheMode[ElectronDownloadCacheMode["ReadWrite"] = 0] = "ReadWrite";
    /**
     * Reads from the cache if present
     * Will **not** write back to the cache after fetching missing artifact
     */
    ElectronDownloadCacheMode[ElectronDownloadCacheMode["ReadOnly"] = 1] = "ReadOnly";
    /**
     * Skips reading from the cache
     * Will write back into the cache, overwriting anything currently in the cache after fetch
     */
    ElectronDownloadCacheMode[ElectronDownloadCacheMode["WriteOnly"] = 2] = "WriteOnly";
    /**
     * Bypasses the cache completely, neither reads from nor writes to the cache
     */
    ElectronDownloadCacheMode[ElectronDownloadCacheMode["Bypass"] = 3] = "Bypass";
})(ElectronDownloadCacheMode = exports.ElectronDownloadCacheMode || (exports.ElectronDownloadCacheMode = {}));
//# sourceMappingURL=types.js.map
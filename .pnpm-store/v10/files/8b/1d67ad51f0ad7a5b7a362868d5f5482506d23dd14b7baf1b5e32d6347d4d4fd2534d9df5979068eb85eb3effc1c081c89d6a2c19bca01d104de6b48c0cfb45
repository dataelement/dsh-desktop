"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppCacheDir = getAppCacheDir;
const path = require("path");
const os_1 = require("os");
function getAppCacheDir() {
    const homedir = (0, os_1.homedir)();
    // https://github.com/electron/electron/issues/1404#issuecomment-194391247
    let result;
    if (process.platform === "win32") {
        result = process.env["LOCALAPPDATA"] || path.join(homedir, "AppData", "Local");
    }
    else if (process.platform === "darwin") {
        result = path.join(homedir, "Library", "Caches");
    }
    else {
        result = process.env["XDG_CACHE_HOME"] || path.join(homedir, ".cache");
    }
    return result;
}
//# sourceMappingURL=AppAdapter.js.map
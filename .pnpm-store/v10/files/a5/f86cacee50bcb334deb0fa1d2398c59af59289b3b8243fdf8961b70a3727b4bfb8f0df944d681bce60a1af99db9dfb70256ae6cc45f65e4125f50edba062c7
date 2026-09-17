"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLibOrExe = isLibOrExe;
exports.detectUnpackedDirs = detectUnpackedDirs;
const builder_util_1 = require("builder-util");
const isbinaryfile_1 = require("isbinaryfile");
const path = require("path");
function isLibOrExe(file) {
    // https://github.com/electron-userland/electron-builder/issues/3038
    return file.endsWith(".dll") || file.endsWith(".exe") || file.endsWith(".dylib") || file.endsWith(".so") || file.endsWith(".node");
}
/** @internal */
function detectUnpackedDirs(fileSet, autoUnpackDirs) {
    const metadata = fileSet.metadata;
    for (let i = 0, n = fileSet.files.length; i < n; i++) {
        const file = fileSet.files[i];
        const stat = metadata.get(file);
        if (!stat.moduleRootPath || autoUnpackDirs.has(stat.moduleRootPath)) {
            continue;
        }
        if (!stat.isFile()) {
            continue;
        }
        // https://github.com/electron-userland/electron-builder/issues/2679
        let shouldUnpack = false;
        // ffprobe-static and ffmpeg-static are known packages to always unpack
        const moduleName = stat.moduleName;
        const fileBaseName = path.basename(file);
        const hasExtension = path.extname(fileBaseName);
        if (moduleName === "ffprobe-static" || moduleName === "ffmpeg-static" || isLibOrExe(file)) {
            shouldUnpack = true;
        }
        else if (!hasExtension) {
            shouldUnpack = !!(0, isbinaryfile_1.isBinaryFileSync)(file);
        }
        if (!shouldUnpack) {
            continue;
        }
        builder_util_1.log.debug({ file: stat.moduleFullFilePath, reason: "contains executable code" }, "not packed into asar archive");
        autoUnpackDirs.add(stat.moduleRootPath);
    }
}
//# sourceMappingURL=unpackDetector.js.map
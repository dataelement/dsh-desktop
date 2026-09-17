"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildForge = buildForge;
const path = require("path");
const index_1 = require("./index");
function buildForge(forgeOptions, options) {
    // Resolve appDir to an absolute canonical path before deriving any sibling
    // directories from it.  Using path.dirname avoids embedding ".." in the
    // resolved path, which keeps downstream path comparisons and CodeQL taint
    // tracking straightforward.
    const appDir = path.resolve(forgeOptions.dir);
    return (0, index_1.build)({
        prepackaged: appDir,
        config: {
            directories: {
                // https://github.com/electron-userland/electron-forge/blob/master/src/makers/generic/zip.js
                output: path.join(path.dirname(appDir), "make"),
            },
        },
        ...options,
    });
}
//# sourceMappingURL=forge-maker.js.map
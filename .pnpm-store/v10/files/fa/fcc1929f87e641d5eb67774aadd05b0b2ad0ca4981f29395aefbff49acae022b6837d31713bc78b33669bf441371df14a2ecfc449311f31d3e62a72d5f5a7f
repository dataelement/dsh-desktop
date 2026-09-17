"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactCra = reactCra;
const builder_util_1 = require("builder-util");
const path = require("path");
/** @internal */
async function reactCra(projectDir) {
    if ((await (0, builder_util_1.statOrNull)(path.join(projectDir, "public", "electron.js"))) == null) {
        // noinspection SpellCheckingInspection
        builder_util_1.log.warn("public/electron.js not found. Please see https://medium.com/@kitze/%EF%B8%8F-from-react-to-an-electron-app-ready-for-production-a0468ecb1da3");
    }
    return {
        directories: {
            buildResources: "assets",
        },
        files: ["build/**/*"],
        extraMetadata: {
            main: "build/electron.js",
        },
    };
}
//# sourceMappingURL=rectCra.js.map
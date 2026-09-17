"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
if (process.arch === 'arm64') {
    setPaths('arm64');
}
else {
    setPaths('x64');
}
function setPaths(platform) {
    // This should return the full path, ending in something like
    // Notion.app/Contents/Resources/app.asar
    const appPath = electron_1.app.getAppPath();
    const asarFile = `app-${platform}.asar`;
    // Maybe we'll handle this in Electron one day
    if (path_1.default.basename(appPath) === 'app.asar') {
        const platformAppPath = path_1.default.join(path_1.default.dirname(appPath), asarFile);
        // This is an undocumented API. It exists.
        electron_1.app.setAppPath(platformAppPath);
    }
    process._archPath = require.resolve(`../${asarFile}`);
}
require(process._archPath);
//# sourceMappingURL=has-asar.js.map
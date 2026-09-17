"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NsisUpdater = exports.MacUpdater = exports.RpmUpdater = exports.PacmanUpdater = exports.DebUpdater = exports.AppImageUpdater = exports.Provider = exports.NoOpLogger = exports.AppUpdater = exports.BaseUpdater = void 0;
const fs_extra_1 = require("fs-extra");
const path = require("path");
var BaseUpdater_1 = require("./BaseUpdater");
Object.defineProperty(exports, "BaseUpdater", { enumerable: true, get: function () { return BaseUpdater_1.BaseUpdater; } });
var AppUpdater_1 = require("./AppUpdater");
Object.defineProperty(exports, "AppUpdater", { enumerable: true, get: function () { return AppUpdater_1.AppUpdater; } });
Object.defineProperty(exports, "NoOpLogger", { enumerable: true, get: function () { return AppUpdater_1.NoOpLogger; } });
var Provider_1 = require("./providers/Provider");
Object.defineProperty(exports, "Provider", { enumerable: true, get: function () { return Provider_1.Provider; } });
var AppImageUpdater_1 = require("./AppImageUpdater");
Object.defineProperty(exports, "AppImageUpdater", { enumerable: true, get: function () { return AppImageUpdater_1.AppImageUpdater; } });
var DebUpdater_1 = require("./DebUpdater");
Object.defineProperty(exports, "DebUpdater", { enumerable: true, get: function () { return DebUpdater_1.DebUpdater; } });
var PacmanUpdater_1 = require("./PacmanUpdater");
Object.defineProperty(exports, "PacmanUpdater", { enumerable: true, get: function () { return PacmanUpdater_1.PacmanUpdater; } });
var RpmUpdater_1 = require("./RpmUpdater");
Object.defineProperty(exports, "RpmUpdater", { enumerable: true, get: function () { return RpmUpdater_1.RpmUpdater; } });
var MacUpdater_1 = require("./MacUpdater");
Object.defineProperty(exports, "MacUpdater", { enumerable: true, get: function () { return MacUpdater_1.MacUpdater; } });
var NsisUpdater_1 = require("./NsisUpdater");
Object.defineProperty(exports, "NsisUpdater", { enumerable: true, get: function () { return NsisUpdater_1.NsisUpdater; } });
__exportStar(require("./types"), exports);
// autoUpdater to mimic electron bundled autoUpdater
let _autoUpdater;
function doLoadAutoUpdater() {
    // tslint:disable:prefer-conditional-expression
    if (process.platform === "win32") {
        _autoUpdater = new (require("./NsisUpdater").NsisUpdater)();
    }
    else if (process.platform === "darwin") {
        _autoUpdater = new (require("./MacUpdater").MacUpdater)();
    }
    else {
        _autoUpdater = new (require("./AppImageUpdater").AppImageUpdater)();
        try {
            const identity = path.join(process.resourcesPath, "package-type");
            if (!(0, fs_extra_1.existsSync)(identity)) {
                return _autoUpdater;
            }
            const fileType = (0, fs_extra_1.readFileSync)(identity).toString().trim();
            switch (fileType) {
                case "deb":
                    _autoUpdater = new (require("./DebUpdater").DebUpdater)();
                    break;
                case "rpm":
                    _autoUpdater = new (require("./RpmUpdater").RpmUpdater)();
                    break;
                case "pacman":
                    _autoUpdater = new (require("./PacmanUpdater").PacmanUpdater)();
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            console.warn("Unable to detect 'package-type' for autoUpdater (rpm/deb/pacman support). If you'd like to expand support, please consider contributing to electron-builder", error.message);
        }
    }
    return _autoUpdater;
}
Object.defineProperty(exports, "autoUpdater", {
    enumerable: true,
    get: () => {
        return _autoUpdater || doLoadAutoUpdater();
    },
});
//# sourceMappingURL=main.js.map
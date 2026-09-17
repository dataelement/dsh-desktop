"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronAppAdapter = void 0;
const path = require("path");
const AppAdapter_1 = require("./AppAdapter");
class ElectronAppAdapter {
    constructor(app = require("electron").app) {
        this.app = app;
    }
    whenReady() {
        return this.app.whenReady();
    }
    get version() {
        return this.app.getVersion();
    }
    get name() {
        return this.app.getName();
    }
    get isPackaged() {
        return this.app.isPackaged === true;
    }
    get appUpdateConfigPath() {
        return this.isPackaged ? path.join(process.resourcesPath, "app-update.yml") : path.join(this.app.getAppPath(), "dev-app-update.yml");
    }
    get userDataPath() {
        return this.app.getPath("userData");
    }
    get baseCachePath() {
        return (0, AppAdapter_1.getAppCacheDir)();
    }
    quit() {
        this.app.quit();
    }
    relaunch() {
        this.app.relaunch();
    }
    onQuit(handler) {
        this.app.once("quit", (_, exitCode) => handler(exitCode));
    }
}
exports.ElectronAppAdapter = ElectronAppAdapter;
//# sourceMappingURL=ElectronAppAdapter.js.map
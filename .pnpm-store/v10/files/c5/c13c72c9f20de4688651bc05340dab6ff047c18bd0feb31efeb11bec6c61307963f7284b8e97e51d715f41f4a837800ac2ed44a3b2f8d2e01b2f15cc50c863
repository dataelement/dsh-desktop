"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WineVmManager = void 0;
const builder_util_1 = require("builder-util");
const path = require("path");
const wine_1 = require("../toolsets/wine");
const vm_1 = require("./vm");
class WineVmManager extends vm_1.VmManager {
    constructor(wineToolset) {
        super();
        this.wineToolset = wineToolset;
    }
    exec(file, args, options, _isLogOutIfDebug = true) {
        return this.execWine({ file, appArgs: args, options, toolset: this.wineToolset });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    spawn(file, args, options, extraOptions) {
        throw new Error("Unsupported");
    }
    toVmFile(file) {
        return path.win32.join("Z:", file);
    }
    async execWine({ file: target, appArgs = [], options = {}, toolset }) {
        if (options.timeout == null) {
            // 2 minutes
            options.timeout = 120 * 1000;
        }
        if (process.platform === "win32") {
            return (0, builder_util_1.exec)(target, appArgs, options);
        }
        const { execPath: wineExe, env: wineEnv } = await (0, wine_1.getWineToolset)(toolset);
        // Preserve the base process environment (PATH, HOME, TMPDIR, etc.) so Wine and child
        // tools start correctly. Wine env vars override the base; caller options.env wins last.
        return (0, builder_util_1.exec)(wineExe, [target, ...appArgs], { ...options, env: { ...process.env, ...wineEnv, ...options.env } });
    }
}
exports.WineVmManager = WineVmManager;
//# sourceMappingURL=WineVm.js.map
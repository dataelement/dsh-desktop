"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCommandAvailable = exports.isPwshAvailable = exports.VmManager = void 0;
exports.getWindowsVm = getWindowsVm;
exports.getLinuxVm = getLinuxVm;
const builder_util_1 = require("builder-util");
const lazy_val_1 = require("lazy-val");
const path = require("path");
class VmManager {
    constructor() {
        this.powershellCommand = new lazy_val_1.Lazy(() => {
            return this.exec("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Get-Command pwsh.exe`])
                .then(() => {
                builder_util_1.log.info(null, "identified pwsh.exe");
                return "pwsh.exe";
            })
                .catch(() => {
                builder_util_1.log.info(null, "unable to find pwsh.exe, falling back to powershell.exe");
                return "powershell.exe";
            });
        });
    }
    get pathSep() {
        return path.sep;
    }
    exec(file, args, options, isLogOutIfDebug = true) {
        return (0, builder_util_1.exec)(file, args, options, isLogOutIfDebug);
    }
    spawn(file, args, options, extraOptions) {
        return (0, builder_util_1.spawn)(file, args, options, extraOptions);
    }
    toVmFile(file) {
        return file;
    }
}
exports.VmManager = VmManager;
async function getWindowsVm(debugLogger) {
    const parallelsVmModule = await Promise.resolve().then(() => require("./ParallelsVm"));
    let vmList = [];
    try {
        vmList = (await parallelsVmModule.parseVmList(debugLogger)).filter(it => ["win-10", "win-11"].includes(it.os));
    }
    catch (_error) {
        if ((await exports.isPwshAvailable.value) && (await isWineAvailable.value)) {
            const vmModule = await Promise.resolve().then(() => require("./PwshVm"));
            return new vmModule.PwshVmManager();
        }
    }
    if (vmList.length === 0) {
        throw new builder_util_1.InvalidConfigurationError("Cannot find suitable Parallels Desktop virtual machine (Windows 10 is required) and cannot access `pwsh` and `wine` locally");
    }
    // prefer running or suspended vm
    return new parallelsVmModule.ParallelsVmManager(vmList.find(it => it.state === "running") || vmList.find(it => it.state === "suspended") || vmList[0]);
}
async function getLinuxVm(debugLogger) {
    if (process.platform !== "darwin") {
        return undefined;
    }
    try {
        const parallelsVmModule = await Promise.resolve().then(() => require("./ParallelsVm"));
        const vmList = (await parallelsVmModule.parseVmList(debugLogger)).filter(it => it.os === "ubuntu");
        if (vmList.length === 0) {
            return undefined;
        }
        const vm = vmList.find(it => it.state === "running") || vmList.find(it => it.state === "suspended") || vmList[0];
        return new parallelsVmModule.ParallelsVmManager(vm);
    }
    catch {
        return undefined;
    }
}
const isWineAvailable = new lazy_val_1.Lazy(async () => {
    return (0, exports.isCommandAvailable)("wine", ["--version"]);
});
exports.isPwshAvailable = new lazy_val_1.Lazy(async () => {
    return (0, exports.isCommandAvailable)("pwsh", ["--version"]);
});
const isCommandAvailable = async (command, args) => {
    try {
        await (0, builder_util_1.exec)(command, args);
        return true;
    }
    catch {
        return false;
    }
};
exports.isCommandAvailable = isCommandAvailable;
//# sourceMappingURL=vm.js.map
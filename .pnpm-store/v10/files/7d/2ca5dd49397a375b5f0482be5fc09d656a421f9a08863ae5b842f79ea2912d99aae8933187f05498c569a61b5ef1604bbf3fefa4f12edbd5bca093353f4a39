"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PwshVmManager = void 0;
const builder_util_1 = require("builder-util");
const lazy_val_1 = require("lazy-val");
const vm_1 = require("./vm");
class PwshVmManager extends vm_1.VmManager {
    constructor() {
        super();
        this.powershellCommand = new lazy_val_1.Lazy(async () => {
            builder_util_1.log.info(null, "checking for `pwsh` for powershell");
            if (await vm_1.isPwshAvailable.value) {
                return "pwsh";
            }
            const errorMessage = `unable to find \`pwsh\`, please install per instructions linked in logs`;
            builder_util_1.log.error({
                mac: "https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-macos",
                linux: "https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-linux",
            }, errorMessage);
            throw new Error(errorMessage);
        });
    }
}
exports.PwshVmManager = PwshVmManager;
//# sourceMappingURL=PwshVm.js.map
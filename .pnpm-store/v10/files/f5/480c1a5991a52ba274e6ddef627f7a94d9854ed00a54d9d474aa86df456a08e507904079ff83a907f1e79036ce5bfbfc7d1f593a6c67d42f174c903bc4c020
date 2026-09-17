"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YarnBerryNodeModulesCollector = void 0;
const builder_util_1 = require("builder-util");
const lazy_val_1 = require("lazy-val");
const npmNodeModulesCollector_1 = require("./npmNodeModulesCollector");
const packageManager_1 = require("./packageManager");
// Only Yarn v1 uses CLI. We should use pnp.cjs for PnP, but we can't access the files due to virtual file paths within zipped modules.
// We fallback to npm node module collection (since Yarn Berry could have npm-like structure OR pnpm-like structure, depending on `nmHoistingLimits` configuration).
// In the latter case, we still can't assume `pnpm` is installed, so we still try to use npm collection as a best-effort attempt.
// If those fail, such as if using corepack, we attempt to manually build the tree.
class YarnBerryNodeModulesCollector extends npmNodeModulesCollector_1.NpmNodeModulesCollector {
    constructor() {
        super(...arguments);
        this.installOptions = {
            manager: packageManager_1.PM.YARN_BERRY,
            lockfile: "yarn.lock",
        };
        this.yarnSetupInfo = new lazy_val_1.Lazy(async () => this.detectYarnSetup(this.rootDir));
        this.isHoisted = new lazy_val_1.Lazy(async () => this.yarnSetupInfo.value.then(info => info.isHoisted));
    }
    async getDependenciesTree(_pm) {
        const isPnp = await this.yarnSetupInfo.value.then(info => !!info.isPnP);
        if (isPnp) {
            builder_util_1.log.warn(null, "Yarn PnP extraction not supported directly due to virtual file paths (<package_name>.zip/<file_path>), utilizing NPM node module collector");
        }
        return super.getDependenciesTree(packageManager_1.PM.NPM);
    }
    isProdDependency(packageName, tree) {
        var _a, _b;
        return super.isProdDependency(packageName, tree) || ((_a = tree.dependencies) === null || _a === void 0 ? void 0 : _a[packageName]) != null || ((_b = tree.optionalDependencies) === null || _b === void 0 ? void 0 : _b[packageName]) != null;
    }
    async detectYarnSetup(rootDir) {
        var _a, _b, _c, _d;
        let yarnVersion = null;
        let nodeLinker = null;
        let nmHoistingLimits = null;
        const output = await this.asyncExec("yarn", ["config", "--json"], rootDir);
        if (!output.stdout) {
            builder_util_1.log.debug(null, "Yarn config returned no output, assuming default Yarn v1 behavior (hoisted, non-PnP)");
            return {
                yarnVersion,
                nodeLinker,
                nmHoistingLimits,
                isPnP: false,
                isHoisted: true,
            };
        }
        // Yarn 1: multi-line stream with type:"inspect" (not used in this file anyways)
        // Yarn 2–3: multi-line stream with type:"inspect"
        // Yarn 4: single JSON object, no "type"
        const lines = output.stdout
            .split("\n")
            .map(l => l.trim())
            .filter(Boolean);
        let data = null;
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                // Yarn 4: direct object
                if (parsed.rc || parsed.manifest) {
                    data = parsed;
                    break;
                }
                // Yarn 1–3: inspect event
                if (parsed.type === "inspect") {
                    data = parsed.data;
                    break;
                }
            }
            catch {
                // ignore non-JSON lines
            }
        }
        if (data) {
            const rc = data.rc || data; // Yarn 4: rc in root; Yarn 2–3: rc inside data
            yarnVersion = (_b = (_a = data.manifest) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : null;
            nodeLinker = (_c = rc.nodeLinker) !== null && _c !== void 0 ? _c : null;
            nmHoistingLimits = (_d = rc.nmHoistingLimits) !== null && _d !== void 0 ? _d : null;
        }
        const isPnP = nodeLinker === "pnp";
        const isHoisted = !isPnP && (nmHoistingLimits === "dependencies" || nmHoistingLimits === "workspaces");
        return {
            yarnVersion,
            nodeLinker,
            nmHoistingLimits,
            isPnP,
            isHoisted,
        };
    }
}
exports.YarnBerryNodeModulesCollector = YarnBerryNodeModulesCollector;
//# sourceMappingURL=yarnBerryNodeModulesCollector.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YarnNodeModulesCollector = void 0;
const npmNodeModulesCollector_1 = require("./npmNodeModulesCollector");
const packageManager_1 = require("./packageManager");
// Yarn Classic (v1) produces a hoisted node_modules structure similar to npm.
// Instead of parsing Yarn's custom NDJSON output, we leverage npm's list command
// which NpmNodeModulesCollector already handles.
class YarnNodeModulesCollector extends npmNodeModulesCollector_1.NpmNodeModulesCollector {
    constructor() {
        super(...arguments);
        this.installOptions = {
            manager: packageManager_1.PM.YARN,
            lockfile: "yarn.lock",
        };
    }
    async getDependenciesTree(_pm) {
        return super.getDependenciesTree(packageManager_1.PM.NPM);
    }
}
exports.YarnNodeModulesCollector = YarnNodeModulesCollector;
//# sourceMappingURL=yarnNodeModulesCollector.js.map
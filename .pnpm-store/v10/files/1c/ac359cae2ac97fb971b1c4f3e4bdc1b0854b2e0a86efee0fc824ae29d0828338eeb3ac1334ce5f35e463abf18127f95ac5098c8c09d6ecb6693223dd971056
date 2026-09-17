"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BunNodeModulesCollector = void 0;
const builder_util_1 = require("builder-util");
const packageManager_1 = require("./packageManager");
const traversalNodeModulesCollector_1 = require("./traversalNodeModulesCollector");
class BunNodeModulesCollector extends traversalNodeModulesCollector_1.TraversalNodeModulesCollector {
    constructor() {
        super(...arguments);
        this.installOptions = { manager: packageManager_1.PM.BUN, lockfile: "bun.lock" };
    }
    async getDependenciesTree(pm) {
        builder_util_1.log.info(null, "note: bun does not support any CLI for dependency tree extraction, utilizing file traversal collector instead");
        return super.getDependenciesTree(pm);
    }
}
exports.BunNodeModulesCollector = BunNodeModulesCollector;
//# sourceMappingURL=bunNodeModulesCollector.js.map
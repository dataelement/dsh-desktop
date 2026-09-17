"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determinePackageManagerEnv = exports.PM = exports.getPackageManagerCommand = void 0;
exports.getCollectorByPackageManager = getCollectorByPackageManager;
const npmNodeModulesCollector_1 = require("./npmNodeModulesCollector");
const packageManager_1 = require("./packageManager");
Object.defineProperty(exports, "getPackageManagerCommand", { enumerable: true, get: function () { return packageManager_1.getPackageManagerCommand; } });
Object.defineProperty(exports, "PM", { enumerable: true, get: function () { return packageManager_1.PM; } });
const pnpmNodeModulesCollector_1 = require("./pnpmNodeModulesCollector");
const yarnBerryNodeModulesCollector_1 = require("./yarnBerryNodeModulesCollector");
const yarnNodeModulesCollector_1 = require("./yarnNodeModulesCollector");
const bunNodeModulesCollector_1 = require("./bunNodeModulesCollector");
const lazy_val_1 = require("lazy-val");
const builder_util_1 = require("builder-util");
const fs = require("fs-extra");
const path = require("path");
const traversalNodeModulesCollector_1 = require("./traversalNodeModulesCollector");
function getCollectorByPackageManager(pm, rootDir, tempDirManager) {
    switch (pm) {
        case packageManager_1.PM.PNPM:
            return new pnpmNodeModulesCollector_1.PnpmNodeModulesCollector(rootDir, tempDirManager);
        case packageManager_1.PM.YARN:
            return new yarnNodeModulesCollector_1.YarnNodeModulesCollector(rootDir, tempDirManager);
        case packageManager_1.PM.YARN_BERRY:
            return new yarnBerryNodeModulesCollector_1.YarnBerryNodeModulesCollector(rootDir, tempDirManager);
        case packageManager_1.PM.BUN:
            return new bunNodeModulesCollector_1.BunNodeModulesCollector(rootDir, tempDirManager);
        case packageManager_1.PM.NPM:
            return new npmNodeModulesCollector_1.NpmNodeModulesCollector(rootDir, tempDirManager);
        case packageManager_1.PM.TRAVERSAL:
            return new traversalNodeModulesCollector_1.TraversalNodeModulesCollector(rootDir, tempDirManager);
    }
}
const determinePackageManagerEnv = ({ projectDir, appDir, workspaceRoot }) => new lazy_val_1.Lazy(async () => {
    const availableDirs = [workspaceRoot, projectDir, appDir].filter((it) => !(0, builder_util_1.isEmptyOrSpaces)(it));
    const pm = await (0, packageManager_1.detectPackageManager)(availableDirs);
    const root = await findWorkspaceRoot(pm.pm, projectDir);
    if (root != null) {
        // re-detect package manager from workspace root, this seems particularly necessary for pnpm workspaces
        const actualPm = await (0, packageManager_1.detectPackageManager)([root]);
        builder_util_1.log.info({ pm: actualPm.pm, config: actualPm.corepackConfig, resolved: actualPm.resolvedDirectory, projectDir }, `detected workspace root for project using ${actualPm.detectionMethod}`);
        return {
            pm: actualPm.pm,
            workspaceRoot: Promise.resolve(actualPm.resolvedDirectory),
        };
    }
    return {
        pm: pm.pm,
        workspaceRoot: Promise.resolve(pm.resolvedDirectory),
    };
});
exports.determinePackageManagerEnv = determinePackageManagerEnv;
async function findWorkspaceRoot(pm, cwd) {
    let command;
    switch (pm) {
        case packageManager_1.PM.PNPM:
            command = { command: "pnpm", args: ["--workspace-root", "exec", "pwd"] };
            break;
        case packageManager_1.PM.YARN_BERRY:
            command = { command: "yarn", args: ["workspaces", "list", "--json"] };
            break;
        case packageManager_1.PM.YARN: {
            command = { command: "yarn", args: ["workspaces", "info", "--silent"] };
            break;
        }
        case packageManager_1.PM.BUN:
            command = { command: "bun", args: ["pm", "ls", "--json"] };
            break;
        case packageManager_1.PM.NPM:
        default:
            command = { command: "npm", args: ["prefix", "-w"] };
            break;
    }
    const output = await (0, builder_util_1.spawn)(command.command, command.args, { cwd, stdio: ["ignore", "pipe", "ignore"] })
        .then(async (it) => {
        const out = it === null || it === void 0 ? void 0 : it.trim();
        if (!out) {
            return undefined;
        }
        if (pm === packageManager_1.PM.YARN) {
            JSON.parse(out); // if JSON valid, workspace detected
            return findNearestPackageJsonWithWorkspacesField(cwd);
        }
        else if (pm === packageManager_1.PM.BUN) {
            const json = JSON.parse(out);
            if (Array.isArray(json) && json.length > 0) {
                return findNearestPackageJsonWithWorkspacesField(cwd);
            }
        }
        else if (pm === packageManager_1.PM.YARN_BERRY) {
            const lines = out
                .split("\n")
                .map(l => l.trim())
                .filter(Boolean);
            for (const line of lines) {
                const parsed = JSON.parse(line);
                if (parsed.location != null) {
                    const potential = path.resolve(cwd, parsed.location);
                    return (await (0, builder_util_1.exists)(potential)) ? findNearestPackageJsonWithWorkspacesField(potential) : undefined;
                }
            }
        }
        return out.length === 0 || out === "undefined" ? undefined : out;
    })
        .catch(() => findNearestPackageJsonWithWorkspacesField(cwd));
    return output;
}
async function findNearestPackageJsonWithWorkspacesField(dir) {
    let current = dir;
    while (true) {
        const pkgPath = path.join(current, "package.json");
        try {
            const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
            if (pkg.workspaces) {
                builder_util_1.log.debug({ path: current }, "identified workspace root");
                return current;
            }
        }
        catch {
            // ignore
        }
        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    return undefined;
}
//# sourceMappingURL=index.js.map
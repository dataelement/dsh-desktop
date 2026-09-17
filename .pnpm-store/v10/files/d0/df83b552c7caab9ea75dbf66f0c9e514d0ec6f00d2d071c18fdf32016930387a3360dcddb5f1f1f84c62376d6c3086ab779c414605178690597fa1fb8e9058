"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PM = void 0;
exports.getPackageManagerCommand = getPackageManagerCommand;
exports.detectPackageManager = detectPackageManager;
const builder_util_1 = require("builder-util");
const fs = require("fs-extra");
const path = require("path");
const which = require("which");
var PM;
(function (PM) {
    PM["PNPM"] = "pnpm";
    PM["YARN"] = "yarn";
    PM["YARN_BERRY"] = "yarn-berry";
    PM["BUN"] = "bun";
    PM["NPM"] = "npm";
    PM["TRAVERSAL"] = "traversal";
})(PM || (exports.PM = PM = {}));
// Cache for resolved paths
const pmPathCache = {
    [PM.NPM]: undefined,
    [PM.YARN]: undefined,
    [PM.PNPM]: undefined,
    [PM.YARN_BERRY]: undefined,
    [PM.BUN]: undefined,
    [PM.TRAVERSAL]: undefined,
};
function resolveCommand(pm) {
    const fallback = pm === PM.YARN_BERRY ? "yarn" : pm;
    if (process.platform !== "win32") {
        return fallback;
    }
    try {
        return which.sync(fallback);
    }
    catch {
        // If `which` fails (not found), still return the fallback string
        return fallback;
    }
}
function getPackageManagerCommand(pm) {
    if (pmPathCache[pm] !== undefined) {
        return pmPathCache[pm];
    }
    const resolved = resolveCommand(pm);
    pmPathCache[pm] = resolved;
    return resolved;
}
async function detectPackageManager(searchPaths) {
    var _a, _b;
    let pm = null;
    const dedupedPaths = Array.from(new Set(searchPaths)); // reduce file operations, dedupe paths since primary use case has projectDir === appDir
    const resolveIfYarn = (pm, version, cwd) => (pm === PM.YARN ? detectYarnBerry(cwd, version) : pm);
    for (const dir of dedupedPaths) {
        const packageJsonPath = path.join(dir, "package.json");
        const packageManager = (await (0, builder_util_1.exists)(packageJsonPath)) ? (_a = (await fs.readJson(packageJsonPath, "utf8"))) === null || _a === void 0 ? void 0 : _a.packageManager : undefined;
        if (packageManager) {
            const [pm, version] = packageManager.split("@");
            if (Object.values(PM).includes(pm)) {
                const resolvedPackageManager = await resolveIfYarn(pm, version, dir);
                return { pm: resolvedPackageManager, corepackConfig: packageManager, resolvedDirectory: dir, detectionMethod: "packageManager field" };
            }
        }
        pm = await detectPackageManagerByFile(dir);
        if (pm) {
            const resolvedPackageManager = await resolveIfYarn(pm, "", dir);
            return { pm: resolvedPackageManager, resolvedDirectory: dir, corepackConfig: undefined, detectionMethod: "lock file" };
        }
    }
    pm = detectPackageManagerByEnv() || PM.NPM;
    const cwd = process.env.npm_package_json ? path.dirname(process.env.npm_package_json) : ((_b = process.env.INIT_CWD) !== null && _b !== void 0 ? _b : process.cwd());
    const resolvedPackageManager = await resolveIfYarn(pm, "", cwd);
    builder_util_1.log.info({ resolvedPackageManager, detected: cwd }, "packageManager not detected by file, falling back to environment detection");
    return { pm: resolvedPackageManager, resolvedDirectory: undefined, corepackConfig: undefined, detectionMethod: "process environment" };
}
function detectPackageManagerByEnv() {
    const priorityChecklist = [(key) => { var _a; return (_a = process.env.npm_config_user_agent) === null || _a === void 0 ? void 0 : _a.includes(key); }, (key) => { var _a; return (_a = process.env.npm_execpath) === null || _a === void 0 ? void 0 : _a.includes(key); }];
    const pms = Object.values(PM).filter(pm => pm !== PM.YARN_BERRY);
    for (const checker of priorityChecklist) {
        for (const pm of pms) {
            if (checker(pm)) {
                return pm;
            }
        }
    }
    return null;
}
async function detectPackageManagerByFile(dir) {
    const has = (file) => (0, builder_util_1.exists)(path.join(dir, file));
    const detected = [];
    if (await has("yarn.lock")) {
        detected.push(PM.YARN);
    }
    if (await has("pnpm-lock.yaml")) {
        detected.push(PM.PNPM);
    }
    if (await has("package-lock.json")) {
        detected.push(PM.NPM);
    }
    if ((await has("bun.lock")) || (await has("bun.lockb"))) {
        detected.push(PM.BUN);
    }
    if (detected.length === 1) {
        return detected[0];
    }
    return null;
}
async function detectYarnBerry(cwd, version) {
    var _a, _b, _c;
    const checkBerry = () => {
        try {
            if (parseInt(version.split(".")[0]) > 1) {
                return PM.YARN_BERRY;
            }
        }
        catch (_error) {
            builder_util_1.log.debug({ error: _error }, "cannot determine yarn version, assuming yarn v1");
            // If `yarn` is not found or another error occurs, fall back to the regular Yarn since we're already determined in a Yarn project
        }
        return undefined;
    };
    if (version === "latest" || version === "berry") {
        return PM.YARN_BERRY;
    }
    if (version.length > 0) {
        return (_a = checkBerry()) !== null && _a !== void 0 ? _a : PM.YARN;
    }
    const lockPath = path.join(cwd, "yarn.lock");
    if (!(await (0, builder_util_1.exists)(lockPath))) {
        return (_b = checkBerry()) !== null && _b !== void 0 ? _b : PM.YARN;
    }
    // Read the first few lines of yarn.lock to determine the version
    const firstBytes = (await fs.readFile(lockPath, "utf8")).split("\n").slice(0, 10).join("\n");
    // Yarn v2+ (Berry) has a "__metadata:" block near the top
    if (firstBytes.includes("__metadata:")) {
        return PM.YARN_BERRY;
    }
    // Yarn v1 format is classic semi-YAML with comment header
    if (firstBytes.includes("DO NOT EDIT THIS FILE DIRECTLY.")) {
        return PM.YARN;
    }
    return (_c = checkBerry()) !== null && _c !== void 0 ? _c : PM.YARN;
}
//# sourceMappingURL=packageManager.js.map
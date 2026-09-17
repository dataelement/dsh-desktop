"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installOrRebuild = installOrRebuild;
exports.getGypEnv = getGypEnv;
exports.installDependencies = installDependencies;
exports.nodeGypRebuild = nodeGypRebuild;
exports.rebuild = rebuild;
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const os_1 = require("os");
const path = require("path");
const node_module_collector_1 = require("../node-module-collector");
const packageManager_1 = require("../node-module-collector/packageManager");
const rebuild_1 = require("./rebuild");
const which = require("which");
async function installOrRebuild(config, { appDir, projectDir, workspaceRoot }, options, forceInstall = false, env) {
    const effectiveOptions = {
        buildFromSource: config.buildDependenciesFromSource === true,
        additionalArgs: (0, builder_util_1.asArray)(config.npmArgs),
        ...options,
    };
    let isDependenciesInstalled = false;
    const dirsToCheck = [...new Set([projectDir, appDir, workspaceRoot].filter((d) => !!d))];
    for (const fileOrDir of ["node_modules", ".pnp.js"]) {
        if ((await Promise.all(dirsToCheck.map(d => (0, fs_extra_1.pathExists)(path.join(d, fileOrDir))))).some(Boolean)) {
            isDependenciesInstalled = true;
            break;
        }
    }
    if (forceInstall || !isDependenciesInstalled) {
        await installDependencies(config, { appDir, projectDir, workspaceRoot }, effectiveOptions, env);
    }
    else {
        await rebuild(config, { appDir, projectDir, workspaceRoot }, effectiveOptions);
    }
}
function getElectronGypCacheDir() {
    return path.join((0, os_1.homedir)(), ".electron-gyp");
}
function getGypEnv(frameworkInfo, platform, arch, buildFromSource) {
    const npmConfigArch = arch === "armv7l" ? "arm" : arch;
    const common = {
        ...(0, builder_util_1.stripSensitiveEnvVars)(process.env),
        npm_config_arch: npmConfigArch,
        npm_config_target_arch: npmConfigArch,
        npm_config_platform: platform,
        npm_config_build_from_source: buildFromSource,
        // required for node-pre-gyp
        npm_config_target_platform: platform,
        npm_config_update_binary: true,
        npm_config_fallback_to_build: true,
    };
    if (platform !== process.platform) {
        common.npm_config_force = "true";
    }
    if (platform === "win32" || platform === "darwin") {
        common.npm_config_target_libc = "unknown";
    }
    if (!frameworkInfo.useCustomDist) {
        return common;
    }
    // https://github.com/nodejs/node-gyp/issues/21
    return {
        ...common,
        npm_config_disturl: common.npm_config_electron_mirror || "https://electronjs.org/headers",
        npm_config_target: frameworkInfo.version,
        npm_config_runtime: "electron",
        npm_config_devdir: getElectronGypCacheDir(),
    };
}
async function installDependencies(config, { appDir, projectDir, workspaceRoot }, options, env) {
    const platform = options.platform || process.platform;
    const arch = options.arch || process.arch;
    const additionalArgs = options.additionalArgs;
    const searchPaths = [projectDir, appDir].concat(workspaceRoot ? [workspaceRoot] : []);
    const { pm, resolvedDirectory: _resolvedWorkspaceDir } = await (0, packageManager_1.detectPackageManager)(searchPaths);
    builder_util_1.log.info({ pm, platform, arch, projectDir, appDir, workspaceRoot: _resolvedWorkspaceDir }, "installing dependencies");
    const execArgs = ["install"];
    if (pm === node_module_collector_1.PM.YARN) {
        execArgs.push("--prefer-offline");
    }
    else if (pm === node_module_collector_1.PM.YARN_BERRY) {
        if (process.env.NPM_NO_BIN_LINKS === "true") {
            execArgs.push("--no-bin-links");
        }
    }
    const execPath = (0, node_module_collector_1.getPackageManagerCommand)(pm);
    if (additionalArgs != null) {
        execArgs.push(...additionalArgs);
    }
    const spawnEnv = {
        ...getGypEnv(options.frameworkInfo, platform, arch, options.buildFromSource === true),
        ...env,
    };
    await (0, builder_util_1.retry)(() => (0, builder_util_1.spawn)(execPath, execArgs, { cwd: appDir, env: spawnEnv }), {
        retries: 3,
        interval: 1000,
        backoff: 2000,
        shouldRetry: (e) => {
            var _a;
            const isTransient = /ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED/.test((_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : "");
            if (isTransient) {
                builder_util_1.log.warn({ error: String(e === null || e === void 0 ? void 0 : e.message).split("\n")[0] }, "transient network error during package install, retrying");
            }
            return isTransient;
        },
    });
    // Some native dependencies no longer use `install` hook for building their native module, (yarn 3+ removed implicit link of `install` and `rebuild` steps)
    // https://github.com/electron-userland/electron-builder/issues/8024
    return rebuild(config, { appDir, projectDir, workspaceRoot }, options);
}
async function nodeGypRebuild(platform, arch, frameworkInfo) {
    builder_util_1.log.info({ platform, arch }, "executing node-gyp rebuild");
    // this script must be used only for electron
    const nodeGyp = process.platform === "win32" ? which.sync("node-gyp") : "node-gyp";
    const args = ["rebuild"];
    // headers of old Electron versions do not have a valid config.gypi file
    // and --force-process-config must be passed to node-gyp >= 8.4.0 to
    // correctly build modules for them.
    // see also https://github.com/nodejs/node-gyp/pull/2497
    const [major, minor] = frameworkInfo.version
        .split(".")
        .slice(0, 2)
        .map(n => parseInt(n, 10));
    if (major <= 13 || (major == 14 && minor <= 1) || (major == 15 && minor <= 2)) {
        args.push("--force-process-config");
    }
    await (0, builder_util_1.spawn)(nodeGyp, args, { env: getGypEnv(frameworkInfo, platform, arch, true) });
}
/** @internal */
async function rebuild(config, { appDir, projectDir, workspaceRoot }, options) {
    const buildFromSource = options.buildFromSource === true;
    const platform = options.platform || process.platform;
    const arch = options.arch || process.arch;
    const { frameworkInfo: { version: electronVersion }, } = options;
    const projectRootPath = workspaceRoot || projectDir || appDir;
    const logInfo = {
        electronVersion,
        arch,
        buildFromSource,
        workspaceRoot,
        projectDir: builder_util_1.log.filePath(projectDir) || "./",
        appDir: builder_util_1.log.filePath(appDir) || "./",
    };
    builder_util_1.log.info(logInfo, "executing @electron/rebuild");
    // "legacy" previously used the app-builder-bin Go binary; it now maps to sequential @electron/rebuild.
    const mode = config.nativeRebuilder === "legacy" || !config.nativeRebuilder ? "sequential" : config.nativeRebuilder;
    const rebuildOptions = {
        buildPath: appDir,
        electronVersion,
        arch,
        platform,
        buildFromSource,
        projectRootPath,
        mode,
        disablePreGypCopy: true,
    };
    return (0, rebuild_1.rebuild)(rebuildOptions);
}
//# sourceMappingURL=yarn.js.map
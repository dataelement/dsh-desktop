"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinPackager = exports.PublishManager = exports.PlatformPackager = exports.MacPackager = exports.LinuxPackager = exports.buildForge = exports.WindowsSignToolManager = exports.CancellationToken = exports.Packager = exports.Target = exports.Platform = exports.DIR_TARGET = exports.DEFAULT_TARGET = exports.AppInfo = exports.getArchSuffix = exports.archFromString = exports.Arch = void 0;
exports.checkBuildRequestOptions = checkBuildRequestOptions;
exports.build = build;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const packager_1 = require("./packager");
const PublishManager_1 = require("./publish/PublishManager");
const resolve_1 = require("./util/resolve");
var builder_util_2 = require("builder-util");
Object.defineProperty(exports, "Arch", { enumerable: true, get: function () { return builder_util_2.Arch; } });
Object.defineProperty(exports, "archFromString", { enumerable: true, get: function () { return builder_util_2.archFromString; } });
Object.defineProperty(exports, "getArchSuffix", { enumerable: true, get: function () { return builder_util_2.getArchSuffix; } });
var appInfo_1 = require("./appInfo");
Object.defineProperty(exports, "AppInfo", { enumerable: true, get: function () { return appInfo_1.AppInfo; } });
var core_1 = require("./core");
Object.defineProperty(exports, "DEFAULT_TARGET", { enumerable: true, get: function () { return core_1.DEFAULT_TARGET; } });
Object.defineProperty(exports, "DIR_TARGET", { enumerable: true, get: function () { return core_1.DIR_TARGET; } });
Object.defineProperty(exports, "Platform", { enumerable: true, get: function () { return core_1.Platform; } });
Object.defineProperty(exports, "Target", { enumerable: true, get: function () { return core_1.Target; } });
var packager_2 = require("./packager");
Object.defineProperty(exports, "Packager", { enumerable: true, get: function () { return packager_2.Packager; } });
var builder_util_runtime_2 = require("builder-util-runtime");
Object.defineProperty(exports, "CancellationToken", { enumerable: true, get: function () { return builder_util_runtime_2.CancellationToken; } });
var windowsSignToolManager_1 = require("./codeSign/windowsSignToolManager");
Object.defineProperty(exports, "WindowsSignToolManager", { enumerable: true, get: function () { return windowsSignToolManager_1.WindowsSignToolManager; } });
var forge_maker_1 = require("./forge-maker");
Object.defineProperty(exports, "buildForge", { enumerable: true, get: function () { return forge_maker_1.buildForge; } });
var linuxPackager_1 = require("./linuxPackager");
Object.defineProperty(exports, "LinuxPackager", { enumerable: true, get: function () { return linuxPackager_1.LinuxPackager; } });
var macPackager_1 = require("./macPackager");
Object.defineProperty(exports, "MacPackager", { enumerable: true, get: function () { return macPackager_1.MacPackager; } });
var platformPackager_1 = require("./platformPackager");
Object.defineProperty(exports, "PlatformPackager", { enumerable: true, get: function () { return platformPackager_1.PlatformPackager; } });
var PublishManager_2 = require("./publish/PublishManager");
Object.defineProperty(exports, "PublishManager", { enumerable: true, get: function () { return PublishManager_2.PublishManager; } });
var winPackager_1 = require("./winPackager");
Object.defineProperty(exports, "WinPackager", { enumerable: true, get: function () { return winPackager_1.WinPackager; } });
const expectedOptions = new Set(["publish", "targets", "mac", "win", "linux", "projectDir", "platformPackagerFactory", "config", "effectiveOptionComputed", "prepackaged"]);
function checkBuildRequestOptions(options) {
    for (const optionName of Object.keys(options)) {
        if (!expectedOptions.has(optionName) && options[optionName] !== undefined) {
            throw new builder_util_1.InvalidConfigurationError(`Unknown option "${optionName}"`);
        }
    }
}
function build(options, packager = new packager_1.Packager(options)) {
    checkBuildRequestOptions(options);
    const publishManager = new PublishManager_1.PublishManager(packager, options);
    const sigIntHandler = () => {
        builder_util_1.log.warn("cancelled by SIGINT");
        packager.cancellationToken.cancel();
        publishManager.cancelTasks();
    };
    process.once("SIGINT", sigIntHandler);
    const promise = packager.build().then(async (buildResult) => {
        const afterAllArtifactBuild = await (0, resolve_1.resolveFunction)(packager.appInfo.type, buildResult.configuration.afterAllArtifactBuild, "afterAllArtifactBuild", await packager.getWorkspaceRoot());
        if (afterAllArtifactBuild != null) {
            const newArtifacts = (0, builder_util_runtime_1.asArray)(await Promise.resolve(afterAllArtifactBuild(buildResult)));
            if (newArtifacts.length === 0 || !publishManager.isPublish) {
                return buildResult.artifactPaths;
            }
            const publishConfigurations = await publishManager.getGlobalPublishConfigurations();
            if (publishConfigurations == null || publishConfigurations.length === 0) {
                return buildResult.artifactPaths;
            }
            for (const newArtifact of newArtifacts) {
                if (buildResult.artifactPaths.includes(newArtifact)) {
                    builder_util_1.log.warn({ newArtifact }, "skipping publish of artifact, already published");
                    continue;
                }
                buildResult.artifactPaths.push(newArtifact);
                for (const publishConfiguration of publishConfigurations) {
                    await publishManager.scheduleUpload(publishConfiguration, {
                        file: newArtifact,
                        arch: null,
                    }, packager.appInfo);
                }
            }
        }
        return buildResult.artifactPaths;
    });
    return (0, builder_util_1.executeFinally)(promise, isErrorOccurred => {
        let promise;
        if (isErrorOccurred) {
            publishManager.cancelTasks();
            promise = Promise.resolve(null);
        }
        else {
            promise = publishManager.awaitTasks();
        }
        return promise.then(() => {
            packager.clearPackagerEventListeners();
            process.removeListener("SIGINT", sigIntHandler);
        });
    });
}
//# sourceMappingURL=index.js.map
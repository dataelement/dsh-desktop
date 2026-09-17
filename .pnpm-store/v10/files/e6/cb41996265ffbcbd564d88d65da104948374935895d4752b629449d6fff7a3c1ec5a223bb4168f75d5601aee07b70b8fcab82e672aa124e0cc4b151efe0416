"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUpdateInfoTasks = createUpdateInfoTasks;
exports.writeUpdateInfoFiles = writeUpdateInfoFiles;
const tiny_async_pool_1 = require("tiny-async-pool");
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const lazy_val_1 = require("lazy-val");
const path = require("path");
const semver = require("semver");
const core_1 = require("../core");
const hash_1 = require("../util/hash");
const PublishManager_1 = require("./PublishManager");
async function getReleaseInfo(packager) {
    const releaseInfo = { ...(packager.platformSpecificBuildOptions.releaseInfo || packager.config.releaseInfo) };
    if (releaseInfo.releaseNotes == null) {
        const releaseNotesFile = await packager.getResource(releaseInfo.releaseNotesFile, `release-notes-${packager.platform.buildConfigurationKey}.md`, `release-notes-${packager.platform.name}.md`, `release-notes-${packager.platform.nodeName}.md`, "release-notes.md");
        const releaseNotes = releaseNotesFile == null ? null : await (0, fs_extra_1.readFile)(releaseNotesFile, "utf-8");
        // to avoid undefined in the file, check for null
        if (releaseNotes != null) {
            releaseInfo.releaseNotes = releaseNotes;
        }
    }
    delete releaseInfo.releaseNotesFile;
    return releaseInfo;
}
function isGenerateUpdatesFilesForAllChannels(packager) {
    const value = packager.platformSpecificBuildOptions.generateUpdatesFilesForAllChannels;
    return value == null ? packager.config.generateUpdatesFilesForAllChannels : value;
}
/**
 if this is an "alpha" version, we need to generate only the "alpha" .yml file
 if this is a "beta" version, we need to generate both the "alpha" and "beta" .yml file
 if this is a "stable" version, we need to generate all the "alpha", "beta" and "stable" .yml file
 */
function computeChannelNames(packager, publishConfig) {
    const currentChannel = publishConfig.channel || "latest";
    // for GitHub should be pre-release way be used
    if (currentChannel === "alpha" || publishConfig.provider === "github" || !isGenerateUpdatesFilesForAllChannels(packager)) {
        return [currentChannel];
    }
    switch (currentChannel) {
        case "beta":
            return [currentChannel, "alpha"];
        case "latest":
            return [currentChannel, "alpha", "beta"];
        default:
            return [currentChannel];
    }
}
function getUpdateInfoFileName(channel, packager, arch) {
    const osSuffix = packager.platform === core_1.Platform.WINDOWS ? "" : `-${packager.platform.buildConfigurationKey}`;
    return `${channel}${osSuffix}${getArchPrefixForUpdateFile(arch, packager)}.yml`;
}
function getArchPrefixForUpdateFile(arch, packager) {
    if (arch == null || arch === builder_util_1.Arch.x64 || packager.platform !== core_1.Platform.LINUX) {
        return "";
    }
    return arch === builder_util_1.Arch.armv7l ? "-arm" : `-${builder_util_1.Arch[arch]}`;
}
function computeIsisElectronUpdater1xCompatibility(updaterCompatibility, publishConfiguration, packager) {
    if (updaterCompatibility != null) {
        return semver.satisfies("1.0.0", updaterCompatibility);
    }
    // spaces is a new publish provider, no need to keep backward compatibility
    if (publishConfiguration.provider === "spaces") {
        return false;
    }
    const updaterVersion = packager.metadata.dependencies == null ? null : packager.metadata.dependencies["electron-updater"];
    return updaterVersion == null || semver.lt(updaterVersion, "4.0.0");
}
async function createUpdateInfoTasks(event, _publishConfigs) {
    const packager = event.packager;
    const publishConfigs = await (0, PublishManager_1.getPublishConfigsForUpdateInfo)(packager, _publishConfigs, event.arch);
    if (publishConfigs == null || publishConfigs.length === 0) {
        return [];
    }
    const outDir = event.target.outDir;
    const version = packager.appInfo.version;
    const sha2 = new lazy_val_1.Lazy(() => (0, hash_1.hashFile)(event.file, "sha256", "hex"));
    const isMac = packager.platform === core_1.Platform.MAC;
    const createdFiles = new Set();
    const sharedInfo = await createUpdateInfo(version, event, await getReleaseInfo(packager));
    const tasks = [];
    const electronUpdaterCompatibility = packager.platformSpecificBuildOptions.electronUpdaterCompatibility || packager.config.electronUpdaterCompatibility || ">=2.15";
    for (const publishConfiguration of publishConfigs) {
        let dir = outDir;
        if (publishConfigs.length > 1 && publishConfiguration !== publishConfigs[0]) {
            dir = path.join(outDir, publishConfiguration.provider);
        }
        let isElectronUpdater1xCompatibility = computeIsisElectronUpdater1xCompatibility(electronUpdaterCompatibility, publishConfiguration, packager.info);
        let info = sharedInfo;
        // noinspection JSDeprecatedSymbols
        if (isElectronUpdater1xCompatibility && packager.platform === core_1.Platform.WINDOWS) {
            info = {
                ...info,
            };
            info.sha2 = await sha2.value;
        }
        if (event.safeArtifactName != null && publishConfiguration.provider === "github") {
            const newFiles = info.files.slice();
            newFiles[0].url = event.safeArtifactName;
            info = {
                ...info,
                files: newFiles,
                path: event.safeArtifactName,
            };
        }
        for (const channel of computeChannelNames(packager, publishConfiguration)) {
            if (isMac && isElectronUpdater1xCompatibility && event.file.endsWith(".zip")) {
                // write only for first channel (generateUpdatesFilesForAllChannels is a new functionality, no need to generate old mac update info file)
                isElectronUpdater1xCompatibility = false;
                await writeOldMacInfo(publishConfiguration, outDir, dir, channel, createdFiles, version, packager);
            }
            const updateInfoFile = path.join(dir, getUpdateInfoFileName(channel, packager, event.arch));
            if (createdFiles.has(updateInfoFile)) {
                continue;
            }
            createdFiles.add(updateInfoFile);
            // artifact should be uploaded only to designated publish provider
            tasks.push({
                file: updateInfoFile,
                info,
                publishConfiguration,
                packager,
                arch: event.arch,
            });
        }
    }
    return tasks;
}
async function createUpdateInfo(version, event, releaseInfo) {
    const customUpdateInfo = event.updateInfo;
    const url = path.basename(event.file);
    const sha512 = (customUpdateInfo == null ? null : customUpdateInfo.sha512) || (await (0, hash_1.hashFile)(event.file));
    const files = [{ url, sha512 }];
    const result = {
        // @ts-ignore
        version,
        // @ts-ignore
        files,
        // @ts-ignore
        path: url /* backward compatibility, electron-updater 1.x - electron-updater 2.15.0 */,
        // @ts-ignore
        sha512 /* backward compatibility, electron-updater 1.x - electron-updater 2.15.0 */,
        ...releaseInfo,
    };
    if (customUpdateInfo != null) {
        // file info or nsis web installer packages info
        Object.assign("sha512" in customUpdateInfo ? files[0] : result, customUpdateInfo);
    }
    return result;
}
async function writeUpdateInfoFiles(updateInfoFileTasks, packager) {
    // zip must be first and zip info must be used for old path/sha512 properties in the update info
    // universal installer (arch === null) must precede arch-specific ones so path:/sha512: point to the right artifact
    updateInfoFileTasks.sort((a, b) => {
        var _a, _b;
        const zipDiff = (a.info.files[0].url.endsWith(".zip") ? 0 : 100) - (b.info.files[0].url.endsWith(".zip") ? 0 : 100);
        if (zipDiff !== 0) {
            return zipDiff;
        }
        // universal (arch === null) before arch-specific; tie-break by Arch enum value for full determinism
        // undefined arch (external callers predating this field) treated as arch-specific via strict === null check
        const aArch = a.arch === null ? -1 : ((_a = a.arch) !== null && _a !== void 0 ? _a : Number.MAX_SAFE_INTEGER);
        const bArch = b.arch === null ? -1 : ((_b = b.arch) !== null && _b !== void 0 ? _b : Number.MAX_SAFE_INTEGER);
        return aArch - bArch;
    });
    const updateChannelFileToInfo = new Map();
    for (const task of updateInfoFileTasks) {
        // https://github.com/electron-userland/electron-builder/pull/2994
        const key = `${task.file}@${(0, builder_util_1.safeStringifyJson)(task.publishConfiguration, new Set(["releaseType"]))}`;
        const existingTask = updateChannelFileToInfo.get(key);
        if (existingTask == null) {
            updateChannelFileToInfo.set(key, task);
            continue;
        }
        existingTask.info.files.push(...task.info.files);
    }
    const releaseDate = new Date().toISOString();
    const concurrency = 4;
    await (0, tiny_async_pool_1.default)(concurrency, Array.from(updateChannelFileToInfo.values()), async (task) => {
        const publishConfig = task.publishConfiguration;
        if (publishConfig.publishAutoUpdate === false) {
            builder_util_1.log.debug({
                provider: publishConfig.provider,
                reason: "publishAutoUpdate is set to false",
            }, "auto update metadata file not published");
            return;
        }
        if (task.info.releaseDate == null) {
            task.info.releaseDate = releaseDate;
        }
        const fileContent = Buffer.from((0, builder_util_1.serializeToYaml)(task.info, false, true));
        await (0, fs_extra_1.outputFile)(task.file, fileContent);
        await packager.emitArtifactCreated({
            file: task.file,
            fileContent,
            arch: null,
            packager: task.packager,
            target: null,
            publishConfig,
        });
    });
}
// backward compatibility - write json file
async function writeOldMacInfo(publishConfig, outDir, dir, channel, createdFiles, version, packager) {
    const isGitHub = publishConfig.provider === "github";
    const updateInfoFile = isGitHub && outDir === dir ? path.join(dir, "github", `${channel}-mac.json`) : path.join(dir, `${channel}-mac.json`);
    if (!createdFiles.has(updateInfoFile)) {
        createdFiles.add(updateInfoFile);
        await (0, fs_extra_1.outputJson)(updateInfoFile, {
            version,
            releaseDate: new Date().toISOString(),
            url: (0, PublishManager_1.computeDownloadUrl)(publishConfig, packager.generateName2("zip", "mac", isGitHub), packager),
        }, { spaces: 2 });
        await packager.info.emitArtifactCreated({
            file: updateInfoFile,
            arch: null,
            packager,
            target: null,
            publishConfig,
        });
    }
}
//# sourceMappingURL=updateInfoBuilder.js.map
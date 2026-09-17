"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibUiFramework = exports.LAUNCHUI_DEFAULT_VERSION = void 0;
exports.validateShellEmbeddable = validateShellEmbeddable;
exports.getNodeJsDownloadParams = getNodeJsDownloadParams;
exports.downloadNodeJsBinary = downloadNodeJsBinary;
exports.fetchNodeJsChecksum = fetchNodeJsChecksum;
exports.getLaunchUiDownloadParams = getLaunchUiDownloadParams;
exports.downloadLaunchUiDir = downloadLaunchUiDir;
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const promises_1 = require("fs/promises");
const https = require("https");
const path = require("path");
const core_1 = require("../core");
const electronGet_1 = require("../util/electronGet");
const plist_1 = require("../util/plist");
/** Validates that a value is safe to embed in a double-quoted shell string (no metacharacters). */
function validateShellEmbeddable(value, fieldName) {
    // Allow letters, digits, dots, underscores, hyphens, forward slashes, and spaces.
    // Reject anything that could be interpreted as a shell metacharacter when embedded
    // inside a double-quoted string: $, `, ", \, and newlines.
    if (/[$`"\\\n]/.test(value)) {
        throw new builder_util_1.InvalidConfigurationError(`${fieldName} contains characters that are not safe in shell scripts: ${JSON.stringify(value)}. ` + `Avoid $, backtick, double-quote, backslash, and newline characters.`);
    }
}
// LaunchUI version is independent of the Node.js version; this was the hardcoded default in the Go binary.
// https://github.com/develar/app-builder/blob/master/pkg/package-format/proton-native/protonNative.go#L105-L136
exports.LAUNCHUI_DEFAULT_VERSION = "0.1.4-10.13.0";
// https://github.com/develar/launchui/releases/tag/v0.1.4-10.13.0
const launchUiChecksums = {
    "launchui-v0.1.4-10.13.0-linux-x64.7z": "4fb5cd8ed79e1e24e0f5cf4b26107f2fa6f6fd8dc48ecd18fb6f48f3ccfe9ee6",
    "launchui-v0.1.4-10.13.0-win32-ia32.7z": "682734da3d817ac365093c6c8ef3d9a70cc3f2a809e4588cb12a311358a68a2d",
    "launchui-v0.1.4-10.13.0-win32-x64.7z": "2f26629c5f5c12baeff272ac7855a1df7f27621cce782b79965f9a9b5eccc359",
};
class LibUiFramework {
    constructor(version, macOsProductName, isUseLaunchUi) {
        this.version = version;
        this.macOsProductName = macOsProductName;
        this.isUseLaunchUi = isUseLaunchUi;
        this.name = "libui";
        // noinspection JSUnusedGlobalSymbols
        this.macOsDefaultTargets = ["dmg"];
        this.defaultAppIdPrefix = "com.libui.";
        // noinspection JSUnusedGlobalSymbols
        this.isCopyElevateHelper = false;
        // noinspection JSUnusedGlobalSymbols
        this.isNpmRebuildRequired = false;
        this.launchUiVersion = exports.LAUNCHUI_DEFAULT_VERSION;
    }
    get distMacOsAppName() {
        return `${this.macOsProductName}.app`;
    }
    async prepareApplicationStageDirectory(options) {
        await (0, fs_extra_1.emptyDir)(options.appOutDir);
        const packager = options.packager;
        const platform = packager.platform;
        if (this.isUseLaunchUiForPlatform(platform)) {
            const appOutDir = options.appOutDir;
            const launchUiDir = await downloadLaunchUiDir(this.launchUiVersion, platform, options.arch);
            await (0, fs_extra_1.copy)(launchUiDir, appOutDir);
            const skeletonExe = `launchui${platform === core_1.Platform.WINDOWS ? ".exe" : ""}`;
            const executableName = `${packager.appInfo.productFilename}${platform === core_1.Platform.WINDOWS ? ".exe" : ""}`;
            await (0, promises_1.rename)(path.join(appOutDir, skeletonExe), path.join(appOutDir, executableName));
            return;
        }
        if (platform === core_1.Platform.MAC) {
            await this.prepareMacosApplicationStageDirectory(packager, options);
        }
        else if (platform === core_1.Platform.LINUX) {
            await this.prepareLinuxApplicationStageDirectory(options);
        }
    }
    async prepareMacosApplicationStageDirectory(packager, options) {
        const appContentsDir = path.join(options.appOutDir, this.distMacOsAppName, "Contents");
        await (0, promises_1.mkdir)(path.join(appContentsDir, "Resources"), { recursive: true });
        await (0, promises_1.mkdir)(path.join(appContentsDir, "MacOS"), { recursive: true });
        const nodeBinaryMac = await downloadNodeJsBinary(this.version, core_1.Platform.MAC, "x64");
        await (0, promises_1.copyFile)(nodeBinaryMac, path.join(appContentsDir, "MacOS", "node"));
        await (0, promises_1.chmod)(path.join(appContentsDir, "MacOS", "node"), 0o755);
        const appPlist = {
            // https://github.com/albe-rosado/create-proton-app/issues/13
            NSHighResolutionCapable: true,
        };
        await packager.applyCommonInfo(appPlist, appContentsDir);
        await (0, plist_1.savePlistFile)(path.join(appContentsDir, "Info.plist"), appPlist);
        const macMain = options.packager.info.metadata.main || "index.js";
        validateShellEmbeddable(macMain, "package.json main");
        await writeExecutableMain(path.join(appContentsDir, "MacOS", appPlist.CFBundleExecutable), `#!/bin/sh
  DIR=$(dirname "$0")
  "$DIR/node" "$DIR/../Resources/app/${macMain}"
  `);
    }
    async prepareLinuxApplicationStageDirectory(options) {
        const appOutDir = options.appOutDir;
        const nodeBinaryLinux = await downloadNodeJsBinary(this.version, core_1.Platform.LINUX, options.arch);
        await (0, promises_1.copyFile)(nodeBinaryLinux, path.join(appOutDir, "node"));
        await (0, promises_1.chmod)(path.join(appOutDir, "node"), 0o755);
        const mainPath = path.join(appOutDir, options.packager.executableName);
        const linuxMain = options.packager.info.metadata.main || "index.js";
        validateShellEmbeddable(linuxMain, "package.json main");
        await writeExecutableMain(mainPath, `#!/bin/sh
  DIR=$(dirname "$0")
  "$DIR/node" "$DIR/app/${linuxMain}"
  `);
    }
    async afterPack(context) {
        const packager = context.packager;
        if (!this.isUseLaunchUiForPlatform(packager.platform)) {
            return;
        }
        // LaunchUI requires main.js, rename if need
        const userMain = packager.info.metadata.main || "index.js";
        if (userMain === "main.js") {
            return;
        }
        await (0, promises_1.rename)(path.join(context.appOutDir, "app", userMain), path.join(context.appOutDir, "app", "main.js"));
    }
    getMainFile(platform) {
        return this.isUseLaunchUiForPlatform(platform) ? "main.js" : null;
    }
    isUseLaunchUiForPlatform(platform) {
        return platform === core_1.Platform.WINDOWS || (this.isUseLaunchUi && platform === core_1.Platform.LINUX);
    }
    getExcludedDependencies(platform) {
        // part of launchui
        return this.isUseLaunchUiForPlatform(platform) ? ["libui-node"] : null;
    }
}
exports.LibUiFramework = LibUiFramework;
async function writeExecutableMain(file, content) {
    await (0, promises_1.writeFile)(file, content, { mode: 0o755 });
    await (0, promises_1.chmod)(file, 0o755);
}
function getNodeJsDownloadParams(version, platform, arch) {
    const isWindows = platform === core_1.Platform.WINDOWS;
    const nodePlatform = isWindows ? "win" : platform === core_1.Platform.MAC ? "darwin" : "linux";
    const nodeArch = isWindows && arch === "ia32" ? "x86" : arch;
    const format = isWindows ? "zip" : "tar.gz";
    const filenameWithExt = `node-v${version}-${nodePlatform}-${nodeArch}.${format}`;
    // tar.gz: strip:1 moves node-v.../bin/node → bin/node in extractDir
    // zip: no strip, node.exe lives under the top-level dir node-v{version}-win-{arch}/
    const binaryRelPath = isWindows ? path.join(`node-v${version}-win-${nodeArch}`, "node.exe") : path.join("bin", "node");
    return { releaseName: `nodejs-v${version}`, filenameWithExt, overrideUrl: `https://nodejs.org/dist/v${version}`, binaryRelPath };
}
async function downloadNodeJsBinary(version, platform, arch) {
    const { releaseName, filenameWithExt, overrideUrl, binaryRelPath } = getNodeJsDownloadParams(version, platform, arch);
    const sha256 = await fetchNodeJsChecksum(version, filenameWithExt);
    const checksums = { [filenameWithExt]: sha256 };
    const extractDir = await (0, electronGet_1.downloadBuilderToolset)({ releaseName, filenameWithExt, overrideUrl, checksums });
    return path.join(extractDir, binaryRelPath);
}
/**
 * Fetches the SHA-256 hex digest for a specific Node.js distribution file from
 * the official nodejs.org SHASUMS256.txt, preventing MITM substitution attacks.
 */
async function fetchNodeJsChecksum(version, filename) {
    const url = `https://nodejs.org/dist/v${version}/SHASUMS256.txt`;
    return new Promise((resolve, reject) => {
        https
            .get(url, { headers: { "User-Agent": "electron-builder" } }, res => {
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`HTTP ${res.statusCode} fetching Node.js SHASUMS256.txt for v${version}`));
                return;
            }
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
                const text = Buffer.concat(chunks).toString("utf8");
                for (const line of text.split("\n")) {
                    const m = line.match(/^([0-9a-f]{64})\s+(.+)$/);
                    if (m != null && m[2].trim() === filename) {
                        resolve(m[1]);
                        return;
                    }
                }
                reject(new Error(`No checksum for ${filename} in Node.js v${version} SHASUMS256.txt`));
            });
            res.on("error", reject);
        })
            .on("error", reject);
    });
}
function getLaunchUiDownloadParams(version, platform, arch) {
    const launchPlatform = platform === core_1.Platform.MAC ? "mac" : platform === core_1.Platform.WINDOWS ? "win32" : "linux";
    return {
        releaseName: `v${version}`,
        filenameWithExt: `launchui-v${version}-${launchPlatform}-${arch}.7z`,
        githubOrgRepo: "develar/launchui",
        checksums: launchUiChecksums,
    };
}
async function downloadLaunchUiDir(version, platform, arch) {
    return (0, electronGet_1.downloadBuilderToolset)(getLaunchUiDownloadParams(version, platform, arch));
}
//# sourceMappingURL=LibUiFramework.js.map
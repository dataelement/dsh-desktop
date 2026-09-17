"use strict";
// Adapted from https://github.com/electron/packager/pull/1806
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAssetCatalogForIcon = generateAssetCatalogForIcon;
const builder_util_1 = require("builder-util");
const fs = require("fs/promises");
const os = require("node:os");
const path = require("node:path");
const plist = require("plist");
const semver = require("semver");
const INVALID_ACTOOL_VERSION_ERROR = new Error("Failed to check actool version. Is Xcode 26 or higher installed? See output of the `actool --version` CLI command for more details.");
async function checkActoolVersion(tmpDir) {
    const acToolOutputFileName = path.resolve(tmpDir, "actool.log");
    let versionInfo = undefined;
    let acToolOutputFile = null;
    let errorQueued = null;
    try {
        acToolOutputFile = await fs.open(acToolOutputFileName, "w");
        await (0, builder_util_1.spawn)("actool", ["--version"], { stdio: ["ignore", acToolOutputFile.fd, acToolOutputFile.fd] });
        const acToolVersionOutput = await fs.readFile(acToolOutputFileName, "utf8");
        versionInfo = plist.parse(acToolVersionOutput);
    }
    catch (e) {
        errorQueued = e;
    }
    finally {
        if (acToolOutputFile) {
            await acToolOutputFile.close();
        }
    }
    if (errorQueued || !versionInfo || !versionInfo["com.apple.actool.version"] || !versionInfo["com.apple.actool.version"]["short-bundle-version"]) {
        throw INVALID_ACTOOL_VERSION_ERROR;
    }
    const acToolVersion = versionInfo["com.apple.actool.version"]["short-bundle-version"];
    if (!semver.gte(semver.coerce(acToolVersion), "26.0.0")) {
        throw new Error(`Unsupported actool version. Must be on actool 26.0.0 or higher but found ${acToolVersion}. Install Xcode 26 or higher to get a supported version of actool.`);
    }
}
/**
 * Generates an asset catalog and extra assets that are useful for packaging the app.
 * @param inputPath The path to the `.icon` file
 * @returns The asset catalog and extra assets
 */
async function generateAssetCatalogForIcon(inputPath) {
    const tmpDir = await fs.mkdtemp(path.resolve(os.tmpdir(), "icon-compile-"));
    const cleanup = async () => {
        await fs.rm(tmpDir, {
            recursive: true,
            force: true,
        });
    };
    try {
        await checkActoolVersion(tmpDir);
    }
    catch (error) {
        await cleanup();
        throw error;
    }
    const iconPath = path.resolve(tmpDir, "Icon.icon");
    const outputPath = path.resolve(tmpDir, "out");
    try {
        await fs.cp(inputPath, iconPath, {
            recursive: true,
        });
        await fs.mkdir(outputPath, {
            recursive: true,
        });
        await (0, builder_util_1.spawn)("actool", [
            iconPath,
            "--compile",
            outputPath,
            "--output-format",
            "human-readable-text",
            "--notices",
            "--warnings",
            "--output-partial-info-plist",
            path.resolve(outputPath, "assetcatalog_generated_info.plist"),
            "--app-icon",
            "Icon",
            "--include-all-app-icons",
            "--accent-color",
            "AccentColor",
            "--enable-on-demand-resources",
            "NO",
            "--development-region",
            "en",
            "--target-device",
            "mac",
            "--minimum-deployment-target",
            "26.0",
            "--platform",
            "macosx",
        ]);
        const assetCatalog = await fs.readFile(path.resolve(outputPath, "Assets.car"));
        const icnsFile = await fs.readFile(path.resolve(outputPath, "Icon.icns"));
        return { assetCatalog, icnsFile };
    }
    finally {
        await cleanup();
    }
}
//# sourceMappingURL=macosIconComposer.js.map
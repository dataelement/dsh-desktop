"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DmgTarget = void 0;
exports.getDmgTemplatePath = getDmgTemplatePath;
exports.attachAndExecute = attachAndExecute;
exports.detach = detach;
exports.computeBackground = computeBackground;
exports.serializeString = serializeString;
exports.customizeDmg = customizeDmg;
exports.transformBackgroundFileIfNeed = transformBackgroundFileIfNeed;
exports.getImageSizeUsingSips = getImageSizeUsingSips;
const electronGet_1 = require("app-builder-lib/out/util/electronGet");
const toolsetLock_1 = require("app-builder-lib/out/util/toolsetLock");
const builder_util_1 = require("builder-util");
const promises_1 = require("fs/promises");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const hdiuil_1 = require("./hdiuil");
var dmg_1 = require("./dmg");
Object.defineProperty(exports, "DmgTarget", { enumerable: true, get: function () { return dmg_1.DmgTarget; } });
const root = path.join(__dirname, "..");
function getDmgTemplatePath() {
    return path.join(root, "templates");
}
async function getDmgVendorPath() {
    var _a;
    const customDmgbuildPath = (_a = process.env.CUSTOM_DMGBUILD_PATH) === null || _a === void 0 ? void 0 : _a.trim();
    if (customDmgbuildPath) {
        const resolvedPath = path.resolve(customDmgbuildPath);
        let dmgbuildStat;
        try {
            dmgbuildStat = await (0, promises_1.stat)(resolvedPath);
        }
        catch (e) {
            if (e.code === "ENOENT") {
                throw new Error(`CUSTOM_DMGBUILD_PATH "${resolvedPath}" does not exist`);
            }
            throw e;
        }
        if (!dmgbuildStat.isFile()) {
            throw new Error(`CUSTOM_DMGBUILD_PATH "${resolvedPath}" is not a regular file`);
        }
        builder_util_1.log.warn({ path: resolvedPath }, "using CUSTOM_DMGBUILD_PATH override for dmgbuild binary");
        return resolvedPath;
    }
    const arch = process.arch === "arm64" ? "arm64" : "x86_64";
    // https://github.com/electron-userland/electron-builder-binaries/releases?q=dmg-builder&expanded=true
    const file = await (0, electronGet_1.downloadBuilderToolset)({
        releaseName: "dmg-builder@1.2.5",
        filenameWithExt: `dmgbuild-bundle-${arch}-75c8a6c.tar.gz`,
        checksums: {
            "dmgbuild-bundle-arm64-75c8a6c.tar.gz": "793404d0c96687e27d5ee40a668d498c92e36a64d6c2906df511031adb33cbeb",
            "dmgbuild-bundle-x86_64-75c8a6c.tar.gz": "1664972f9cc2d6e8fce3b63e42cd30078aff602669c5856939c4519921200433",
        },
    });
    return path.resolve(file, "dmgbuild");
}
async function attachAndExecute(dmgPath, readWrite, forceDetach, task) {
    //noinspection SpellCheckingInspection
    const args = ["attach", "-noverify", "-noautoopen"];
    if (readWrite) {
        args.push("-readwrite");
    }
    args.push(dmgPath);
    // Pipe "y\n" to stdin so that hdiutil auto-accepts any SLA/EULA dialog
    // embedded in the DMG instead of blocking on a terminal prompt.
    const attachResult = await (0, hdiuil_1.hdiUtilWithStdin)(args, "y\n");
    // Use multiline flag so ^ matches any line start — the EULA text (if any)
    // precedes the /dev/... device lines in hdiutil's stdout output.
    const deviceResult = attachResult == null ? null : /^(\/dev\/\w+)/m.exec(attachResult);
    const device = deviceResult == null || deviceResult.length !== 2 ? null : deviceResult[1];
    if (device == null) {
        throw new Error(`Cannot mount: ${attachResult}`);
    }
    // Find the volume mount path directly from hdiutil attach output.
    // APFS images synthesize a new disk device (e.g. disk9) separate from the container disk
    // (e.g. disk8), so device-name matching via hdiutil info misses the APFS volume.
    let volumePath = null;
    for (const line of attachResult.split("\n")) {
        const match = /\s+(\/Volumes\/.+?)\s*$/.exec(line);
        if (match) {
            volumePath = match[1].trim();
            break;
        }
    }
    if (volumePath == null) {
        throw new Error(`Cannot find volume mount path for device: ${device}`);
    }
    return await (0, builder_util_1.executeFinally)(task(volumePath), () => detach(device, forceDetach));
}
async function detach(name, alwaysForce) {
    return (0, hdiuil_1.hdiUtil)(["detach", "-quiet", name]).catch(async (e) => {
        if (hdiuil_1.hdiutilTransientExitCodes.has(e.code) || alwaysForce) {
            // Delay then force unmount with verbose output
            await new Promise(resolve => setTimeout(resolve, 3000));
            return (0, hdiuil_1.hdiUtil)(["detach", "-force", name]);
        }
        throw e;
    });
}
async function computeBackground(packager) {
    const resourceList = await packager.resourceList;
    if (resourceList.includes("background.tiff")) {
        return path.join(packager.buildResourcesDir, "background.tiff");
    }
    else if (resourceList.includes("background.png")) {
        return path.join(packager.buildResourcesDir, "background.png");
    }
    else {
        return path.join(getDmgTemplatePath(), "background.tiff");
    }
}
/** @internal */
function serializeString(data) {
    return ('  $"' +
        data
            .match(/.{1,32}/g)
            .map(it => it.match(/.{1,4}/g).join(" "))
            .join('"\n  $"') +
        '"');
}
async function customizeDmg({ appPath, artifactPath, volumeName, specification, packager, licenseData }) {
    var _a, _b, _c, _d, _e, _f;
    const isValidIconTextSize = !!specification.iconTextSize && specification.iconTextSize >= 10 && specification.iconTextSize <= 16;
    const iconTextSize = isValidIconTextSize ? specification.iconTextSize : 12;
    const volumePath = path.join("/Volumes", volumeName);
    // https://github.com/electron-userland/electron-builder/issues/2115
    const settings = {
        title: path.basename(volumePath),
        "icon-size": specification.iconSize,
        "text-size": iconTextSize,
        "compression-level": Number(process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL || "9"),
        filesystem: specification.filesystem || "HFS+",
        format: specification.format,
        size: specification.size,
        shrink: specification.shrink,
        contents: ((_a = specification.contents) === null || _a === void 0 ? void 0 : _a.map(c => ({
            path: c.path || appPath, // path is required, when ommitted, appPath is used (backward compatibility
            x: c.x,
            y: c.y,
            name: c.name,
            type: c.type === "dir" ? "file" : c.type, // appdmg expects "file" for directories
            // hide_extension: c.hideExtension,
        }))) || [],
    };
    if (specification.badgeIcon) {
        let badgeIcon = await packager.getResource(specification.badgeIcon);
        if (badgeIcon && badgeIcon.toLowerCase().endsWith(".icon")) {
            badgeIcon = await packager.generateIcnsFromIcon(badgeIcon);
        }
        settings["badge-icon"] = badgeIcon;
    }
    else {
        settings.icon = await packager.getResource(specification.icon);
    }
    if (specification.backgroundColor != null || specification.background == null) {
        settings["background-color"] = specification.backgroundColor || "#ffffff";
        const window = specification.window;
        if (window != null) {
            settings.window = {
                position: {
                    x: (_b = window.x) !== null && _b !== void 0 ? _b : 100,
                    y: (_c = window.y) !== null && _c !== void 0 ? _c : 400,
                },
                size: {
                    width: (_d = window.width) !== null && _d !== void 0 ? _d : 540,
                    height: (_e = window.height) !== null && _e !== void 0 ? _e : 300,
                },
            };
        }
    }
    else {
        settings.background = specification.background == null ? null : await transformBackgroundFileIfNeed(specification.background, packager.info.tempDirManager);
    }
    if (!(0, builder_util_1.isEmptyOrSpaces)(settings.background)) {
        const size = await getImageSizeUsingSips(settings.background);
        settings.window = { position: { x: 400, y: Math.round((1440 - size.height) / 2) }, size, ...settings.window };
    }
    const workspaceRoot = await packager.info.getWorkspaceRoot();
    for (const item of (_f = settings.contents) !== null && _f !== void 0 ? _f : []) {
        if (item.type === "file" && item.path && path.isAbsolute(item.path)) {
            if (!item.path.startsWith(workspaceRoot + path.sep) && item.path !== appPath) {
                builder_util_1.log.error({ contentPath: item.path }, "dmg.contents path is outside the workspace root — verify this is intentional");
                throw new builder_util_1.InvalidConfigurationError(`dmg.contents path "${item.path}" is outside the workspace root`);
            }
        }
    }
    if (licenseData) {
        settings.license = licenseData;
    }
    const settingsFile = await packager.getTempFile(".json");
    await (0, fs_extra_1.writeFile)(settingsFile, JSON.stringify(settings, null, 2));
    const dmgbuild = await getDmgVendorPath();
    await (0, toolsetLock_1.withToolsetLock)(() => (0, builder_util_1.exec)(dmgbuild, ["-s", settingsFile, path.basename(volumePath), artifactPath], {
        env: {
            ...process.env,
            PYTHONIOENCODING: "utf8",
        },
    }));
    // effectiveOptionComputed, when present, is purely for verifying result during test execution
    return (packager.packagerOptions.effectiveOptionComputed == null ||
        (await attachAndExecute(artifactPath, false, true, async (volumePath) => {
            var _a;
            return !(await packager.packagerOptions.effectiveOptionComputed({
                volumePath,
                specification: {
                    ...specification,
                    // clean up `contents` for test snapshot verification since app path is absolute to a unique tmp dir
                    contents: (_a = specification.contents) === null || _a === void 0 ? void 0 : _a.map((c) => {
                        var _a;
                        return ({
                            ...c,
                            path: path.extname((_a = c.path) !== null && _a !== void 0 ? _a : "") === ".app" ? path.relative(packager.projectDir, c.path) : c.path,
                        });
                    }),
                },
                packager,
            }));
        })));
}
async function transformBackgroundFileIfNeed(file, tmpDir) {
    if (path.extname(file.toLowerCase()) === ".tiff") {
        return file;
    }
    const retinaFile = file.replace(/\.([a-z]+)$/, "@2x.$1");
    if (await (0, builder_util_1.exists)(retinaFile)) {
        const tiffFile = await tmpDir.getTempFile({ suffix: ".tiff" });
        await (0, builder_util_1.exec)("tiffutil", ["-cathidpicheck", file, retinaFile, "-out", tiffFile]);
        return tiffFile;
    }
    return file;
}
async function getImageSizeUsingSips(background) {
    const stdout = await (0, builder_util_1.exec)("sips", ["-g", "pixelHeight", "-g", "pixelWidth", background]);
    let width = 0;
    let height = 0;
    const re = /([a-zA-Z]+):\s*(\d+)/;
    const lines = stdout.split("\n");
    for (const line of lines) {
        const match = re.exec(line);
        if (!match) {
            continue;
        }
        const key = match[1];
        const value = parseInt(match[2], 10);
        if (isNaN(value)) {
            throw new Error(`Failed to parse number from line: "${line}"`);
        }
        if (key === "pixelWidth") {
            width = value;
        }
        else if (key === "pixelHeight") {
            height = value;
        }
    }
    return { width, height };
}
//# sourceMappingURL=dmgUtil.js.map
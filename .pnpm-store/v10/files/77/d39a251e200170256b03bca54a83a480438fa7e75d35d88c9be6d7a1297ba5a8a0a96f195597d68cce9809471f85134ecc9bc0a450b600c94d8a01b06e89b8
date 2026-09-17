"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapCoreLegacy = void 0;
exports.shellQuote = shellQuote;
exports.buildCommandShContent = buildCommandShContent;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const promises_1 = require("fs/promises");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const linux_1 = require("../../toolsets/linux");
const electronGet_1 = require("../../util/electronGet");
const pathManager_1 = require("../../util/pathManager");
const LibUiFramework_1 = require("../../frameworks/LibUiFramework");
const SnapTarget_1 = require("./SnapTarget");
const snapcraftBuilder_1 = require("./snapcraftBuilder");
const js_yaml_1 = require("js-yaml");
// Snap template release info from electron-userland/electron-builder-binaries
const SNAP_TEMPLATES = {
    amd64: {
        releaseName: "snap-template-4.0-2",
        filenameWithExt: "snap-template-electron-4.0-2-amd64.tar.7z",
        checksums: { "snap-template-electron-4.0-2-amd64.tar.7z": "5e3ab4e09364ac06f0072b1c2dab9138318c933f6b2c7374f893b5ec44d19e6f" },
    },
    armhf: {
        releaseName: "snap-template-4.0-1",
        filenameWithExt: "snap-template-electron-4.0-1-armhf.tar.7z",
        checksums: { "snap-template-electron-4.0-1-armhf.tar.7z": "6f7553e904f4e043bc3019f0899d05e01a283b00b61fec22e932296490e3be6b" },
    },
};
// Handles core18/core20/core22 snaps via mksquashfs (template) or snapcraft CLI (no-template).
// See: https://github.com/develar/app-builder/blob/master/pkg/package-format/snap
class SnapCoreLegacy extends SnapTarget_1.SnapCore {
    constructor() {
        super(...arguments);
        this.isUseTemplateApp = false;
        this.defaultPlugs = ["desktop", "desktop-legacy", "home", "x11", "wayland", "unity7", "browser-support", "network", "gsettings", "audio-playback", "pulseaudio", "opengl"];
    }
    replaceDefault(inList, defaultList) {
        const result = (0, builder_util_1.replaceDefault)(inList, defaultList);
        if (result !== defaultList) {
            this.isUseTemplateApp = false;
        }
        return result;
    }
    async createDescriptor(arch) {
        const appInfo = this.packager.appInfo;
        const snapName = this.packager.executableName.toLowerCase();
        const options = this.options;
        const plugs = this.normalizePlugConfiguration(this.options.plugs);
        const plugNames = this.replaceDefault(plugs == null ? null : Object.getOwnPropertyNames(plugs), this.defaultPlugs);
        const slots = this.normalizePlugConfiguration(this.options.slots);
        const buildPackages = (0, builder_util_runtime_1.asArray)(options.buildPackages);
        const stagePackages = this.replaceDefault(options.stagePackages, snapcraftBuilder_1.DEFAULT_STAGE_PACKAGES);
        const stageSet = new Set(stagePackages);
        const stageMatchesDefaults = stagePackages.length === snapcraftBuilder_1.DEFAULT_STAGE_PACKAGES.length && snapcraftBuilder_1.DEFAULT_STAGE_PACKAGES.every((p) => stageSet.has(p));
        // Template app is only available for x64/armv7l, and only when no packages are customised.
        this.isUseTemplateApp = this.options.useTemplateApp !== false && (arch === builder_util_1.Arch.x64 || arch === builder_util_1.Arch.armv7l) && buildPackages.length === 0 && stageMatchesDefaults;
        const appDescriptor = {
            command: "command.sh",
            plugs: plugNames,
            adapter: "none",
        };
        const snap = (0, js_yaml_1.load)(await (0, fs_extra_1.readFile)(path.join((0, pathManager_1.getTemplatePath)("snap"), "snapcraft.yaml"), "utf-8"));
        if (this.isUseTemplateApp) {
            delete appDescriptor.adapter;
        }
        if (options.base != null) {
            snap.base = options.base;
            if (Number(snap.base.split("core")[1]) >= 22) {
                delete appDescriptor.adapter;
            }
        }
        if (options.grade != null) {
            snap.grade = options.grade;
        }
        if (options.confinement != null) {
            snap.confinement = options.confinement;
        }
        if (options.appPartStage != null) {
            snap.parts.app.stage = options.appPartStage;
        }
        if (options.layout != null) {
            snap.layout = options.layout;
        }
        if (slots != null) {
            appDescriptor.slots = Object.getOwnPropertyNames(slots);
            for (const slotName of appDescriptor.slots) {
                if (!(0, builder_util_runtime_1.isValidKey)(slotName)) {
                    throw new Error(`Invalid plug/slot name: ${slotName}`);
                }
                const slotOptions = slots[slotName];
                if (slotOptions == null) {
                    continue;
                }
                if (!snap.slots) {
                    snap.slots = {};
                }
                snap.slots[slotName] = slotOptions;
            }
        }
        (0, builder_util_runtime_1.deepAssign)(snap, {
            name: snapName,
            version: appInfo.version,
            title: options.title || appInfo.productName,
            summary: options.summary || appInfo.productName,
            compression: options.compression,
            description: this.helper.getDescription(options),
            architectures: [(0, builder_util_1.toLinuxArchString)(arch, "snap")],
            apps: {
                [snapName]: appDescriptor,
            },
            parts: {
                app: {
                    "stage-packages": stagePackages,
                },
            },
        });
        if (options.autoStart) {
            appDescriptor.autostart = `${this.helper.getDesktopFileName(snap.name)}.desktop`;
        }
        if (options.confinement === "classic") {
            delete appDescriptor.plugs;
            delete snap.plugs;
        }
        else {
            const archTriplet = this.archNameToTriplet(arch);
            const environment = {
                PATH: "$SNAP/usr/sbin:$SNAP/usr/bin:$SNAP/sbin:$SNAP/bin:$PATH",
                SNAP_DESKTOP_RUNTIME: "$SNAP/gnome-platform",
                LD_LIBRARY_PATH: [
                    "$SNAP_LIBRARY_PATH",
                    "$SNAP/lib:$SNAP/usr/lib:$SNAP/lib/" + archTriplet + ":$SNAP/usr/lib/" + archTriplet,
                    "$LD_LIBRARY_PATH:$SNAP/lib:$SNAP/usr/lib",
                    "$SNAP/lib/" + archTriplet + ":$SNAP/usr/lib/" + archTriplet,
                ].join(":"),
                ...options.environment,
            };
            const allow = options.allowNativeWayland;
            const isOldElectron = !this.helper.isElectronVersionGreaterOrEqualThan("38.0.0", "7.0.0");
            if ((allow == null && isOldElectron) || allow === false) {
                environment.DISABLE_WAYLAND = "1";
            }
            appDescriptor.environment = environment;
            if (plugs != null) {
                for (const plugName of plugNames) {
                    if (!(0, builder_util_runtime_1.isValidKey)(plugName)) {
                        throw new Error(`Invalid plug/slot name: ${plugName}`);
                    }
                    const plugOptions = plugs[plugName];
                    if (plugOptions == null) {
                        continue;
                    }
                    if (!snap.plugs) {
                        snap.plugs = {};
                    }
                    snap.plugs[plugName] = plugOptions;
                }
            }
        }
        if (buildPackages.length > 0) {
            snap.parts.app["build-packages"] = buildPackages;
        }
        if (options.after != null) {
            snap.parts.app.after = options.after;
        }
        if (options.assumes != null) {
            snap.assumes = (0, builder_util_runtime_1.asArray)(options.assumes);
        }
        return snap;
    }
    async buildSnap(props) {
        var _a, _b;
        const { snap, appOutDir, stageDir, snapArch, artifactPath } = props;
        // Build the args array for effectiveOptionComputed compatibility — tests inspect this.
        const args = [
            "snap",
            "--app",
            appOutDir,
            "--stage",
            stageDir,
            "--arch",
            (0, builder_util_1.toLinuxArchString)(snapArch, "snap"),
            "--output",
            artifactPath,
            "--executable",
            this.packager.executableName,
        ];
        await this.helper.icons;
        if (this.helper.maxIconPath != null) {
            if (!this.isUseTemplateApp) {
                snap.icon = "snap/gui/icon.png";
            }
            args.push("--icon", this.helper.maxIconPath);
        }
        const snapMetaDir = path.join(stageDir, this.isUseTemplateApp ? "meta" : "snap");
        const desktopFile = path.join(snapMetaDir, "gui", `${this.helper.getDesktopFileName(snap.name)}.desktop`);
        await this.helper.writeDesktopEntry(this.options, this.packager.executableName + " %U", desktopFile, {
            Icon: "${SNAP}/meta/gui/icon.png",
        });
        const extraAppArgs = (_a = this.options.executableArgs) !== null && _a !== void 0 ? _a : [];
        if (this.helper.isElectronVersionGreaterOrEqualThan("5.0.0") && !this.isBrowserSandboxAllowed(snap)) {
            const noSandboxArg = "--no-sandbox";
            if (!extraAppArgs.includes(noSandboxArg)) {
                extraAppArgs.push(noSandboxArg);
            }
            if (this.isUseTemplateApp) {
                args.push("--exclude", "chrome-sandbox");
            }
        }
        if (extraAppArgs.length > 0) {
            args.push("--extraAppArgs=" + extraAppArgs.join(" "));
        }
        // Capture compression BEFORE it gets stripped from snap for template builds.
        const compression = (_b = this.options.compression) !== null && _b !== void 0 ? _b : "xz";
        if (snap.compression != null) {
            args.push("--compression", snap.compression);
        }
        if (this.isUseTemplateApp) {
            const fieldsToStrip = ["compression", "contact", "donation", "issues", "parts", "source-code", "website"];
            for (const field of fieldsToStrip) {
                delete snap[field];
            }
        }
        if (this.packager.packagerOptions.effectiveOptionComputed != null && (await this.packager.packagerOptions.effectiveOptionComputed({ snap, desktopFile, args }))) {
            return;
        }
        await (0, fs_extra_1.outputFile)(path.join(snapMetaDir, this.isUseTemplateApp ? "snap.yaml" : "snapcraft.yaml"), (0, builder_util_1.serializeToYaml)(snap));
        const hooksDir = await this.packager.getResource(this.options.hooks, "snap-hooks");
        if (hooksDir != null) {
            args.push("--hooks", hooksDir);
        }
        if (this.isUseTemplateApp) {
            const templateArch = snapArch === builder_util_1.Arch.x64 ? "amd64" : "armhf";
            args.push("--template-url", `electron4:${templateArch}`);
            await this.buildWithTemplate({ appOutDir, stageDir, snapArch, artifactPath, compression, hooksDir, extraAppArgs });
        }
        else {
            await this.buildWithoutTemplate({ appOutDir, stageDir, artifactPath, hooksDir, extraAppArgs });
        }
    }
    async buildWithTemplate(opts) {
        const { appOutDir, stageDir, snapArch, artifactPath, compression, hooksDir, extraAppArgs } = opts;
        const templateArch = snapArch === builder_util_1.Arch.x64 ? "amd64" : "armhf";
        const { releaseName, filenameWithExt, checksums } = SNAP_TEMPLATES[templateArch];
        builder_util_1.log.info({ releaseName }, "downloading snap template");
        const templateDir = await (0, electronGet_1.downloadBuilderToolset)({ releaseName, filenameWithExt, checksums, githubOrgRepo: "electron-userland/electron-builder-binaries" });
        await this.stageSnapFiles({ stageDir, appOutDir, hooksDir, extraAppArgs, isTemplate: true });
        // Best-effort: remove chrome-sandbox from app dir before mksquashfs scans it.
        await (0, promises_1.rm)(path.join(appOutDir, "chrome-sandbox"), { force: true });
        // chmod -R g-s to avoid setgid bits in final image
        for (const dir of [stageDir, appOutDir, templateDir]) {
            await (0, builder_util_1.exec)("chmod", ["-R", "g-s", dir]).catch(err => builder_util_1.log.warn({ error: err.message }, "chmod g-s failed"));
        }
        const mksquashfsPath = await getMksquashfsPath(snapArch);
        // Collect top-level entries from each dir as individual path args (mirrors Go ReadDirContentTo)
        const mksquashfsArgs = [
            ...(await readDirPaths(templateDir)),
            ...(await readDirPaths(stageDir)),
            ...(await readDirPaths(appOutDir, name => name !== "LICENSES.chromium.html" && name !== "LICENSE.electron.txt" && name !== "chrome-sandbox")),
            artifactPath,
            "-no-progress",
            "-quiet",
            "-noappend",
            "-comp",
            compression,
            "-no-xattrs",
            "-no-fragments",
            "-all-root",
        ];
        await (0, builder_util_1.exec)(mksquashfsPath, mksquashfsArgs, { cwd: stageDir });
    }
    async buildWithoutTemplate(opts) {
        const { appOutDir, stageDir, artifactPath, hooksDir, extraAppArgs } = opts;
        await this.stageSnapFiles({ stageDir, appOutDir, hooksDir, extraAppArgs, isTemplate: false });
        // Write desktop integration scripts (embedded in the Go binary, now in our templates)
        const snapTemplateDir = (0, pathManager_1.getTemplatePath)("snap");
        for (const script of ["desktop-init.sh", "desktop-common.sh", "desktop-gnome-specific.sh"]) {
            const src = path.join(snapTemplateDir, script);
            const dest = path.join(stageDir, "scripts", script);
            await (0, promises_1.copyFile)(src, dest);
            // copyFile doesn't preserve mode; chmod 755 explicitly
            await (0, promises_1.chmod)(dest, 0o755);
        }
        // Copy app dir into stage/app/ so snapcraft can pick it up
        await (0, builder_util_1.copyDir)(appOutDir, path.join(stageDir, "app"));
        // Run snapcraft (legacy `snap` subcommand)
        const isDestructiveMode = process.env.SNAP_DESTRUCTIVE_MODE === "true";
        const snapOutputName = "out.snap";
        const snapArgs = ["snap", "--output", isDestructiveMode ? artifactPath : snapOutputName];
        if (isDestructiveMode) {
            snapArgs.push("--destructive-mode");
        }
        await (0, builder_util_1.exec)("snapcraft", snapArgs, {
            cwd: stageDir,
            env: { ...process.env, SNAPCRAFT_HAS_TTY: "false" },
        });
        if (!isDestructiveMode) {
            await (0, promises_1.rename)(path.join(stageDir, snapOutputName), artifactPath);
        }
    }
    async stageSnapFiles(opts) {
        const { stageDir, hooksDir, extraAppArgs, isTemplate } = opts;
        const snapMetaDir = path.join(stageDir, isTemplate ? "meta" : "snap");
        // No-template builds place command.sh + desktop scripts in scripts/ which snapcraft stages to snap root.
        // Template builds write command.sh to the stage root directly; no scripts/ dir is needed.
        const scriptDir = path.join(stageDir, "scripts");
        if (!isTemplate) {
            await (0, promises_1.mkdir)(scriptDir, { recursive: true });
        }
        if (this.helper.maxIconPath != null) {
            const iconDest = path.join(snapMetaDir, "gui", `icon${path.extname(this.helper.maxIconPath)}`);
            await (0, promises_1.mkdir)(path.dirname(iconDest), { recursive: true });
            await (0, promises_1.copyFile)(this.helper.maxIconPath, iconDest);
        }
        if (hooksDir != null) {
            await (0, builder_util_1.copyDir)(hooksDir, path.join(snapMetaDir, "hooks"));
        }
        // command.sh — template builds write to stage root; no-template writes to scripts/
        const commandWrapperPath = isTemplate ? path.join(stageDir, "command.sh") : path.join(scriptDir, "command.sh");
        const commandContent = buildCommandShContent({ isTemplate, executableName: this.packager.executableName, extraAppArgs });
        await (0, promises_1.writeFile)(commandWrapperPath, commandContent, { mode: 0o755 });
        await (0, promises_1.chmod)(commandWrapperPath, 0o755);
    }
    normalizePlugConfiguration(raw) {
        if (raw == null) {
            return null;
        }
        const result = {};
        for (const item of Array.isArray(raw) ? raw : [raw]) {
            if (typeof item === "string") {
                if (!(0, builder_util_runtime_1.isValidKey)(item)) {
                    throw new Error(`Invalid plug/slot name: ${item}`);
                }
                result[item] = null;
            }
            else {
                (0, builder_util_runtime_1.deepAssign)(result, item);
            }
        }
        return result;
    }
    isBrowserSandboxAllowed(snap) {
        if (snap.plugs != null) {
            for (const plugName of Object.keys(snap.plugs)) {
                const plug = snap.plugs[plugName];
                if (plug.interface === "browser-support" && plug["allow-sandbox"] === true) {
                    return true;
                }
            }
        }
        return false;
    }
    archNameToTriplet(arch) {
        switch (arch) {
            case builder_util_1.Arch.x64:
                return "x86_64-linux-gnu";
            case builder_util_1.Arch.ia32:
                return "i386-linux-gnu";
            case builder_util_1.Arch.armv7l:
                return "arm-linux-gnueabihf";
            case builder_util_1.Arch.arm64:
                return "aarch64-linux-gnu";
            default:
                throw new Error(`Unsupported arch ${arch}`);
        }
    }
}
exports.SnapCoreLegacy = SnapCoreLegacy;
async function getMksquashfsPath(arch) {
    const envPath = process.env.MKSQUASHFS_PATH;
    if (envPath) {
        return envPath;
    }
    const { mksquashfs } = await (0, linux_1.getAppImageTools)("0.0.0", arch);
    return mksquashfs;
}
async function readDirPaths(dir, filter) {
    const entries = await (0, promises_1.readdir)(dir);
    const result = [];
    for (const name of entries) {
        if (!filter || filter(name)) {
            result.push(path.join(dir, name));
        }
    }
    return result;
}
/** Single-quote a shell argument, escaping any embedded single quotes. */
function shellQuote(arg) {
    return "'" + arg.replace(/'/g, "'\\''") + "'";
}
/**
 * Builds the content of command.sh for a snap package.
 *
 * For both template and no-template builds, the desktop-integration scripts are
 * sourced from the snap root ($SNAP):
 *   - Template: scripts are embedded in the template tarball at the snap root.
 *   - No-template: the snapcraft.yaml `launch-scripts` part uses `plugin: dump,
 *     source: scripts`, which stages stageDir/scripts/ contents directly into the
 *     snap root — so $SNAP/desktop-init.sh is correct in both cases.
 *
 * The only difference between template and no-template is the app executable prefix:
 * template apps are at $SNAP/<name>; no-template apps are at $SNAP/app/<name>.
 */
function buildCommandShContent(opts) {
    const { isTemplate, executableName, extraAppArgs } = opts;
    (0, LibUiFramework_1.validateShellEmbeddable)(executableName, "executableName");
    const appPrefix = isTemplate ? "" : "app/";
    let content = `#!/bin/bash -e\nexec "$SNAP/desktop-init.sh" "$SNAP/desktop-common.sh" "$SNAP/desktop-gnome-specific.sh" "$SNAP/${appPrefix}${executableName}"`;
    if (extraAppArgs.length > 0) {
        content += " " + extraAppArgs.map(shellQuote).join(" ");
    }
    content += ' "$@"';
    return content;
}
//# sourceMappingURL=coreLegacy.js.map
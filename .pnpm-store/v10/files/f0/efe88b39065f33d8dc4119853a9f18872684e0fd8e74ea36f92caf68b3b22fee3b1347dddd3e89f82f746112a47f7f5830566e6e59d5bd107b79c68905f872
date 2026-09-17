"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacPackager = void 0;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const fs = require("fs/promises");
const promises_1 = require("fs/promises");
const lazy_val_1 = require("lazy-val");
const path = require("path");
const appInfo_1 = require("./appInfo");
const macCodeSign_1 = require("./codeSign/macCodeSign");
const core_1 = require("./core");
const MacTargetHelper_1 = require("./mac/MacTargetHelper");
const platformPackager_1 = require("./platformPackager");
const ArchiveTarget_1 = require("./targets/ArchiveTarget");
const pkg_1 = require("./targets/pkg");
const targetFactory_1 = require("./targets/targetFactory");
const dynamicImport_1 = require("./util/dynamicImport");
const macosVersion_1 = require("./util/macosVersion");
const macroExpander_1 = require("./util/macroExpander");
const resolve_1 = require("./util/resolve");
class MacPackager extends platformPackager_1.PlatformPackager {
    constructor(info) {
        super(info, core_1.Platform.MAC);
        this.codeSigningInfo = new builder_util_runtime_1.MemoLazy(() => {
            const cscLink = this.getCscLink();
            if (cscLink == null || process.platform !== "darwin") {
                return null;
            }
            const selected = {
                tmpDir: this.info.tempDirManager,
                cscLink,
                cscKeyPassword: this.getCscPassword(),
                cscILink: (0, platformPackager_1.chooseNotNull)(this.platformSpecificBuildOptions.cscInstallerLink, process.env.CSC_INSTALLER_LINK),
                cscIKeyPassword: (0, platformPackager_1.chooseNotNull)(this.platformSpecificBuildOptions.cscInstallerKeyPassword, process.env.CSC_INSTALLER_KEY_PASSWORD),
                currentDir: this.projectDir,
            };
            return selected;
        }, async (selected) => {
            if (selected) {
                return (0, macCodeSign_1.createKeychain)(selected).then(result => {
                    const keychainFile = result.keychainFile;
                    if (keychainFile != null) {
                        this.info.disposeOnBuildFinish(() => (0, macCodeSign_1.removeKeychain)(keychainFile));
                    }
                    return result;
                });
            }
            return Promise.resolve({ keychainFile: process.env.CSC_KEYCHAIN || null });
        });
        this._iconPath = new lazy_val_1.Lazy(() => this.getOrConvertIcon("icns"));
        // Set/cleared in doPack so applyCommonInfo can read the per-pack platformSpecificBuildOptions
        // (the framework call chain doesn't thread it through to applyCommonInfo). Fixes #8909.
        this._activePackConfig = null;
        this.helper = new MacTargetHelper_1.MacTargetHelper(this);
    }
    get defaultTarget() {
        return this.info.framework.macOsDefaultTargets;
    }
    /**
     * Get the merged configuration for a specific platform type
     */
    getPlatformConfig(platformType) {
        let config;
        let isDevelopment = false;
        let platformName;
        switch (platformType) {
            case "mas":
                config = (0, builder_util_1.deepAssign)({}, this.platformSpecificBuildOptions, this.config.mas);
                isDevelopment = false;
                platformName = "mas";
                break;
            case "mas-dev":
                config = (0, builder_util_1.deepAssign)({}, this.platformSpecificBuildOptions, this.config.mas, this.config.masDev, {
                    type: "development",
                });
                isDevelopment = true;
                platformName = "mas";
                break;
            case "mac":
            default:
                config = this.platformSpecificBuildOptions;
                isDevelopment = false;
                platformName = this.platform.nodeName;
                break;
        }
        return { type: platformType, config, isDevelopment, platformName };
    }
    expandArch(pattern, arch) {
        if (arch === builder_util_1.Arch.universal) {
            // Universal build has `app-x64.asar.unpacked` & `app-arm64.asar.unpacked`
            return [(0, macroExpander_1.expandMacro)(pattern, builder_util_1.Arch[builder_util_1.Arch.arm64], this.appInfo, {}, false), (0, macroExpander_1.expandMacro)(pattern, builder_util_1.Arch[builder_util_1.Arch.x64], this.appInfo, {}, false)];
        }
        // Every other build keeps the name as `app.asar.unpacked`
        return [(0, macroExpander_1.expandMacro)(pattern, null, this.appInfo, {}, false)];
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prepareAppInfo(appInfo) {
        // codesign requires the filename to be normalized to the NFD form
        return new appInfo_1.AppInfo(this.info, this.platformSpecificBuildOptions.bundleVersion, this.platformSpecificBuildOptions, true);
    }
    async getIconPath() {
        return this._iconPath.value;
    }
    createTargets(targets, mapper) {
        for (const name of targets) {
            switch (name) {
                case core_1.DIR_TARGET:
                    break;
                case "dmg": {
                    const { DmgTarget } = require("dmg-builder");
                    mapper(name, outDir => new DmgTarget(this, outDir));
                    break;
                }
                case "zip":
                    // https://github.com/electron-userland/electron-builder/issues/2313
                    mapper(name, outDir => new ArchiveTarget_1.ArchiveTarget(name, outDir, this, true));
                    break;
                case "pkg":
                    mapper(name, outDir => new pkg_1.PkgTarget(this, outDir));
                    break;
                default:
                    mapper(name, outDir => (MacTargetHelper_1.MacTargetHelper.isMasTarget(name) ? new targetFactory_1.NoOpTarget(name) : (0, targetFactory_1.createCommonTarget)(name, outDir, this)));
                    break;
            }
        }
    }
    async doPack(config) {
        if (config.arch === builder_util_1.Arch.universal) {
            return this.doUniversalPack(config);
        }
        // Bridge the per-pack platformSpecificBuildOptions to applyCommonInfo, which is called deep in the
        // framework stack (doPack → beforeCopyExtraFiles → createMacApp → applyCommonInfo) without it.
        this._activePackConfig = config.platformSpecificBuildOptions;
        try {
            return await super.doPack(config);
        }
        finally {
            this._activePackConfig = null;
        }
    }
    /**
     * Handle universal build packing
     */
    async doUniversalPack(config) {
        var _a, _b, _c;
        this._activePackConfig = config.platformSpecificBuildOptions;
        try {
            const { outDir, appOutDir, platformName, arch, platformSpecificBuildOptions, targets } = config;
            const outDirName = (arch) => `${appOutDir}-${builder_util_1.Arch[arch]}-temp`;
            const options = {
                ...config,
                options: {
                    sign: false,
                    disableAsarIntegrity: true,
                    disableFuses: true,
                },
            };
            const x64Arch = builder_util_1.Arch.x64;
            const x64AppOutDir = outDirName(x64Arch);
            await super.doPack({ ...options, appOutDir: x64AppOutDir, arch: x64Arch });
            if (this.info.cancellationToken.cancelled) {
                return;
            }
            const arm64Arch = builder_util_1.Arch.arm64;
            const arm64AppOutPath = outDirName(arm64Arch);
            await super.doPack({ ...options, appOutDir: arm64AppOutPath, arch: arm64Arch });
            if (this.info.cancellationToken.cancelled) {
                return;
            }
            const framework = this.info.framework;
            builder_util_1.log.info({
                platform: platformName,
                arch: builder_util_1.Arch[arch],
                [`${framework.name}`]: framework.version,
                appOutDir: builder_util_1.log.filePath(appOutDir),
            }, `packaging`);
            const appFile = `${this.appInfo.productFilename}.app`;
            // Make sure the Assets.car file is the same for both architectures
            const safeX64AppOutDir = (0, builder_util_1.sanitizeDirPath)(x64AppOutDir);
            const safeArm64AppOutPath = (0, builder_util_1.sanitizeDirPath)(arm64AppOutPath);
            const safeAppOutDir = (0, builder_util_1.sanitizeDirPath)(appOutDir);
            const sourceCatalogPath = path.join(safeX64AppOutDir, appFile, "Contents/Resources/Assets.car");
            if (await (0, builder_util_1.exists)(sourceCatalogPath)) {
                const targetCatalogPath = path.join(safeArm64AppOutPath, appFile, "Contents/Resources/Assets.car");
                await fs.copyFile(sourceCatalogPath, targetCatalogPath);
            }
            const { makeUniversalApp } = await (0, dynamicImport_1.dynamicImport)("@electron/universal");
            await makeUniversalApp({
                x64AppPath: path.join(safeX64AppOutDir, appFile),
                arm64AppPath: path.join(safeArm64AppOutPath, appFile),
                outAppPath: path.join(safeAppOutDir, appFile),
                force: true,
                mergeASARs: (_a = platformSpecificBuildOptions.mergeASARs) !== null && _a !== void 0 ? _a : true, // must be ?? to allow false
                singleArchFiles: platformSpecificBuildOptions.singleArchFiles || undefined,
                x64ArchFiles: platformSpecificBuildOptions.x64ArchFiles || undefined,
            });
            await fs.rm(x64AppOutDir, { recursive: true, force: true });
            await fs.rm(arm64AppOutPath, { recursive: true, force: true });
            // Give users a final opportunity to perform things on the combined universal package before signing
            const packContext = {
                appOutDir,
                outDir,
                arch,
                targets,
                packager: this,
                electronPlatformName: platformName,
            };
            await this.info.emitAfterPack(packContext);
            if (this.info.cancellationToken.cancelled) {
                return;
            }
            await this.doAddElectronFuses(packContext);
            // Mirror the base-class guard: skip signing when the caller explicitly set sign:false
            // (e.g. packMasTargets passes sign:false so that signMas() is the sole signing step).
            if ((_c = (_b = config.options) === null || _b === void 0 ? void 0 : _b.sign) !== null && _c !== void 0 ? _c : true) {
                await this.doSignAfterPack(outDir, appOutDir, platformName, arch, platformSpecificBuildOptions, targets);
            }
        }
        finally {
            this._activePackConfig = null;
        }
    }
    async pack(outDir, arch, targets, taskManager) {
        const masTargets = targets.filter(it => MacTargetHelper_1.MacTargetHelper.isMasTarget(it.name));
        const nonMasTargets = targets.filter(it => !MacTargetHelper_1.MacTargetHelper.isMasTarget(it.name));
        const prepackaged = this.packagerOptions.prepackaged;
        const hasMas = masTargets.length > 0;
        // mas always first
        await this.packMasTargets(outDir, arch, masTargets, prepackaged);
        // Mirror master's condition: skip the non-MAS darwin pack only when there are exclusively MAS
        // targets (hasMas=true, targets.length=1). DIR_TARGET passes targets=[] to pack() because
        // MacPackager.createTargets() doesn't call mapper() for it, so hasMas=false and doPack still runs.
        if (!hasMas || targets.length > 1) {
            await this.packMacTargets(outDir, arch, nonMasTargets, prepackaged, taskManager);
        }
    }
    async packMasTargets(outDir, arch, targets, prepackaged) {
        const resolvedOutDir = path.resolve(outDir);
        MacTargetHelper_1.MacTargetHelper.assertSafePathForCommandUsage(resolvedOutDir, "output directory");
        for (const target of targets) {
            const platformType = MacTargetHelper_1.MacTargetHelper.getPlatformTypeFromTarget(target.name);
            const platformConfig = this.getPlatformConfig(platformType);
            const targetOutDir = path.resolve(resolvedOutDir, `${target.name}${(0, builder_util_1.getArchSuffix)(arch, this.platformSpecificBuildOptions.defaultArch)}`);
            MacTargetHelper_1.MacTargetHelper.assertSafePathForCommandUsage(targetOutDir, "target output directory");
            const relativeTargetOutDir = path.relative(resolvedOutDir, targetOutDir);
            if (relativeTargetOutDir.startsWith("..") || path.isAbsolute(relativeTargetOutDir)) {
                throw new builder_util_1.InvalidConfigurationError(`Invalid target output directory: ${targetOutDir}`);
            }
            if (prepackaged == null) {
                await this.doPack({
                    outDir: resolvedOutDir,
                    appOutDir: targetOutDir,
                    platformName: platformConfig.platformName,
                    arch,
                    platformSpecificBuildOptions: platformConfig.config,
                    targets: [target],
                    options: { sign: false },
                });
                MacTargetHelper_1.MacTargetHelper.assertSafePathForCommandUsage(this.appInfo.productFilename, "product filename");
                await this.signMas(path.resolve(targetOutDir, `${path.basename(this.appInfo.productFilename)}.app`), targetOutDir, platformConfig, arch);
            }
            else {
                await this.signMas(prepackaged, targetOutDir, platformConfig, arch);
            }
        }
    }
    async packMacTargets(outDir, arch, targets, prepackaged, taskManager) {
        const appPath = prepackaged == null ? path.join(this.computeAppOutDir(outDir, arch), `${path.basename(this.appInfo.productFilename)}.app`) : prepackaged;
        if (prepackaged == null) {
            const platformConfig = this.getPlatformConfig("mac");
            await this.doPack({
                outDir,
                appOutDir: path.dirname(appPath),
                platformName: platformConfig.platformName,
                arch,
                platformSpecificBuildOptions: platformConfig.config,
                targets,
            });
        }
        this.packageInDistributableFormat(appPath, arch, targets, taskManager);
    }
    async signMas(appPath, outDir, platformConfig, arch) {
        const signed = await this.sign(appPath, outDir, platformConfig.config, arch, true);
        return signed;
    }
    /**
     * Main signing method with platform awareness
     */
    async sign(appPath, outDir, options, arch, isMas = false) {
        if (!(0, macCodeSign_1.isSignAllowed)()) {
            return false;
        }
        const config = options !== null && options !== void 0 ? options : this.platformSpecificBuildOptions;
        const qualifier = config.identity;
        if (qualifier === null) {
            return this.helper.handleNullIdentity();
        }
        const keychainFile = (await this.codeSigningInfo.value).keychainFile;
        const explicitType = config.type;
        const type = explicitType || "distribution";
        const isDevelopment = type === "development";
        const identity = await this.helper.findSigningIdentity(isMas, isDevelopment, qualifier, keychainFile, config);
        if (!identity) {
            return false;
        }
        if (!(0, macosVersion_1.isMacOsHighSierra)()) {
            throw new builder_util_1.InvalidConfigurationError("macOS High Sierra 10.13.6 is required to sign");
        }
        const signOptions = await this.helper.buildSignOptions(appPath, identity, type, isMas, config, keychainFile, arch);
        await this.doSign(signOptions, config, identity);
        // Handle MAS installer creation
        if (isMas && !isDevelopment && outDir) {
            await this.helper.createMasInstaller(appPath, outDir, config, keychainFile, isDevelopment, arch);
        }
        // Handle notarization for non-MAS builds
        if (!isMas) {
            await this.helper.notarizeIfProvided(appPath);
        }
        return true;
    }
    //noinspection JSMethodCanBeStatic
    async doSign(opts, customSignOptions, identity) {
        const customSign = await (0, resolve_1.resolveFunction)(this.appInfo.type, customSignOptions.sign, "sign", await this.info.getWorkspaceRoot());
        const { app, platform, type, provisioningProfile } = opts;
        builder_util_1.log.info({
            file: builder_util_1.log.filePath(app),
            platform,
            type,
            identityName: (identity === null || identity === void 0 ? void 0 : identity.name) || "none",
            identityHash: (identity === null || identity === void 0 ? void 0 : identity.hash) || "none",
            provisioningProfile: provisioningProfile || "none",
        }, customSign ? "executing custom sign" : "signing");
        return customSign ? Promise.resolve(customSign(opts, this)) : (0, macCodeSign_1.sign)({ ...opts, identity: identity ? identity.name : undefined });
    }
    //noinspection JSMethodCanBeStatic
    async doFlat(appPath, outFile, identity, keychain) {
        const safeAppPath = (0, builder_util_1.sanitizeDirPath)(appPath);
        const safeOutFile = (0, builder_util_1.sanitizeDirPath)(outFile);
        // productbuild doesn't created directory for out file
        await (0, promises_1.mkdir)(path.dirname(safeOutFile), { recursive: true });
        const args = (0, pkg_1.prepareProductBuildArgs)(identity, keychain);
        args.push("--component", safeAppPath, "/Applications");
        args.push(safeOutFile);
        return await (0, builder_util_1.exec)("productbuild", args);
    }
    getElectronSrcDir(dist) {
        return path.resolve(this.projectDir, dist, this.info.framework.distMacOsAppName);
    }
    getElectronDestinationDir(appOutDir) {
        return path.join(appOutDir, this.info.framework.distMacOsAppName);
    }
    // todo fileAssociations
    async applyCommonInfo(appPlist, contentsPath) {
        var _a;
        const appInfo = this.appInfo;
        const appFilename = appInfo.productFilename;
        // https://github.com/electron-userland/electron-builder/issues/1278
        appPlist.CFBundleExecutable = appFilename.endsWith(" Helper") ? appFilename.substring(0, appFilename.length - " Helper".length) : appFilename;
        const resourcesPath = path.join(contentsPath, "Resources");
        // Support both legacy `.icns` and modern `.icon` (Icon Composer) inputs via `mac.icon`.
        // Prefer `.icon` if provided; still accept `.icns`.
        const configuredIcon = this.platformSpecificBuildOptions.icon;
        const isIconComposer = typeof configuredIcon === "string" && configuredIcon.toLowerCase().endsWith(".icon");
        // Set the app name
        appPlist.CFBundleName = appInfo.productName;
        appPlist.CFBundleDisplayName = appInfo.productName;
        // Bundle legacy `icns` format - this should also run when `.icon` is provided
        const setIcnsFile = async (iconPath) => {
            const oldIcon = appPlist.CFBundleIconFile;
            if (oldIcon != null) {
                await (0, builder_util_1.unlinkIfExists)(path.join(resourcesPath, oldIcon));
            }
            const iconFileName = "icon.icns";
            appPlist.CFBundleIconFile = iconFileName;
            await (0, builder_util_1.copyFile)(iconPath, path.join(resourcesPath, iconFileName));
        };
        const icnsFilePath = await this.getIconPath();
        if (icnsFilePath != null) {
            await setIcnsFile(icnsFilePath);
        }
        // Bundle new `icon` format
        if (isIconComposer && configuredIcon) {
            const iconComposerPath = await this.getResource(configuredIcon);
            if (iconComposerPath) {
                const { assetCatalog } = await this.generateAssetCatalogData(iconComposerPath);
                // Create and setup the asset catalog
                appPlist.CFBundleIconName = "Icon";
                await fs.writeFile(path.join(resourcesPath, "Assets.car"), assetCatalog);
            }
        }
        const minimumSystemVersion = this.platformSpecificBuildOptions.minimumSystemVersion;
        if (minimumSystemVersion != null) {
            appPlist.LSMinimumSystemVersion = minimumSystemVersion;
        }
        const activeOpts = (_a = this._activePackConfig) !== null && _a !== void 0 ? _a : this.platformSpecificBuildOptions;
        appPlist.CFBundleShortVersionString = activeOpts.bundleShortVersion || appInfo.version;
        appPlist.CFBundleVersion = activeOpts.bundleVersion || appInfo.buildVersion;
        (0, builder_util_1.use)(this.platformSpecificBuildOptions.category || this.config.category, it => (appPlist.LSApplicationCategoryType = it));
        appPlist.NSHumanReadableCopyright = appInfo.copyright;
        if (this.platformSpecificBuildOptions.darkModeSupport) {
            appPlist.NSRequiresAquaSystemAppearance = false;
        }
        const extendInfo = this.platformSpecificBuildOptions.extendInfo;
        if (extendInfo != null) {
            (0, builder_util_1.deepAssign)(appPlist, extendInfo);
        }
        for (const [k, v] of Object.entries(appPlist)) {
            if (v === null || v === undefined) {
                delete appPlist[k];
            }
        }
    }
    async signApp(packContext, isAsar) {
        var _a;
        const isMas = packContext.electronPlatformName === "mas";
        const activeConfig = (_a = this._activePackConfig) !== null && _a !== void 0 ? _a : this.platformSpecificBuildOptions;
        const readDirectoryAndSign = async (sourceDirectory, directories, shouldSign) => {
            const normalizedSourceDirectory = path.resolve(sourceDirectory);
            MacTargetHelper_1.MacTargetHelper.assertSafePathForCommandUsage(normalizedSourceDirectory, "application output directory");
            await Promise.all(directories.map(async (file) => {
                if (shouldSign(file)) {
                    const entryName = path.basename(file);
                    if (file !== entryName) {
                        throw new builder_util_1.InvalidConfigurationError(`Invalid entry name in source directory: ${file}`);
                    }
                    const signTarget = path.resolve(normalizedSourceDirectory, entryName);
                    const safeSignTarget = (0, builder_util_1.sanitizeDirPath)(signTarget, normalizedSourceDirectory);
                    await this.sign(safeSignTarget, null, isMas ? activeConfig : null, packContext.arch, isMas);
                }
            }));
            return true;
        };
        const appFileName = `${this.appInfo.productFilename}.app`;
        await readDirectoryAndSign(packContext.appOutDir, await (0, promises_1.readdir)(packContext.appOutDir), file => file === appFileName);
        if (!isAsar) {
            return true;
        }
        const outResourcesDir = path.join(packContext.appOutDir, "resources", "app.asar.unpacked");
        await readDirectoryAndSign(outResourcesDir, await (0, builder_util_1.orIfFileNotExist)((0, promises_1.readdir)(outResourcesDir), []), file => file.endsWith(".app"));
        return true;
    }
}
exports.MacPackager = MacPackager;
//# sourceMappingURL=macPackager.js.map
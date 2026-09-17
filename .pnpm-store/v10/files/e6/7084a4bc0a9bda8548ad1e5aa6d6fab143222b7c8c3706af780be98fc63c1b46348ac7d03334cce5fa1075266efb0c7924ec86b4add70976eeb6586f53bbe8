"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinPackager = void 0;
const builder_util_1 = require("builder-util");
const ci_info_1 = require("ci-info");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const lazy_val_1 = require("lazy-val");
const path = require("path");
const asar_1 = require("./asar/asar");
const windowsCodeSign_1 = require("./codeSign/windowsCodeSign");
const windowsSignAzureManager_1 = require("./codeSign/windowsSignAzureManager");
const windowsSignToolManager_1 = require("./codeSign/windowsSignToolManager");
const core_1 = require("./core");
const platformPackager_1 = require("./platformPackager");
const NsisTarget_1 = require("./targets/nsis/NsisTarget");
const nsisUtil_1 = require("./targets/nsis/nsisUtil");
const WebInstallerTarget_1 = require("./targets/nsis/WebInstallerTarget");
const targetFactory_1 = require("./targets/targetFactory");
const cacheManager_1 = require("./util/cacheManager");
const flags_1 = require("./util/flags");
const resEdit_1 = require("./util/resEdit");
const timer_1 = require("./util/timer");
const vm_1 = require("./vm/vm");
class WinPackager extends platformPackager_1.PlatformPackager {
    get isForceCodeSigningVerification() {
        return this.platformSpecificBuildOptions.verifyUpdateCodeSignature !== false;
    }
    constructor(info) {
        super(info, core_1.Platform.WINDOWS);
        this._iconPath = new lazy_val_1.Lazy(() => this.getOrConvertIcon("ico"));
        this.vm = new lazy_val_1.Lazy(() => (process.platform === "win32" ? Promise.resolve(new vm_1.VmManager()) : (0, vm_1.getWindowsVm)(this.debugLogger)));
        this.signingManager = new lazy_val_1.Lazy(async () => {
            let manager;
            if (this.platformSpecificBuildOptions.azureSignOptions != null) {
                manager = new windowsSignAzureManager_1.WindowsSignAzureManager(this);
            }
            else {
                manager = new windowsSignToolManager_1.WindowsSignToolManager(this);
            }
            await manager.initialize();
            return manager;
        });
        this.signingQueue = Promise.resolve(true);
    }
    get defaultTarget() {
        return ["nsis"];
    }
    createTargets(targets, mapper) {
        let copyElevateHelper;
        const getCopyElevateHelper = () => {
            if (copyElevateHelper == null) {
                copyElevateHelper = new nsisUtil_1.CopyElevateHelper();
            }
            return copyElevateHelper;
        };
        let helper;
        const getHelper = () => {
            if (helper == null) {
                helper = new nsisUtil_1.AppPackageHelper(getCopyElevateHelper());
            }
            return helper;
        };
        for (const name of targets) {
            if (name === core_1.DIR_TARGET) {
                continue;
            }
            if (name === "nsis" || name === "portable") {
                mapper(name, outDir => new NsisTarget_1.NsisTarget(this, outDir, name, getHelper()));
            }
            else if (name === "nsis-web") {
                // package file format differs from nsis target
                mapper(name, outDir => new WebInstallerTarget_1.WebInstallerTarget(this, path.join(outDir, name), name, new nsisUtil_1.AppPackageHelper(getCopyElevateHelper())));
            }
            else {
                const targetClass = (() => {
                    switch (name) {
                        case "squirrel":
                            try {
                                return require("electron-builder-squirrel-windows").default;
                            }
                            catch (e) {
                                throw new builder_util_1.InvalidConfigurationError(`Module electron-builder-squirrel-windows must be installed in addition to build Squirrel.Windows: ${e.stack || e}`);
                            }
                        case "appx":
                            return require("./targets/AppxTarget").default;
                        case "msi":
                            return require("./targets/MsiTarget").default;
                        case "msiwrapped":
                            return require("./targets/MsiWrappedTarget").default;
                        default:
                            return null;
                    }
                })();
                mapper(name, outDir => (targetClass === null ? (0, targetFactory_1.createCommonTarget)(name, outDir, this) : new targetClass(this, outDir, name)));
            }
        }
    }
    getIconPath() {
        return this._iconPath.value;
    }
    doGetCscPassword() {
        var _a;
        return (0, platformPackager_1.chooseNotNull)((0, platformPackager_1.chooseNotNull)((_a = this.platformSpecificBuildOptions.signtoolOptions) === null || _a === void 0 ? void 0 : _a.certificatePassword, process.env.WIN_CSC_KEY_PASSWORD), super.doGetCscPassword());
    }
    async signIf(file) {
        const logFields = { file: builder_util_1.log.filePath(file) };
        if (!this.shouldSignFile(file, true)) {
            builder_util_1.log.info(logFields, "file signing skipped via signExts configuration");
            return false;
        }
        if (this.platformSpecificBuildOptions.signExecutable === false) {
            builder_util_1.log.info(logFields, "file signing skipped via signExecutable configuration");
            return false;
        }
        const promise = this.signingQueue.then(() => this._sign(file));
        this.signingQueue = promise.catch(e => {
            builder_util_1.log.warn({ file: builder_util_1.log.filePath(file), error: e.message }, "signing failed for file, queue will continue to next file");
            return false;
        });
        return promise;
    }
    async _sign(file) {
        const signOptions = {
            path: file,
            options: this.platformSpecificBuildOptions,
        };
        const didSignSuccessfully = await (0, windowsCodeSign_1.signWindows)(signOptions, this);
        if (!didSignSuccessfully && this.forceCodeSigning) {
            throw new builder_util_1.InvalidConfigurationError(`App is not signed and "forceCodeSigning" is set to true, please ensure that code signing configuration is correct, please see https://electron.build/code-signing`);
        }
        return didSignSuccessfully;
    }
    async signAndEditResources(file, arch, outDir, internalName, requestedExecutionLevel) {
        var _a, _b;
        const appInfo = this.appInfo;
        const files = [];
        const versionStrings = {
            FileDescription: appInfo.productName,
            ProductName: appInfo.productName,
            LegalCopyright: appInfo.copyright,
        };
        if (internalName != null) {
            versionStrings.InternalName = internalName;
            versionStrings.OriginalFilename = "";
        }
        if (appInfo.companyName != null) {
            versionStrings.CompanyName = appInfo.companyName;
        }
        if (this.platformSpecificBuildOptions.legalTrademarks != null) {
            versionStrings.LegalTrademarks = this.platformSpecificBuildOptions.legalTrademarks;
        }
        const iconPath = await this.getIconPath();
        if (iconPath != null) {
            files.push(iconPath);
        }
        const opts = {
            file,
            versionStrings,
            fileVersion: appInfo.shortVersion || appInfo.buildVersion,
            productVersion: appInfo.shortVersionWindows || appInfo.getVersionInWeirdWindowsForm(),
            requestedExecutionLevel,
            iconPath,
        };
        const config = this.config;
        const cscInfoForCacheDigest = !(0, flags_1.isBuildCacheEnabled)() || ci_info_1.isCI || config.electronDist != null ? null : await (await this.signingManager.value).cscInfo.value;
        let buildCacheManager = null;
        // resources editing doesn't change executable for the same input and executed quickly - no need to complicate
        if (cscInfoForCacheDigest != null) {
            const cscFile = cscInfoForCacheDigest.file;
            if (cscFile != null) {
                files.push(cscFile);
            }
            const timer = (0, timer_1.time)("executable cache");
            const hash = (0, crypto_1.createHash)("sha512");
            hash.update(config.electronVersion || "no electronVersion");
            hash.update(JSON.stringify(this.platformSpecificBuildOptions));
            hash.update(JSON.stringify(opts));
            hash.update(((_a = this.platformSpecificBuildOptions.signtoolOptions) === null || _a === void 0 ? void 0 : _a.certificateSha1) || "no certificateSha1");
            hash.update(((_b = this.platformSpecificBuildOptions.signtoolOptions) === null || _b === void 0 ? void 0 : _b.certificateSubjectName) || "no subjectName");
            const asar = path.resolve(this.getResourcesDir(outDir), "app.asar");
            if (await (0, builder_util_1.exists)(asar)) {
                hash.update((await (0, asar_1.readAsarHeader)(asar)).header);
            }
            else {
                hash.update("no asar");
            }
            buildCacheManager = new cacheManager_1.BuildCacheManager(outDir, file, arch);
            if (await buildCacheManager.copyIfValid(await (0, cacheManager_1.digest)(hash, files))) {
                timer.end();
                return;
            }
            timer.end();
        }
        const timer = (0, timer_1.time)("resource-edit&sign");
        await (0, resEdit_1.editWindowsResources)(opts);
        await this.signIf(file);
        timer.end();
        if (buildCacheManager != null) {
            await buildCacheManager.save();
        }
    }
    shouldSignFile(file, fallbackValue = false) {
        const isExe = file.endsWith(".exe");
        const signExts = this.platformSpecificBuildOptions.signExts;
        if (!(signExts === null || signExts === void 0 ? void 0 : signExts.length)) {
            return isExe || fallbackValue;
        }
        // process patterns ( !exe => exclude .exe, .dll => include .dll )
        // we process first to allow literal negatives in case a filename matches "help!.txt" or similar
        if (signExts.some(ext => file.endsWith(ext))) {
            return true;
        }
        // process negative patterns
        if (signExts.some(ext => ext.startsWith("!") && file.endsWith(ext.substring(1)))) {
            return false;
        }
        return isExe || fallbackValue;
    }
    createTransformerForExtraFiles(packContext) {
        if (this.platformSpecificBuildOptions.signAndEditExecutable === false || this.platformSpecificBuildOptions.signExecutable === false) {
            return null;
        }
        return file => {
            if (this.shouldSignFile(file)) {
                const parentDir = path.dirname(file);
                if (parentDir !== packContext.appOutDir) {
                    return new builder_util_1.CopyFileTransformer(file => this.signIf(file));
                }
            }
            return null;
        };
    }
    async signApp(packContext, isAsar) {
        const exeFileName = `${this.appInfo.productFilename}.exe`;
        const signingDisabled = this.platformSpecificBuildOptions.signExecutable === false || this.platformSpecificBuildOptions.signAndEditExecutable === false;
        if (signingDisabled && this.forceCodeSigning) {
            throw new builder_util_1.InvalidConfigurationError("Signing is disabled (`signExecutable: false` or `signAndEditExecutable: false`) but `forceCodeSigning` is enabled. Remove one of these options.");
        }
        if (this.platformSpecificBuildOptions.signAndEditExecutable === false) {
            builder_util_1.log.info({ exe: builder_util_1.log.filePath(path.join(packContext.appOutDir, exeFileName)) }, "executable resource editing and code signing skipped — signAndEditExecutable is false. To skip only code signing while keeping icon and metadata applied, use signExecutable: false instead.");
            return false;
        }
        const files = await (0, promises_1.readdir)(packContext.appOutDir);
        for (const file of files) {
            if (file === exeFileName) {
                await this.signAndEditResources(path.join(packContext.appOutDir, exeFileName), packContext.arch, packContext.outDir, path.basename(exeFileName, ".exe"), this.platformSpecificBuildOptions.requestedExecutionLevel);
            }
            else if (this.shouldSignFile(file)) {
                await this.signIf(path.join(packContext.appOutDir, file));
            }
        }
        if (!isAsar || this.platformSpecificBuildOptions.signExecutable === false) {
            return true;
        }
        const filesToSign = await Promise.all([
            this.walkSignableFiles(packContext.appOutDir, "resources", "app.asar.unpacked"),
            // Note: The `swiftshader` directory is absent in modern electron versions. `swiftshader/` held Chromium's legacy SwiftShader GL fallback (libEGL.dll / libGLESv2.dll), removed in Chromium 102 (Electron 19+) in favor of SwANGLE (ANGLE + SwiftShader Vulkan). This is kept here only for backwards compat with older Electron; `walk` no-ops on a missing dir (readdir ENOENT is swallowed), so this is harmless when the directory is absent.
            this.walkSignableFiles(packContext.appOutDir, "swiftshader"),
        ]);
        for (const file of filesToSign.flat(1)) {
            await this.signIf(file);
        }
        return true;
    }
    walkSignableFiles(baseDir, ...subpath) {
        return (0, builder_util_1.walk)(path.join(baseDir, ...subpath), (file, stat) => stat.isDirectory() || this.shouldSignFile(file));
    }
}
exports.WinPackager = WinPackager;
//# sourceMappingURL=winPackager.js.map
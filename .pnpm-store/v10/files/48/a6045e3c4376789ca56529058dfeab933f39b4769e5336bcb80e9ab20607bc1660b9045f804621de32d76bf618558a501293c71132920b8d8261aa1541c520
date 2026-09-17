"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PkgTarget = void 0;
exports.prepareProductBuildArgs = prepareProductBuildArgs;
exports.resolvePkgBuildVersion = resolvePkgBuildVersion;
exports.resolveScriptsDir = resolveScriptsDir;
const builder_util_1 = require("builder-util");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path = require("path");
const appInfo_1 = require("../appInfo");
const macCodeSign_1 = require("../codeSign/macCodeSign");
const core_1 = require("../core");
const plist_1 = require("../util/plist");
const license_1 = require("../util/license");
const certType = "Developer ID Installer";
// Maps electron-builder Arch to Apple's architecture names for productbuild requirements plist
function archToAppleArchitectures(arch) {
    switch (arch) {
        case builder_util_1.Arch.arm64:
            return ["arm64"];
        case builder_util_1.Arch.x64:
            return ["x86_64"];
        case builder_util_1.Arch.universal:
            return ["arm64", "x86_64"];
        case builder_util_1.Arch.ia32:
            return ["i386"];
        default:
            return ["arm64", "x86_64"];
    }
}
// http://www.shanekirk.com/2013/10/creating-flat-packages-in-osx/
// to use --scripts, we must build .app bundle separately using pkgbuild
// productbuild --scripts doesn't work (because scripts in this case not added to our package)
// https://github.com/electron-userland/@electron/osx-sign/issues/96#issuecomment-274986942
class PkgTarget extends core_1.Target {
    constructor(packager, outDir) {
        super("pkg");
        this.packager = packager;
        this.outDir = outDir;
        this.options = {
            allowAnywhere: true,
            allowCurrentUserHome: true,
            allowRootDirectory: true,
            ...this.packager.config.pkg,
        };
    }
    async build(appPath, arch) {
        const packager = this.packager;
        const options = this.options;
        const appInfo = packager.appInfo;
        // pkg doesn't like not ASCII symbols (Could not open package to list files: /Volumes/test/t-gIjdGK/test-project-0/dist/Test App ßW-1.1.0.pkg)
        const artifactName = packager.expandArtifactNamePattern(options, "pkg", arch);
        const artifactPath = path.join(this.outDir, artifactName);
        await packager.info.emitArtifactBuildStarted({
            targetPresentableName: "pkg",
            file: artifactPath,
            arch,
        });
        const keychainFile = (await packager.codeSigningInfo.value).keychainFile;
        const appOutDir = this.outDir;
        // https://developer.apple.com/library/content/documentation/DeveloperTools/Reference/DistributionDefinitionRef/Chapters/Distribution_XML_Ref.html
        const distInfoFile = path.join(appOutDir, "distribution.xml");
        const extraPackages = this.getExtraPackages();
        const innerPackageFile = path.join(appOutDir, `${(0, appInfo_1.filterCFBundleIdentifier)(appInfo.id)}.pkg`);
        const componentPropertyListFile = path.join(appOutDir, `${(0, appInfo_1.filterCFBundleIdentifier)(appInfo.id)}.plist`);
        const identity = (await Promise.all([
            (0, macCodeSign_1.findIdentity)(certType, options.identity || packager.platformSpecificBuildOptions.identity, keychainFile),
            this.customizeDistributionConfiguration(distInfoFile, appPath, extraPackages, arch),
            this.buildComponentPackage(appPath, componentPropertyListFile, innerPackageFile),
        ]))[0];
        if (identity == null && packager.forceCodeSigning) {
            throw new Error(`Cannot find valid "${certType}" to sign standalone installer, please see https://electron.build/code-signing`);
        }
        const args = prepareProductBuildArgs(identity, keychainFile);
        args.push("--distribution", distInfoFile);
        if (extraPackages) {
            args.push("--package-path", extraPackages.packagePath);
        }
        args.push(artifactPath);
        (0, builder_util_1.use)(options.productbuild, it => args.push(...it));
        await (0, builder_util_1.exec)("productbuild", args, {
            cwd: appOutDir,
        });
        await Promise.all([(0, promises_1.unlink)(innerPackageFile), (0, promises_1.unlink)(distInfoFile)]);
        await packager.helper.notarizeIfProvided(artifactPath);
        await packager.info.emitArtifactBuildCompleted({
            file: artifactPath,
            target: this,
            arch,
            safeArtifactName: packager.computeSafeArtifactName(artifactName, "pkg", arch),
            packager,
        });
    }
    getExtraPackages() {
        const extraPkgsDir = this.options.extraPkgsDir;
        if (extraPkgsDir == null) {
            return null;
        }
        const packagePath = path.join(this.packager.info.buildResourcesDir, extraPkgsDir);
        let files;
        try {
            files = (0, fs_1.readdirSync)(packagePath);
        }
        catch (e) {
            if (e.code === "ENOENT") {
                return null;
            }
            else {
                throw e;
            }
        }
        const packages = files.filter(file => file.endsWith(".pkg"));
        if (packages.length === 0) {
            return null;
        }
        return { packagePath, packages };
    }
    async customizeDistributionConfiguration(distInfoFile, appPath, extraPackages, arch) {
        const options = this.options;
        // Build requirements plist for productbuild to generate correct hostArchitectures and allowed-os-versions
        // This is the Apple-recommended way to specify architecture and OS requirements
        // See: man productbuild, section "PRE-INSTALL REQUIREMENTS PROPERTY LIST"
        const requirements = {};
        // Set architecture based on build target - productbuild will generate correct hostArchitectures in distribution XML
        // On macOS Big Sur+, productbuild defaults to both arm64 and x86_64 unless we specify otherwise
        requirements.arch = archToAppleArchitectures(arch);
        // Set minimum OS version - productbuild will generate allowed-os-versions in distribution XML
        const minimumSystemVersion = this.packager.platformSpecificBuildOptions.minimumSystemVersion;
        if (minimumSystemVersion != null) {
            requirements.os = [minimumSystemVersion];
        }
        const requirementsPlistFile = await this.packager.info.tempDirManager.getTempFile({ suffix: ".plist", prefix: "productbuild-requirements" });
        await (0, plist_1.savePlistFile)(requirementsPlistFile, requirements);
        const args = ["--synthesize", "--product", requirementsPlistFile, "--component", appPath];
        if (extraPackages) {
            extraPackages.packages.forEach(pkg => {
                args.push("--package", path.join(extraPackages.packagePath, pkg));
            });
        }
        args.push(distInfoFile);
        await (0, builder_util_1.exec)("productbuild", args, {
            cwd: this.outDir,
        });
        let distInfo = await (0, promises_1.readFile)(distInfoFile, "utf-8");
        if (options.mustClose != null && options.mustClose.length !== 0) {
            const startContent = `    <pkg-ref id="${this.packager.appInfo.id}">\n        <must-close>\n`;
            const endContent = "        </must-close>\n    </pkg-ref>\n</installer-gui-script>";
            let mustCloseContent = "";
            options.mustClose.forEach(appId => {
                mustCloseContent += `            <app id="${appId}"/>\n`;
            });
            distInfo = distInfo.replace("</installer-gui-script>", `${startContent}${mustCloseContent}${endContent}`);
        }
        const insertIndex = distInfo.lastIndexOf("</installer-gui-script>");
        distInfo =
            distInfo.substring(0, insertIndex) +
                `    <domains enable_anywhere="${options.allowAnywhere}" enable_currentUserHome="${options.allowCurrentUserHome}" enable_localSystem="${options.allowRootDirectory}" />\n` +
                distInfo.substring(insertIndex);
        if (options.background != null) {
            const background = await this.packager.getResource(options.background.file);
            if (background != null) {
                const alignment = options.background.alignment || "center";
                // noinspection SpellCheckingInspection
                const scaling = options.background.scaling || "tofit";
                distInfo = distInfo.substring(0, insertIndex) + `    <background file="${background}" alignment="${alignment}" scaling="${scaling}"/>\n` + distInfo.substring(insertIndex);
                distInfo =
                    distInfo.substring(0, insertIndex) + `    <background-darkAqua file="${background}" alignment="${alignment}" scaling="${scaling}"/>\n` + distInfo.substring(insertIndex);
            }
        }
        const welcome = await this.packager.getResource(options.welcome);
        if (welcome != null) {
            distInfo = distInfo.substring(0, insertIndex) + `    <welcome file="${welcome}"/>\n` + distInfo.substring(insertIndex);
        }
        const license = await (0, license_1.getNotLocalizedLicenseFile)(options.license, this.packager);
        if (license != null) {
            distInfo = distInfo.substring(0, insertIndex) + `    <license file="${license}"/>\n` + distInfo.substring(insertIndex);
        }
        const conclusion = await this.packager.getResource(options.conclusion);
        if (conclusion != null) {
            distInfo = distInfo.substring(0, insertIndex) + `    <conclusion file="${conclusion}"/>\n` + distInfo.substring(insertIndex);
        }
        (0, builder_util_1.debug)(distInfo);
        await (0, promises_1.writeFile)(distInfoFile, distInfo);
    }
    async buildComponentPackage(appPath, propertyListOutputFile, packageOutputFile) {
        var _a;
        const options = this.options;
        const rootPath = path.dirname(appPath);
        // first produce a component plist template
        await (0, builder_util_1.exec)("pkgbuild", ["--analyze", "--root", rootPath, propertyListOutputFile]);
        // process the template plist
        const plistInfo = (await (0, plist_1.parsePlistFile)(propertyListOutputFile)).filter((it) => it.RootRelativeBundlePath !== "Electron.dSYM");
        let packageInfo = {};
        if (plistInfo.length > 0) {
            packageInfo = plistInfo[0];
            // ChildBundles lists all of electron binaries within the .app.
            // There is no particular reason for removing that key, except to be as close as possible to
            // the PackageInfo generated by previous versions of electron-builder.
            delete packageInfo.ChildBundles;
            if (options.isRelocatable != null) {
                packageInfo.BundleIsRelocatable = options.isRelocatable;
            }
            if (options.isVersionChecked != null) {
                packageInfo.BundleIsVersionChecked = options.isVersionChecked;
            }
            if (options.hasStrictIdentifier != null) {
                packageInfo.BundleHasStrictIdentifier = options.hasStrictIdentifier;
            }
            if (options.overwriteAction != null) {
                packageInfo.BundleOverwriteAction = options.overwriteAction;
            }
        }
        // now build the package
        const args = ["--root", rootPath, "--identifier", this.packager.appInfo.id, "--component-plist", propertyListOutputFile];
        (0, builder_util_1.use)(this.options.installLocation || "/Applications", it => args.push("--install-location", it));
        // Pass the version explicitly — macOS 15+ pkgbuild no longer infers it from the bundle
        const pkgVersion = await resolvePkgBuildVersion(appPath, this.packager.appInfo.version);
        args.push("--version", pkgVersion);
        const scriptsDir = resolveScriptsDir(this.packager.info.buildResourcesDir, options.scripts);
        if (scriptsDir && ((_a = (await (0, builder_util_1.statOrNull)(scriptsDir))) === null || _a === void 0 ? void 0 : _a.isDirectory())) {
            const dirContents = (0, fs_1.readdirSync)(scriptsDir);
            dirContents.forEach(name => {
                if (name.includes("preinstall")) {
                    packageInfo.BundlePreInstallScriptPath = name;
                }
                else if (name.includes("postinstall")) {
                    packageInfo.BundlePostInstallScriptPath = name;
                }
            });
            args.push("--scripts", scriptsDir);
        }
        if (plistInfo.length > 0) {
            await (0, plist_1.savePlistFile)(propertyListOutputFile, plistInfo);
        }
        args.push(packageOutputFile);
        await (0, builder_util_1.exec)("pkgbuild", args);
    }
}
exports.PkgTarget = PkgTarget;
function prepareProductBuildArgs(identity, keychain) {
    const args = [];
    if (identity != null) {
        args.push("--sign", identity.hash);
        if (keychain != null) {
            args.push("--keychain", keychain);
        }
    }
    return args;
}
/**
 * Resolves the version string to pass as `--version` to pkgbuild.
 * Reads CFBundleShortVersionString from the app bundle's Info.plist (what pkgbuild
 * previously inferred automatically), falling back to the appInfo version.
 */
async function resolvePkgBuildVersion(appPath, fallback) {
    const infoPlistPath = path.join(appPath, "Contents", "Info.plist");
    try {
        const plist = await (0, plist_1.parsePlistFile)(infoPlistPath);
        const version = plist.CFBundleShortVersionString;
        return typeof version === "string" && version.length > 0 ? version : fallback;
    }
    catch {
        return fallback;
    }
}
/**
 * Resolves the scripts directory path for pkgbuild.
 * Returns null when scripts is explicitly set to null (disabled).
 * Returns a custom path when scripts is a non-empty string.
 * Falls back to the default "pkg-scripts" directory otherwise.
 */
function resolveScriptsDir(buildResourcesDir, scripts) {
    if (scripts === null) {
        return null;
    }
    return scripts != null ? path.resolve(buildResourcesDir, scripts) : path.join(buildResourcesDir, "pkg-scripts");
}
//# sourceMappingURL=pkg.js.map
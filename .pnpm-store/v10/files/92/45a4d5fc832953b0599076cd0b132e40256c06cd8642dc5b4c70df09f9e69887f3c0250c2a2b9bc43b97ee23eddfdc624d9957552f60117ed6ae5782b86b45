"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DmgTarget = void 0;
const app_builder_lib_1 = require("app-builder-lib");
const macCodeSign_1 = require("app-builder-lib/out/codeSign/macCodeSign");
const differentialUpdateInfoBuilder_1 = require("app-builder-lib/out/targets/differentialUpdateInfoBuilder");
const builder_util_1 = require("builder-util");
const filename_1 = require("builder-util/out/filename");
const os_1 = require("os");
const path = require("path");
const dmgLicense_1 = require("./dmgLicense");
const dmgUtil_1 = require("./dmgUtil");
const hdiuil_1 = require("./hdiuil");
class DmgTarget extends app_builder_lib_1.Target {
    constructor(packager, outDir) {
        super("dmg");
        this.packager = packager;
        this.outDir = outDir;
        this.options = this.packager.config.dmg || Object.create(null);
        this.isAsyncSupported = false;
    }
    async build(appPath, arch) {
        const packager = this.packager;
        // tslint:disable-next-line:no-invalid-template-strings
        const artifactName = packager.expandArtifactNamePattern(this.options, "dmg", arch, "${productName}-" + (packager.platformSpecificBuildOptions.bundleShortVersion || "${version}") + "-${arch}.${ext}", true, packager.platformSpecificBuildOptions.defaultArch);
        const artifactPath = path.join(this.outDir, artifactName);
        await packager.info.emitArtifactBuildStarted({
            targetPresentableName: "DMG",
            file: artifactPath,
            arch,
        });
        const volumeName = (0, filename_1.sanitizeFileName)(this.computeVolumeName(arch, this.options.title));
        const specification = await this.computeDmgOptions(appPath);
        const licenseData = await (0, dmgLicense_1.addLicenseToDmg)(packager, this.options.license);
        if (!(await (0, dmgUtil_1.customizeDmg)({ appPath, artifactPath, volumeName, specification, packager, licenseData }))) {
            return;
        }
        if (this.options.internetEnabled && parseInt((0, os_1.release)().split(".")[0], 10) < 19) {
            await (0, hdiuil_1.hdiUtil)(addLogLevel(["internet-enable"]).concat(artifactPath));
        }
        if (packager.packagerOptions.effectiveOptionComputed != null) {
            await packager.packagerOptions.effectiveOptionComputed({ licenseData });
        }
        if (this.options.sign === true) {
            await this.signDmg(artifactPath);
        }
        const safeArtifactName = packager.computeSafeArtifactName(artifactName, "dmg");
        const updateInfo = this.options.writeUpdateInfo === false ? null : await (0, differentialUpdateInfoBuilder_1.createBlockmap)(artifactPath, this, packager, safeArtifactName);
        await packager.info.emitArtifactBuildCompleted({
            file: artifactPath,
            safeArtifactName,
            target: this,
            arch,
            packager,
            isWriteUpdateInfo: updateInfo != null,
            updateInfo,
        });
    }
    async signDmg(artifactPath) {
        if (!(0, macCodeSign_1.isSignAllowed)(false)) {
            return;
        }
        const packager = this.packager;
        const qualifier = packager.platformSpecificBuildOptions.identity;
        // explicitly disabled if set to null
        if (qualifier === null) {
            // macPackager already somehow handle this situation, so, here just return
            return;
        }
        const keychainFile = (await packager.codeSigningInfo.value).keychainFile;
        const certificateType = "Developer ID Application";
        let identity = await (0, macCodeSign_1.findIdentity)(certificateType, qualifier, keychainFile);
        if (identity == null) {
            identity = await (0, macCodeSign_1.findIdentity)("Mac Developer", qualifier, keychainFile);
            if (identity == null) {
                return;
            }
        }
        const args = ["--sign", identity.hash];
        if (keychainFile != null) {
            args.push("--keychain", keychainFile);
        }
        args.push(artifactPath);
        await (0, builder_util_1.exec)("codesign", args);
    }
    computeVolumeName(arch, custom) {
        const appInfo = this.packager.appInfo;
        const shortVersion = this.packager.platformSpecificBuildOptions.bundleShortVersion || appInfo.version;
        const archString = (0, builder_util_1.getArchSuffix)(arch, this.packager.platformSpecificBuildOptions.defaultArch);
        if (custom == null) {
            return `${appInfo.productFilename} ${shortVersion}${archString}`;
        }
        return custom
            .replace(/\${arch}/g, archString)
            .replace(/\${shortVersion}/g, shortVersion)
            .replace(/\${version}/g, appInfo.version)
            .replace(/\${name}/g, appInfo.name)
            .replace(/\${productName}/g, appInfo.productName);
    }
    // public to test
    async computeDmgOptions(appPath) {
        const packager = this.packager;
        const specification = { ...this.options };
        if (specification.icon == null && specification.icon !== null) {
            specification.icon = await packager.getIconPath();
        }
        if (specification.icon != null && (0, builder_util_1.isEmptyOrSpaces)(specification.icon)) {
            throw new builder_util_1.InvalidConfigurationError("dmg.icon cannot be specified as empty string");
        }
        const background = specification.background;
        if (specification.backgroundColor != null) {
            if (background != null) {
                throw new builder_util_1.InvalidConfigurationError("Both dmg.backgroundColor and dmg.background are specified — please set the only one");
            }
        }
        else if (background == null) {
            specification.background = await (0, dmgUtil_1.computeBackground)(packager);
        }
        else {
            specification.background = await packager.getResource(background);
        }
        if (specification.format == null) {
            if (process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL != null) {
                specification.format = "UDZO";
            }
            else if (packager.compression === "store") {
                specification.format = "UDRO";
            }
            else {
                specification.format = packager.compression === "maximum" ? "UDBZ" : "UDZO";
            }
        }
        if (specification.contents == null) {
            specification.contents = [
                {
                    x: 130,
                    y: 220,
                    path: appPath,
                    type: "file",
                    name: `${packager.appInfo.productFilename}.app`,
                },
                {
                    x: 410,
                    y: 220,
                    type: "link",
                    path: "/Applications",
                },
            ];
        }
        return specification;
    }
}
exports.DmgTarget = DmgTarget;
function addLogLevel(args, isVerbose = process.env.DEBUG_DMG === "true") {
    args.push(isVerbose ? "-verbose" : "-quiet");
    return args;
}
//# sourceMappingURL=dmg.js.map
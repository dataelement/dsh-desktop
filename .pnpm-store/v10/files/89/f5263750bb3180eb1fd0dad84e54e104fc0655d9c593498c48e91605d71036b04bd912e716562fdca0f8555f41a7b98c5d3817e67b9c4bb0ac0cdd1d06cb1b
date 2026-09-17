"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const fs_extra_1 = require("fs-extra");
const promises_1 = require("fs/promises");
const path = require("path");
const appInfo_1 = require("../appInfo");
const core_1 = require("../core");
const errorMessages = require("../errorMessages");
const PublishManager_1 = require("../publish/PublishManager");
const builder_util_runtime_2 = require("builder-util-runtime");
const bundledTool_1 = require("../util/bundledTool");
const hash_1 = require("../util/hash");
const macosVersion_1 = require("../util/macosVersion");
const pathManager_1 = require("../util/pathManager");
const LinuxTargetHelper_1 = require("./LinuxTargetHelper");
const linux_1 = require("../toolsets/linux");
class FpmTarget extends core_1.Target {
    constructor(name, packager, helper, outDir) {
        super(name, false);
        this.packager = packager;
        this.helper = helper;
        this.outDir = outDir;
        this.options = (0, builder_util_runtime_1.deepAssign)({}, this.packager.platformSpecificBuildOptions, this.packager.config[this.name]);
        this.scriptFiles = this.createScripts();
    }
    async createScripts() {
        const defaultTemplatesDir = (0, pathManager_1.getTemplatePath)("linux");
        const packager = this.packager;
        /** Escape a string value for safe interpolation inside a bash single-quoted
         *  string (`'...'`).  The only character that can break out of a POSIX
         *  single-quoted context is a literal single-quote; we replace it with the
         *  standard `'\''` sequence (end quote → escaped quote → start quote).
         *
         *  sanitize-filename removes characters that are illegal in filenames but
         *  deliberately keeps `'` because it is valid on POSIX systems.  Without
         *  this extra step, an app named `O'Brien` would terminate the quoted path
         *  inside the generated after-install / after-remove shell scripts, enabling
         *  arbitrary command injection when the package is installed as root. */
        function bashSingleQuoteEscape(value) {
            return value.replace(/'/g, "'\\''");
        }
        // Bash-script templates embed executable and sanitizedProductName inside
        // single-quoted shell paths — escape single quotes to prevent injection.
        const bashTemplateOptions = {
            // old API compatibility
            executable: bashSingleQuoteEscape(packager.executableName),
            sanitizedProductName: bashSingleQuoteEscape(packager.appInfo.sanitizedProductName),
            productFilename: packager.appInfo.productFilename,
            ...packager.platformSpecificBuildOptions,
        };
        // The AppArmor profile template uses these values inside double-quoted
        // AppArmor path patterns — no single-quote escaping needed or wanted.
        const appArmorTemplateOptions = {
            executable: packager.executableName,
            sanitizedProductName: packager.appInfo.sanitizedProductName,
            productFilename: packager.appInfo.productFilename,
            ...packager.platformSpecificBuildOptions,
        };
        function getResource(value, defaultFile) {
            if (value == null) {
                return path.join(defaultTemplatesDir, defaultFile);
            }
            return path.resolve(packager.projectDir, value);
        }
        return {
            afterInstall: await writeConfigFile(packager.info.tempDirManager, getResource(this.options.afterInstall, "after-install.tpl"), bashTemplateOptions),
            afterRemove: await writeConfigFile(packager.info.tempDirManager, getResource(this.options.afterRemove, "after-remove.tpl"), bashTemplateOptions),
            appArmor: await writeConfigFile(packager.info.tempDirManager, getResource(this.options.appArmorProfile, "apparmor-profile.tpl"), appArmorTemplateOptions),
        };
    }
    checkOptions() {
        return this.computeFpmMetaInfoOptions();
    }
    async computeFpmMetaInfoOptions() {
        var _a;
        const packager = this.packager;
        const projectUrl = await packager.appInfo.computePackageUrl();
        const errors = [];
        if (projectUrl == null) {
            errors.push("Please specify project homepage, see https://www.electron.build/configuration#metadata");
        }
        const options = this.options;
        let author = options.maintainer;
        if (author == null) {
            const a = packager.info.metadata.author;
            if (a == null || a.email == null) {
                errors.push(errorMessages.authorEmailIsMissed);
            }
            else {
                author = `${a.name} <${a.email}>`;
            }
        }
        if (errors.length > 0) {
            throw new Error(errors.join("\n\n"));
        }
        return {
            name: (_a = options.packageName) !== null && _a !== void 0 ? _a : this.packager.appInfo.linuxPackageName,
            maintainer: author,
            url: projectUrl,
            vendor: options.vendor || author,
        };
    }
    async build(appOutDir, arch) {
        var _a, _b;
        const target = this.name;
        // tslint:disable:no-invalid-template-strings
        let nameFormat = "${name}-${version}-${arch}.${ext}";
        let isUseArchIfX64 = false;
        if (target === "deb") {
            nameFormat = "${name}_${version}_${arch}.${ext}";
            isUseArchIfX64 = true;
        }
        else if (target === "rpm") {
            nameFormat = "${name}-${version}.${arch}.${ext}";
            isUseArchIfX64 = true;
        }
        const packager = this.packager;
        const artifactName = packager.expandArtifactNamePattern(this.options, target, arch, nameFormat, !isUseArchIfX64);
        const artifactPath = path.join(this.outDir, artifactName);
        await packager.info.emitArtifactBuildStarted({
            targetPresentableName: target,
            file: artifactPath,
            arch,
        });
        await (0, builder_util_1.unlinkIfExists)(artifactPath);
        if (packager.packagerOptions.prepackaged != null) {
            await (0, promises_1.mkdir)(this.outDir, { recursive: true });
        }
        const linuxDistType = packager.packagerOptions.prepackaged || path.join(this.outDir, `linux${(0, builder_util_1.getArchSuffix)(arch)}-unpacked`);
        const resourceDir = packager.getResourcesDir(linuxDistType);
        const publishConfig = this.supportsAutoUpdate(target)
            ? await (0, PublishManager_1.getAppUpdatePublishConfiguration)(packager, this.options, arch, false /* in any case validation will be done on publish step */)
            : null;
        if (publishConfig != null) {
            builder_util_1.log.info({ resourceDir: builder_util_1.log.filePath(resourceDir) }, `adding autoupdate files for: ${target}`);
            await (0, fs_extra_1.outputFile)(path.join(resourceDir, "app-update.yml"), (0, builder_util_1.serializeToYaml)(publishConfig));
            // Extra file needed for auto-updater to detect installation method
            await (0, fs_extra_1.outputFile)(path.join(resourceDir, "package-type"), target);
        }
        const scripts = await this.scriptFiles;
        // Install AppArmor support for ubuntu 24+
        // https://github.com/electron-userland/electron-builder/issues/8635
        await (0, fs_extra_1.copyFile)(scripts.appArmor, path.join(resourceDir, "apparmor-profile"));
        const appInfo = packager.appInfo;
        const options = this.options;
        const synopsis = options.synopsis;
        const args = [
            "--architecture",
            (0, builder_util_1.toLinuxArchString)(arch, target),
            "--after-install",
            scripts.afterInstall,
            "--after-remove",
            scripts.afterRemove,
            "--description",
            (0, appInfo_1.smarten)(target === "rpm" ? this.helper.getDescription(options) : `${synopsis || ""}\n ${this.helper.getDescription(options)}`),
            "--version",
            this.helper.getSanitizedVersion(target),
            "--package",
            artifactPath,
        ];
        const meta = await this.computeFpmMetaInfoOptions();
        args.push(...(0, builder_util_runtime_2.objectToArgs)({ name: meta.name, maintainer: (_a = meta.maintainer) !== null && _a !== void 0 ? _a : null, vendor: meta.vendor, url: meta.url }));
        const packageCategory = options.packageCategory;
        if (packageCategory != null) {
            args.push("--category", packageCategory);
        }
        if (target === "deb") {
            args.push("--deb-priority", (_b = options.priority) !== null && _b !== void 0 ? _b : "optional");
        }
        else if (target === "rpm") {
            if (synopsis != null) {
                args.push("--rpm-summary", (0, appInfo_1.smarten)(synopsis));
            }
        }
        const fpmConfiguration = {
            args,
            target,
        };
        if (options.compression != null) {
            fpmConfiguration.compression = options.compression;
        }
        // noinspection JSDeprecatedSymbols
        const depends = options.depends;
        if (depends != null) {
            if (Array.isArray(depends)) {
                fpmConfiguration.customDepends = depends;
            }
            else if (typeof depends === "string") {
                fpmConfiguration.customDepends = [depends];
            }
            else {
                throw new Error(`depends must be Array or String, but specified as: ${depends}`);
            }
        }
        else {
            fpmConfiguration.customDepends = this.getDefaultDepends(target);
        }
        if (target === "deb") {
            const recommends = options.recommends;
            if (recommends) {
                fpmConfiguration.customRecommends = (0, builder_util_1.asArray)(recommends);
            }
            else {
                fpmConfiguration.customRecommends = this.getDefaultRecommends(target);
            }
        }
        (0, builder_util_1.use)(packager.info.metadata.license, it => args.push("--license", it));
        (0, builder_util_1.use)(appInfo.buildNumber, it => args.push("--iteration", 
        // dashes are not supported for iteration in older versions of fpm
        // https://github.com/jordansissel/fpm/issues/1833
        it.split("-").join("_")));
        (0, builder_util_1.use)(options.fpm, it => args.push(...it));
        args.push(`${appOutDir}/=${LinuxTargetHelper_1.installPrefix}/${appInfo.sanitizedProductName}`);
        for (const icon of await this.helper.icons) {
            const extWithDot = path.extname(icon.file);
            const sizeName = extWithDot === ".svg" ? "scalable" : `${icon.size}x${icon.size}`;
            args.push(`${icon.file}=/usr/share/icons/hicolor/${sizeName}/apps/${packager.executableName}${extWithDot}`);
        }
        const mimeTypeFilePath = await this.helper.mimeTypeFiles;
        if (mimeTypeFilePath != null) {
            args.push(`${mimeTypeFilePath}=/usr/share/mime/packages/${packager.executableName}.xml`);
        }
        const desktopFilePath = await this.helper.writeDesktopEntry(this.options);
        args.push(`${desktopFilePath}=/usr/share/applications/${this.helper.getDesktopFileName()}.desktop`);
        if (packager.packagerOptions.effectiveOptionComputed != null && (await packager.packagerOptions.effectiveOptionComputed([args, desktopFilePath]))) {
            return;
        }
        const env = {
            ...(0, builder_util_1.stripSensitiveEnvVars)(process.env),
        };
        // rpmbuild wants directory rpm with some default config files. Even if we can use dylibbundler, path to such config files are not changed (we need to replace in the binary)
        // so, for now, brew install rpm is still required.
        if (target !== "rpm" && (await (0, macosVersion_1.isMacOsSierra)())) {
            const linuxToolsPath = await (0, linux_1.getLinuxToolsPath)();
            Object.assign(env, {
                PATH: (0, bundledTool_1.computeEnv)(process.env.PATH, [path.join(linuxToolsPath, "bin")]),
                DYLD_LIBRARY_PATH: (0, bundledTool_1.computeEnv)(process.env.DYLD_LIBRARY_PATH, [path.join(linuxToolsPath, "lib")]),
            });
        }
        await this.executeFpm(target, fpmConfiguration, env);
        let info = {
            file: artifactPath,
            target: this,
            arch,
            packager,
        };
        if (publishConfig != null) {
            info = {
                ...info,
                safeArtifactName: packager.computeSafeArtifactName(artifactName, target, arch, !isUseArchIfX64),
                isWriteUpdateInfo: true,
                updateInfo: {
                    sha512: await (0, hash_1.hashFile)(artifactPath),
                    size: (await (0, fs_extra_1.stat)(artifactPath)).size,
                },
            };
        }
        await packager.info.emitArtifactBuildCompleted(info);
    }
    async executeFpm(target, fpmConfiguration, env) {
        var _a, _b, _c;
        const fpmArgs = ["-s", "dir", "--force", "-t", target];
        const forceDebugLogging = process.env.FPM_DEBUG === "true";
        if (forceDebugLogging) {
            fpmArgs.push("--debug");
        }
        if (builder_util_1.log.isDebugEnabled) {
            fpmArgs.push("--log", "debug");
        }
        (_a = fpmConfiguration.customDepends) === null || _a === void 0 ? void 0 : _a.forEach(it => fpmArgs.push("-d", it));
        if (target === "deb") {
            (_b = fpmConfiguration.customRecommends) === null || _b === void 0 ? void 0 : _b.forEach(it => fpmArgs.push("--deb-recommends", it));
        }
        const defaultCompression = target === "rpm" ? "xzmt" : "xz";
        fpmArgs.push(...this.configureTargetSpecificOptions(target, (_c = fpmConfiguration.compression) !== null && _c !== void 0 ? _c : defaultCompression));
        fpmArgs.push(...fpmConfiguration.args);
        const fpmPath = await (0, linux_1.getFpmPath)();
        await (0, builder_util_1.exec)(fpmPath, fpmArgs, { env }).catch(e => {
            if (e.message.includes("Need executable 'rpmbuild' to convert dir to rpm")) {
                const hint = "to build rpm, executable rpmbuild is required, please install rpm package on your system. ";
                if (process.platform === "darwin") {
                    builder_util_1.log.error(null, hint + "(brew install rpm)");
                }
                else {
                    builder_util_1.log.error(null, hint + "(sudo apt-get install rpm)");
                }
            }
            if (e.message.includes("xz: not found")) {
                const hint = "to build rpm, executable xz is required, please install xz package on your system. ";
                if (process.platform === "darwin") {
                    builder_util_1.log.error(null, hint + "(brew install xz)");
                }
                else {
                    builder_util_1.log.error(null, hint + "(sudo apt-get install xz-utils)");
                }
            }
            if (e.message.includes("error: File not found")) {
                builder_util_1.log.error({ fpmArgs, ...fpmConfiguration }, "fpm failed to find the specified files. Please check your configuration and ensure all paths are correct. To see what files triggered this, set the environment variable FPM_DEBUG=true");
                if (forceDebugLogging) {
                    builder_util_1.log.error(null, e.message);
                }
                throw new Error(`FPM failed to find the specified files. Please check your configuration and ensure all paths are correct. Command: ${fpmPath} ${fpmArgs.join(" ")}`);
            }
            throw e;
        });
    }
    supportsAutoUpdate(target) {
        return ["deb", "rpm", "pacman"].includes(target);
    }
    getDefaultDepends(target) {
        switch (target) {
            case "deb":
                return ["libgtk-3-0", "libnotify4", "libnss3", "libxss1", "libxtst6", "xdg-utils", "libatspi2.0-0", "libuuid1", "libsecret-1-0"];
            case "rpm":
                return [
                    "gtk3" /* for electron 2+ (electron 1 uses gtk2, but this old version is not supported anymore) */,
                    "libnotify",
                    "nss",
                    "libXScrnSaver",
                    "(libXtst or libXtst6)",
                    "xdg-utils",
                    "at-spi2-core" /* since 5.0.0 */,
                    "(libuuid or libuuid1)" /* since 4.0.0 */,
                ];
            case "pacman":
                return ["c-ares", "ffmpeg", "gtk3", "http-parser", "libevent", "libvpx", "libxslt", "libxss", "minizip", "nss", "re2", "snappy", "libnotify", "libappindicator-gtk3"];
            default:
                return [];
        }
    }
    getDefaultRecommends(target) {
        switch (target) {
            case "deb":
                return ["libappindicator3-1"];
            default:
                return [];
        }
    }
    configureTargetSpecificOptions(target, compression) {
        switch (target) {
            case "rpm":
                return ["--rpm-os", "linux", "--rpm-compression", compression === "xz" ? "xzmt" : compression];
            case "deb":
                return ["--deb-compression", compression];
            case "pacman":
                return ["--pacman-compression", compression];
        }
        return [];
    }
}
exports.default = FpmTarget;
async function writeConfigFile(tmpDir, templatePath, options) {
    //noinspection JSUnusedLocalSymbols
    function replacer(match, p1) {
        if (p1 in options) {
            return options[p1];
        }
        else {
            throw new Error(`Macro ${p1} is not defined`);
        }
    }
    const config = (await (0, promises_1.readFile)(templatePath, "utf8")).replace(/\${([a-zA-Z]+)}/g, replacer).replace(/<%=([a-zA-Z]+)%>/g, (match, p1) => {
        builder_util_1.log.warn("<%= varName %> is deprecated, please use ${varName} instead");
        return replacer(match, p1.trim());
    });
    const outputPath = await tmpDir.getTempFile({ suffix: path.basename(templatePath, ".tpl") });
    await (0, fs_extra_1.outputFile)(outputPath, config);
    return outputPath;
}
//# sourceMappingURL=FpmTarget.js.map
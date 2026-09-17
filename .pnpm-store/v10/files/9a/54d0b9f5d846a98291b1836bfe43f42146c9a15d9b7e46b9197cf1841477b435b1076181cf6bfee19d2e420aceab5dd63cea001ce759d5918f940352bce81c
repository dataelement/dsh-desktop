"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_RUN_ENTRYPOINT = void 0;
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const lazy_val_1 = require("lazy-val");
const path = require("path");
const core_1 = require("../../core");
const PublishManager_1 = require("../../publish/PublishManager");
const license_1 = require("../../util/license");
const targetUtil_1 = require("../targetUtil");
const appImageUtil_1 = require("./appImageUtil");
const builder_util_runtime_1 = require("builder-util-runtime");
// https://unix.stackexchange.com/questions/375191/append-to-sub-directory-inside-squashfs-file
exports.APP_RUN_ENTRYPOINT = "AppRun";
class AppImageTarget extends core_1.Target {
    constructor(_ignored, packager, helper, outDir) {
        super("appImage");
        this.packager = packager;
        this.helper = helper;
        this.outDir = outDir;
        this.options = (0, builder_util_runtime_1.deepAssign)({}, this.packager.platformSpecificBuildOptions, this.packager.config[this.name]);
        this.desktopEntry = new lazy_val_1.Lazy(() => {
            var _a, _b;
            const appimageTool = (_a = packager.config.toolsets) === null || _a === void 0 ? void 0 : _a.appimage;
            const defaultArgs = appimageTool == null || appimageTool === "0.0.0" ? ["--no-sandbox"] : [];
            const args = (_b = this.options.executableArgs) !== null && _b !== void 0 ? _b : defaultArgs;
            const exec = [exports.APP_RUN_ENTRYPOINT, ...args, "%U"].join(" ");
            return helper.computeDesktopEntry(this.options, exec, {
                "X-AppImage-Version": `${packager.appInfo.buildVersion}`,
            });
        });
    }
    async build(appOutDir, arch) {
        var _a;
        const packager = this.packager;
        const options = this.options;
        // https://github.com/electron-userland/electron-builder/issues/775
        // https://github.com/electron-userland/electron-builder/issues/1726
        const artifactName = packager.expandArtifactNamePattern(options, "AppImage", arch);
        const artifactPath = path.join(this.outDir, artifactName);
        await packager.info.emitArtifactBuildStarted({
            targetPresentableName: "AppImage",
            file: artifactPath,
            arch,
        });
        // Parallelize independent async operations
        const [publishConfig, stageDir, desktopEntry, icons, license] = await Promise.all([
            (0, PublishManager_1.getAppUpdatePublishConfiguration)(packager, options, arch, false),
            (0, targetUtil_1.createStageDir)(this, packager, arch),
            this.desktopEntry.value,
            this.helper.icons,
            (0, license_1.getNotLocalizedLicenseFile)(options.license, this.packager, ["txt", "html"]),
        ]);
        if (publishConfig != null) {
            await (0, fs_extra_1.outputFile)(path.join(packager.getResourcesDir(appOutDir), "app-update.yml"), (0, builder_util_1.serializeToYaml)(publishConfig));
        }
        // Validated once here; throws InvalidConfigurationError for path traversal / NUL.
        const desktopBaseName = this.helper.getDesktopFileName();
        if (this.packager.packagerOptions.effectiveOptionComputed != null &&
            (await this.packager.packagerOptions.effectiveOptionComputed({ desktop: desktopEntry, desktopFileName: `${desktopBaseName}.desktop` }))) {
            await stageDir.cleanup();
            return;
        }
        let updateInfo;
        try {
            const appimageTool = (_a = this.packager.config.toolsets) === null || _a === void 0 ? void 0 : _a.appimage;
            if (appimageTool == null || appimageTool === "0.0.0") {
                updateInfo = await (0, appImageUtil_1.buildLegacyFuse2AppImage)({
                    appDir: appOutDir,
                    stageDir: stageDir.dir,
                    arch,
                    output: artifactPath,
                    options: {
                        productName: packager.appInfo.productName,
                        productFilename: packager.appInfo.productFilename,
                        executableName: packager.executableName,
                        license,
                        desktopEntry,
                        icons,
                        fileAssociations: packager.fileAssociations,
                        desktopBaseName,
                        compression: (() => {
                            const c = options.compression;
                            if (c === "xz" || c === "gzip") {
                                return c;
                            }
                            if (packager.compression === "maximum") {
                                return "xz";
                            }
                            return undefined; // normal/store/unset/zstd → mksquashfs defaults to gzip
                        })(),
                    },
                });
            }
            else {
                updateInfo = await (0, appImageUtil_1.buildStaticRuntimeAppImage)(appimageTool, {
                    appDir: appOutDir,
                    stageDir: stageDir.dir,
                    arch,
                    output: artifactPath,
                    options: {
                        productName: packager.appInfo.productName,
                        productFilename: packager.appInfo.productFilename,
                        executableName: packager.executableName,
                        license,
                        desktopEntry,
                        icons,
                        fileAssociations: packager.fileAssociations,
                        desktopBaseName,
                        compression: (() => {
                            const c = options.compression;
                            if (c === "gzip" || c === "zstd") {
                                return c;
                            }
                            if (c === "xz") {
                                return "zstd"; // nearest equivalent; static runtime does not support xz
                            }
                            if (packager.compression === "store") {
                                return "gzip";
                            }
                            return "zstd"; // maximum/normal/unset → zstd for static runtime
                        })(),
                    },
                });
            }
        }
        catch (error) {
            builder_util_1.log.error({ error: error.message }, "failed to build AppImage");
            throw error;
        }
        finally {
            await stageDir.cleanup().catch(() => { });
        }
        await packager.info.emitArtifactBuildCompleted({
            file: artifactPath,
            safeArtifactName: packager.computeSafeArtifactName(artifactName, "AppImage", arch, false),
            target: this,
            arch,
            packager,
            isWriteUpdateInfo: true,
            updateInfo,
        });
    }
}
exports.default = AppImageTarget;
//# sourceMappingURL=AppImageTarget.js.map
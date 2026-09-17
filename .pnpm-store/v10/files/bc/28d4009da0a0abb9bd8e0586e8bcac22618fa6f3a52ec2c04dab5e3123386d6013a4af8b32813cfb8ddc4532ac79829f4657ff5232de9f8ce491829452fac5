"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const path = require("path");
const MsiTarget_1 = require("./MsiTarget");
const ELECTRON_MSI_WRAPPED_NS_UUID = builder_util_runtime_1.UUID.parse("467f7bb2-a83c-442f-b776-394d316e8e53");
class MsiWrappedTarget extends MsiTarget_1.default {
    constructor(packager, outDir) {
        // must be synchronous so it can run after nsis
        super(packager, outDir, "msiWrapped", false);
        this.outDir = outDir;
        this.options = (0, builder_util_runtime_1.deepAssign)(this.packager.platformSpecificBuildOptions, this.packager.config.msiWrapped);
        /** @private */
        this.archs = new Map();
    }
    get productId() {
        // this id is only required to build the installer
        // however it serves no purpose as this msi is just
        // a wrapper for an exe
        return builder_util_runtime_1.UUID.v5(this.packager.appInfo.id, ELECTRON_MSI_WRAPPED_NS_UUID).toUpperCase();
    }
    validatePrerequisites() {
        const config = this.packager.config;
        // this target requires nsis to be configured and executed
        // as this build re-bundles the nsis executable and wraps it in an msi
        if (!config.win || !config.win.target || !Array.isArray(config.win.target)) {
            throw new Error("No windows target found!");
        }
        const target = config.win.target;
        const nsisTarget = "nsis";
        if (!target
            .map((t) => {
            const result = typeof t === "string" ? t : t.target;
            return result.toLowerCase().trim();
        })
            .some(t => t === nsisTarget)) {
            throw new Error("No nsis target found! Please specify an nsis target");
        }
    }
    build(appOutDir, arch) {
        this.archs.set(arch, appOutDir);
        return Promise.resolve();
    }
    async finishBuild() {
        await super.finishBuild();
        const [arch, appOutDir] = this.archs.entries().next().value;
        this.validatePrerequisites();
        const exeSourcePath = this.getExeSourcePath(arch);
        if (!(await (0, builder_util_1.exists)(exeSourcePath))) {
            throw new builder_util_1.InvalidConfigurationError(`NSIS executable not found at ${exeSourcePath} - ensure the NSIS target builds before msiWrapped. Try listing 'nsis' before 'msiWrapped' in your target configuration.`);
        }
        return super.build(appOutDir, arch);
    }
    get installerFilenamePattern() {
        // big assumption is made here for the moment that the pattern didn't change
        // tslint:disable:no-invalid-template-strings
        return "${productName} Setup ${version}.${ext}";
    }
    getExeSourcePath(arch) {
        const packager = this.packager;
        // in this case, we want .exe, this way we can wrap the existing package if it exists
        const artifactName = packager.expandArtifactNamePattern(this.options, "exe", arch, this.installerFilenamePattern, false, this.packager.platformSpecificBuildOptions.defaultArch);
        const artifactPath = path.join(this.outDir, artifactName);
        return artifactPath;
    }
    async writeManifest(_appOutDir, arch, commonOptions) {
        const exeSourcePath = this.getExeSourcePath(arch);
        const options = this.options;
        return (await this.projectTemplate.value)({
            ...(await this.getBaseOptions(commonOptions)),
            exeSourcePath: exeSourcePath,
            productId: this.productId,
            impersonate: options.impersonate === true ? "yes" : "no",
            wrappedInstallerArgs: options.wrappedInstallerArgs,
        });
    }
}
exports.default = MsiWrappedTarget;
//# sourceMappingURL=MsiWrappedTarget.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebInstallerTarget = void 0;
const builder_util_1 = require("builder-util");
const PublishManager_1 = require("../../publish/PublishManager");
const NsisTarget_1 = require("./NsisTarget");
/** @private */
class WebInstallerTarget extends NsisTarget_1.NsisTarget {
    constructor(packager, outDir, targetName, packageHelper) {
        super(packager, outDir, targetName, packageHelper);
    }
    get isWebInstaller() {
        return true;
    }
    async configureDefines(oneClick, defines) {
        //noinspection ES6MissingAwait
        await NsisTarget_1.NsisTarget.prototype.configureDefines.call(this, oneClick, defines);
        const packager = this.packager;
        const options = this.options;
        let appPackageUrl = options.appPackageUrl;
        if (appPackageUrl == null) {
            const publishConfigs = await (0, PublishManager_1.getPublishConfigsForUpdateInfo)(packager, await (0, PublishManager_1.getPublishConfigs)(packager, this.options, null, false), null);
            if (publishConfigs == null || publishConfigs.length === 0) {
                throw new Error("Cannot compute app package download URL");
            }
            appPackageUrl = (0, PublishManager_1.computeDownloadUrl)(publishConfigs[0], null, packager);
            defines.APP_PACKAGE_URL_IS_INCOMPLETE = null;
        }
        defines.APP_PACKAGE_URL = appPackageUrl;
    }
    get shouldBuildUniversalInstaller() {
        if (this.options.buildUniversalInstaller === false) {
            builder_util_1.log.warn({ buildUniversalInstaller: true }, "only universal builds are supported for nsis-web installers, overriding setting");
        }
        return true;
    }
    installerFilenamePattern(_primaryArch, _defaultArch) {
        return "${productName} Web Setup ${version}.${ext}";
    }
    generateGitHubInstallerName() {
        const appInfo = this.packager.appInfo;
        const classifier = appInfo.name.toLowerCase() === appInfo.name ? "web-setup" : "WebSetup";
        return `${appInfo.name}-${classifier}-${appInfo.version}.exe`;
    }
}
exports.WebInstallerTarget = WebInstallerTarget;
//# sourceMappingURL=WebInstallerTarget.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebUpdater = void 0;
const Provider_1 = require("./providers/Provider");
const types_1 = require("./types");
const LinuxUpdater_1 = require("./LinuxUpdater");
class DebUpdater extends LinuxUpdater_1.LinuxUpdater {
    constructor(options, app) {
        super(options, app);
    }
    /*** @private */
    doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "deb", ["AppImage", "rpm", "pacman"]);
        return this.executeDownload({
            fileExtension: "deb",
            fileInfo,
            downloadUpdateOptions,
            task: async (updateFile, downloadOptions) => {
                if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
                    downloadOptions.onProgress = it => this.emit(types_1.DOWNLOAD_PROGRESS, it);
                }
                await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
            },
        });
    }
    doInstall(options) {
        const installerPath = this.installerPath;
        if (installerPath == null) {
            this.dispatchError(new Error("No update filepath provided, can't quit and install"));
            return false;
        }
        if (!this.hasCommand("dpkg") && !this.hasCommand("apt")) {
            this.dispatchError(new Error("Neither dpkg nor apt command found. Cannot install .deb package."));
            return false;
        }
        const priorityList = ["dpkg", "apt"];
        const packageManager = this.detectPackageManager(priorityList);
        try {
            DebUpdater.installWithCommandRunner(packageManager, installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
        }
        catch (error) {
            this.dispatchError(error);
            return false;
        }
        if (options.isForceRunAfter) {
            this.app.relaunch();
        }
        return true;
    }
    static installWithCommandRunner(packageManager, installerPath, commandRunner, logger) {
        var _a;
        if (packageManager === "dpkg") {
            try {
                // Primary: Install unsigned .deb directly with dpkg
                commandRunner(["dpkg", "-i", installerPath]);
            }
            catch (error) {
                // Handle missing dependencies via apt-get
                logger.warn((_a = error.message) !== null && _a !== void 0 ? _a : error);
                logger.warn("dpkg installation failed, trying to fix broken dependencies with apt-get");
                commandRunner(["apt-get", "install", "-f", "-y"]);
            }
        }
        else if (packageManager === "apt") {
            // Fallback: Use apt for direct install (less safe for unsigned .deb)
            logger.warn("Using apt to install a local .deb. This may fail for unsigned packages unless properly configured.");
            commandRunner([
                "apt",
                "install",
                "-y",
                "--allow-unauthenticated", // needed for unsigned .debs
                "--allow-downgrades", // allow lower version installs
                "--allow-change-held-packages",
                installerPath,
            ]);
        }
        else {
            throw new Error(`Package manager ${packageManager} not supported`);
        }
    }
}
exports.DebUpdater = DebUpdater;
//# sourceMappingURL=DebUpdater.js.map
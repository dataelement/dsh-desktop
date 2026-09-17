"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpmUpdater = void 0;
const types_1 = require("./types");
const Provider_1 = require("./providers/Provider");
const LinuxUpdater_1 = require("./LinuxUpdater");
class RpmUpdater extends LinuxUpdater_1.LinuxUpdater {
    constructor(options, app) {
        super(options, app);
    }
    /*** @private */
    doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "rpm", ["AppImage", "deb", "pacman"]);
        return this.executeDownload({
            fileExtension: "rpm",
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
        const priorityList = ["zypper", "dnf", "yum", "rpm"];
        const packageManager = this.detectPackageManager(priorityList);
        try {
            RpmUpdater.installWithCommandRunner(packageManager, installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
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
        if (packageManager === "zypper") {
            return commandRunner(["zypper", "--non-interactive", "--no-refresh", "install", "--allow-unsigned-rpm", "-f", installerPath]);
        }
        if (packageManager === "dnf") {
            return commandRunner(["dnf", "install", "--nogpgcheck", "-y", installerPath]);
        }
        if (packageManager === "yum") {
            return commandRunner(["yum", "install", "--nogpgcheck", "-y", installerPath]);
        }
        if (packageManager === "rpm") {
            logger.warn("Installing with rpm only (no dependency resolution).");
            return commandRunner(["rpm", "-Uvh", "--replacepkgs", "--replacefiles", "--nodeps", installerPath]);
        }
        throw new Error(`Package manager ${packageManager} not supported`);
    }
}
exports.RpmUpdater = RpmUpdater;
//# sourceMappingURL=RpmUpdater.js.map
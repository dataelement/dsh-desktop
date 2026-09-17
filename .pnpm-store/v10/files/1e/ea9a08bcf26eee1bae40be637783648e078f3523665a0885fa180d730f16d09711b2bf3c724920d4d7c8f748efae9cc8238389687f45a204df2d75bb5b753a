"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PacmanUpdater = void 0;
const types_1 = require("./types");
const Provider_1 = require("./providers/Provider");
const LinuxUpdater_1 = require("./LinuxUpdater");
class PacmanUpdater extends LinuxUpdater_1.LinuxUpdater {
    constructor(options, app) {
        super(options, app);
    }
    /*** @private */
    doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "pacman", ["AppImage", "deb", "rpm"]);
        return this.executeDownload({
            fileExtension: "pacman",
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
        try {
            PacmanUpdater.installWithCommandRunner(installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
        }
        catch (error) {
            this.dispatchError(error);
            return false;
        }
        if (options.isForceRunAfter) {
            this.app.relaunch(); // note: `app` is undefined in tests since vite doesn't run in electron
        }
        return true;
    }
    static installWithCommandRunner(installerPath, commandRunner, logger) {
        var _a;
        try {
            commandRunner(["pacman", "-U", "--noconfirm", installerPath]);
        }
        catch (error) {
            logger.warn((_a = error.message) !== null && _a !== void 0 ? _a : error);
            logger.warn("pacman installation failed, attempting to update package database and retry");
            try {
                // Update package database (not a full upgrade, just sync)
                commandRunner(["pacman", "-Sy", "--noconfirm"]);
                // Retry installation
                commandRunner(["pacman", "-U", "--noconfirm", installerPath]);
            }
            catch (retryError) {
                logger.error("Retry after pacman -Sy failed");
                throw retryError;
            }
        }
    }
}
exports.PacmanUpdater = PacmanUpdater;
//# sourceMappingURL=PacmanUpdater.js.map
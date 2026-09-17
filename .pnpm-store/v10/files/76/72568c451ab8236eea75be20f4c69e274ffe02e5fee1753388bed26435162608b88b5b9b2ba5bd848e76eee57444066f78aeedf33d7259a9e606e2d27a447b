"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseUpdater = void 0;
const child_process_1 = require("child_process");
const path = require("path");
const AppUpdater_1 = require("./AppUpdater");
class BaseUpdater extends AppUpdater_1.AppUpdater {
    constructor(options, app) {
        super(options, app);
        this.quitAndInstallCalled = false;
        this.quitHandlerAdded = false;
    }
    quitAndInstall(isSilent = false, isForceRunAfter = false) {
        this._logger.info(`Install on explicit quitAndInstall`);
        // If NOT in silent mode use `autoRunAppAfterInstall` to determine whether to force run the app
        const isInstalled = this.install(isSilent, isSilent ? isForceRunAfter : this.autoRunAppAfterInstall);
        if (isInstalled) {
            setImmediate(() => {
                // this event is normally emitted when calling quitAndInstall, this emulates that
                require("electron").autoUpdater.emit("before-quit-for-update");
                this.app.quit();
            });
        }
        else {
            this.quitAndInstallCalled = false;
        }
    }
    executeDownload(taskOptions) {
        return super.executeDownload({
            ...taskOptions,
            done: event => {
                this.dispatchUpdateDownloaded(event);
                this.addQuitHandler();
                return Promise.resolve();
            },
        });
    }
    get installerPath() {
        return this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.file;
    }
    // must be sync (because quit even handler is not async)
    install(isSilent = false, isForceRunAfter = false) {
        if (this.quitAndInstallCalled) {
            this._logger.warn("install call ignored: quitAndInstallCalled is set to true");
            return false;
        }
        const downloadedUpdateHelper = this.downloadedUpdateHelper;
        const installerPath = this.installerPath;
        const downloadedFileInfo = downloadedUpdateHelper == null ? null : downloadedUpdateHelper.downloadedFileInfo;
        if (installerPath == null || downloadedFileInfo == null) {
            this.dispatchError(new Error("No update filepath provided, can't quit and install"));
            return false;
        }
        // prevent calling several times
        this.quitAndInstallCalled = true;
        try {
            this._logger.info(`Install: isSilent: ${isSilent}, isForceRunAfter: ${isForceRunAfter}`);
            return this.doInstall({
                isSilent,
                isForceRunAfter,
                isAdminRightsRequired: downloadedFileInfo.isAdminRightsRequired,
            });
        }
        catch (e) {
            this.dispatchError(e);
            return false;
        }
    }
    addQuitHandler() {
        if (this.quitHandlerAdded || !this.autoInstallOnAppQuit) {
            return;
        }
        this.quitHandlerAdded = true;
        this.app.onQuit(exitCode => {
            if (this.quitAndInstallCalled) {
                this._logger.info("Update installer has already been triggered. Quitting application.");
                return;
            }
            if (!this.autoInstallOnAppQuit) {
                this._logger.info("Update will not be installed on quit because autoInstallOnAppQuit is set to false.");
                return;
            }
            if (exitCode !== 0) {
                this._logger.info(`Update will be not installed on quit because application is quitting with exit code ${exitCode}`);
                return;
            }
            this._logger.info("Auto install update on quit");
            this.install(true, false);
        });
    }
    /**
     * Strips relative-path entries from a PATH string.
     * Prevents PATH-poisoning where a writable directory earlier in PATH shadows
     * a trusted package manager binary.
     */
    sanitizeEnvPath(envPath) {
        return envPath
            .split(path.delimiter)
            .filter((dir) => path.isAbsolute(dir))
            .join(path.delimiter);
    }
    spawnSyncLog(cmd, args = [], env = {}) {
        var _a;
        this._logger.info(`Executing: ${cmd} with args: ${args}`);
        const mergedEnv = { ...process.env, ...env };
        const response = (0, child_process_1.spawnSync)(cmd, args, {
            env: { ...mergedEnv, PATH: this.sanitizeEnvPath((_a = mergedEnv.PATH) !== null && _a !== void 0 ? _a : "") },
            encoding: "utf-8",
            shell: true,
        });
        const { error, status, stdout, stderr } = response;
        if (error != null) {
            this._logger.error(stderr);
            throw error;
        }
        else if (status != null && status !== 0) {
            this._logger.error(stderr);
            throw new Error(`Command ${cmd} exited with code ${status}`);
        }
        return stdout.trim();
    }
    /**
     * This handles both node 8 and node 10 way of emitting error when spawning a process
     *   - node 8: Throws the error
     *   - node 10: Emit the error(Need to listen with on)
     */
    // https://github.com/electron-userland/electron-builder/issues/1129
    // Node 8 sends errors: https://nodejs.org/dist/latest-v8.x/docs/api/errors.html#errors_common_system_errors
    async spawnLog(cmd, args = [], env = undefined, stdio = "ignore") {
        this._logger.info(`Executing: ${cmd} with args: ${args}`);
        return new Promise((resolve, reject) => {
            try {
                const params = { stdio, env, detached: true };
                const p = (0, child_process_1.spawn)(cmd, args, params);
                p.on("error", error => {
                    reject(error);
                });
                p.unref();
                if (p.pid !== undefined) {
                    resolve(true);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.BaseUpdater = BaseUpdater;
//# sourceMappingURL=BaseUpdater.js.map
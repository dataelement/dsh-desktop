"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpLogger = exports.AppUpdater = void 0;
const builder_util_runtime_1 = require("builder-util-runtime");
const crypto_1 = require("crypto");
const os_1 = require("os");
const events_1 = require("events");
const fs_extra_1 = require("fs-extra");
const js_yaml_1 = require("js-yaml");
const lazy_val_1 = require("lazy-val");
const path = require("path");
const semver_1 = require("semver");
const DownloadedUpdateHelper_1 = require("./DownloadedUpdateHelper");
const ElectronAppAdapter_1 = require("./ElectronAppAdapter");
const electronHttpExecutor_1 = require("./electronHttpExecutor");
const GenericProvider_1 = require("./providers/GenericProvider");
const providerFactory_1 = require("./providerFactory");
const zlib_1 = require("zlib");
const GenericDifferentialDownloader_1 = require("./differentialDownloader/GenericDifferentialDownloader");
const types_1 = require("./types");
class AppUpdater extends events_1.EventEmitter {
    /**
     * Get the update channel. Doesn't return `channel` from the update configuration, only if was previously set.
     */
    get channel() {
        return this._channel;
    }
    /**
     * Set the update channel. Overrides `channel` in the update configuration.
     *
     * `allowDowngrade` will be automatically set to `true`. If this behavior is not suitable for you, simple set `allowDowngrade` explicitly after.
     */
    set channel(value) {
        if (this._channel != null) {
            // noinspection SuspiciousTypeOfGuard
            if (typeof value !== "string") {
                throw (0, builder_util_runtime_1.newError)(`Channel must be a string, but got: ${value}`, "ERR_UPDATER_INVALID_CHANNEL");
            }
            else if (value.length === 0) {
                throw (0, builder_util_runtime_1.newError)(`Channel must be not an empty string`, "ERR_UPDATER_INVALID_CHANNEL");
            }
        }
        this._channel = value;
        this.allowDowngrade = true;
    }
    /**
     *  Shortcut for explicitly adding auth tokens to request headers
     */
    addAuthHeader(token) {
        this.requestHeaders = Object.assign({}, this.requestHeaders, {
            authorization: token,
        });
    }
    // noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    get netSession() {
        return (0, electronHttpExecutor_1.getNetSession)();
    }
    /**
     * The logger. You can pass [electron-log](https://github.com/megahertz/electron-log), [winston](https://github.com/winstonjs/winston) or another logger with the following interface: `{ info(), warn(), error() }`.
     * Set it to `null` if you would like to disable a logging feature.
     */
    get logger() {
        return this._logger;
    }
    set logger(value) {
        this._logger = value == null ? new NoOpLogger() : value;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * test only
     * @private
     */
    set updateConfigPath(value) {
        this.clientPromise = null;
        this._appUpdateConfigPath = value;
        this.configOnDisk = new lazy_val_1.Lazy(() => this.loadUpdateConfig());
    }
    /**
     * Allows developer to override default logic for determining if an update is supported.
     * The default logic compares the `UpdateInfo` minimum system version against the `os.release()` with `semver` package
     */
    get isUpdateSupported() {
        return this._isUpdateSupported;
    }
    set isUpdateSupported(value) {
        if (value) {
            this._isUpdateSupported = value;
        }
    }
    /**
     * Allows developer to override default logic for determining if the user is below the rollout threshold.
     * The default logic compares the staging percentage with numerical representation of user ID.
     * An override can define custom logic, or bypass it if needed.
     */
    get isUserWithinRollout() {
        return this._isUserWithinRollout;
    }
    set isUserWithinRollout(value) {
        if (value) {
            this._isUserWithinRollout = value;
        }
    }
    constructor(options, app) {
        super();
        /**
         * Whether to automatically download an update when it is found.
         * @default true
         */
        this.autoDownload = true;
        /**
         * Whether to automatically install a downloaded update on app quit (if `quitAndInstall` was not called before).
         * @default true
         */
        this.autoInstallOnAppQuit = true;
        /**
         * Whether to run the app after finish install when run the installer is NOT in silent mode.
         * @default true
         */
        this.autoRunAppAfterInstall = true;
        /**
         * *GitHub provider only.* Whether to allow update to pre-release versions. Defaults to `true` if application version contains prerelease components (e.g. `0.12.1-alpha.1`, here `alpha` is a prerelease component), otherwise `false`.
         *
         * If `true`, downgrade will be allowed (`allowDowngrade` will be set to `true`).
         */
        this.allowPrerelease = false;
        /**
         * *GitHub provider only.* Get all release notes (from current version to latest), not just the latest.
         * @default false
         */
        this.fullChangelog = false;
        /**
         * Whether to allow version downgrade (when a user from the beta channel wants to go back to the stable channel).
         *
         * Taken in account only if channel differs (pre-release version component in terms of semantic versioning).
         *
         * @default false
         */
        this.allowDowngrade = false;
        /**
         * Web installer files might not have signature verification, this switch prevents to load them unless it is needed.
         *
         * Currently false to prevent breaking the current API, but it should be changed to default true at some point that
         * breaking changes are allowed.
         *
         * @default false
         */
        this.disableWebInstaller = false;
        /**
         * *NSIS only* Disable differential downloads and always perform full download of installer.
         *
         * @default false
         */
        this.disableDifferentialDownload = false;
        /**
         * Allows developer to force the updater to work in "dev" mode, looking for "dev-app-update.yml" instead of "app-update.yml"
         * Dev: `path.join(this.app.getAppPath(), "dev-app-update.yml")`
         * Prod: `path.join(process.resourcesPath!, "app-update.yml")`
         *
         * @default false
         */
        this.forceDevUpdateConfig = false;
        /**
         * The base URL of the old block map file.
         *
         * When null, the updater will use the base URL of the update file to download the update.
         * When set, the updater will use this string as the base URL of the old block map file.
         * Some servers like github cannot download the old block map file from latest release,
         * so you need to compute the old block map file base URL manually.
         *
         * @default null
         */
        this.previousBlockmapBaseUrlOverride = null;
        this._channel = null;
        this.downloadedUpdateHelper = null;
        /**
         *  The request headers.
         */
        this.requestHeaders = null;
        this._logger = console;
        // noinspection JSUnusedGlobalSymbols
        /**
         * For type safety you can use signals, e.g. `autoUpdater.signals.updateDownloaded(() => {})` instead of `autoUpdater.on('update-available', () => {})`
         */
        this.signals = new types_1.UpdaterSignal(this);
        this._appUpdateConfigPath = null;
        this._isUpdateSupported = updateInfo => this.checkIfUpdateSupported(updateInfo);
        this._isUserWithinRollout = updateInfo => this.isStagingMatch(updateInfo);
        this.clientPromise = null;
        this.stagingUserIdPromise = new lazy_val_1.Lazy(() => this.getOrCreateStagingUserId());
        // public, allow to read old config for anyone
        /** @internal */
        this.configOnDisk = new lazy_val_1.Lazy(() => this.loadUpdateConfig());
        this.checkForUpdatesPromise = null;
        this.downloadPromise = null;
        this.updateInfoAndProvider = null;
        /**
         * @private
         * @internal
         */
        this._testOnlyOptions = null;
        this.on("error", (error) => {
            this._logger.error(`Error: ${error.stack || error.message}`);
        });
        if (app == null) {
            this.app = new ElectronAppAdapter_1.ElectronAppAdapter();
            this.httpExecutor = new electronHttpExecutor_1.ElectronHttpExecutor((authInfo, callback) => this.emit("login", authInfo, callback));
        }
        else {
            this.app = app;
            this.httpExecutor = null;
        }
        const currentVersionString = this.app.version;
        const currentVersion = (0, semver_1.parse)(currentVersionString);
        if (currentVersion == null) {
            throw (0, builder_util_runtime_1.newError)(`App version is not a valid semver version: "${currentVersionString}"`, "ERR_UPDATER_INVALID_VERSION");
        }
        this.currentVersion = currentVersion;
        this.allowPrerelease = hasPrereleaseComponents(currentVersion);
        if (options != null) {
            this.setFeedURL(options);
            if (typeof options !== "string" && options.requestHeaders) {
                this.requestHeaders = options.requestHeaders;
            }
        }
    }
    //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    getFeedURL() {
        return "Deprecated. Do not use it.";
    }
    /**
     * Configure update provider. If value is `string`, [GenericServerOptions](https://www.electron.build/publish#genericserveroptions) will be set with value as `url`.
     * @param options If you want to override configuration in the `app-update.yml`.
     */
    setFeedURL(options) {
        const runtimeOptions = this.createProviderRuntimeOptions();
        // https://github.com/electron-userland/electron-builder/issues/1105
        let provider;
        if (typeof options === "string") {
            provider = new GenericProvider_1.GenericProvider({ provider: "generic", url: options }, this, {
                ...runtimeOptions,
                isUseMultipleRangeRequest: (0, providerFactory_1.isUrlProbablySupportMultiRangeRequests)(options),
            });
        }
        else {
            provider = (0, providerFactory_1.createClient)(options, this, runtimeOptions);
        }
        this.clientPromise = Promise.resolve(provider);
    }
    /**
     * Asks the server whether there is an update.
     * @returns null if the updater is disabled, otherwise info about the latest version
     */
    checkForUpdates() {
        if (!this.isUpdaterActive()) {
            return Promise.resolve(null);
        }
        let checkForUpdatesPromise = this.checkForUpdatesPromise;
        if (checkForUpdatesPromise != null) {
            this._logger.info("Checking for update (already in progress)");
            return checkForUpdatesPromise;
        }
        const nullizePromise = () => (this.checkForUpdatesPromise = null);
        this._logger.info("Checking for update");
        checkForUpdatesPromise = this.doCheckForUpdates()
            .then(it => {
            nullizePromise();
            return it;
        })
            .catch((e) => {
            nullizePromise();
            this.emit("error", e, `Cannot check for updates: ${(e.stack || e).toString()}`);
            throw e;
        });
        this.checkForUpdatesPromise = checkForUpdatesPromise;
        return checkForUpdatesPromise;
    }
    isUpdaterActive() {
        const isEnabled = this.app.isPackaged || this.forceDevUpdateConfig;
        if (!isEnabled) {
            this._logger.info("Skip checkForUpdates because application is not packed and dev update config is not forced");
            return false;
        }
        return true;
    }
    // noinspection JSUnusedGlobalSymbols
    checkForUpdatesAndNotify(downloadNotification) {
        return this.checkForUpdates().then(it => {
            if (!(it === null || it === void 0 ? void 0 : it.downloadPromise)) {
                if (this._logger.debug != null) {
                    this._logger.debug("checkForUpdatesAndNotify called, downloadPromise is null");
                }
                return it;
            }
            void it.downloadPromise.then(() => {
                const notificationContent = AppUpdater.formatDownloadNotification(it.updateInfo.version, this.app.name, downloadNotification);
                new (require("electron").Notification)(notificationContent).show();
            });
            return it;
        });
    }
    static formatDownloadNotification(version, appName, downloadNotification) {
        if (downloadNotification == null) {
            downloadNotification = {
                title: "A new update is ready to install",
                body: `{appName} version {version} has been downloaded and will be automatically installed on exit`,
            };
        }
        downloadNotification = {
            title: downloadNotification.title.replace("{appName}", appName).replace("{version}", version),
            body: downloadNotification.body.replace("{appName}", appName).replace("{version}", version),
        };
        return downloadNotification;
    }
    async isStagingMatch(updateInfo) {
        const rawStagingPercentage = updateInfo.stagingPercentage;
        let stagingPercentage = rawStagingPercentage;
        if (stagingPercentage == null) {
            return true;
        }
        stagingPercentage = parseInt(stagingPercentage, 10);
        if (isNaN(stagingPercentage)) {
            this._logger.warn(`Staging percentage is NaN: ${rawStagingPercentage}`);
            return true;
        }
        // convert from user 0-100 to internal 0-1
        stagingPercentage = stagingPercentage / 100;
        const stagingUserId = await this.stagingUserIdPromise.value;
        const val = builder_util_runtime_1.UUID.parse(stagingUserId).readUInt32BE(12);
        const percentage = val / 0xffffffff;
        this._logger.info(`Staging percentage: ${stagingPercentage}, percentage: ${percentage}, user id: ${stagingUserId}`);
        return percentage < stagingPercentage;
    }
    computeFinalHeaders(headers) {
        if (this.requestHeaders != null) {
            Object.assign(headers, this.requestHeaders);
        }
        return headers;
    }
    async isUpdateAvailable(updateInfo) {
        const latestVersion = (0, semver_1.parse)(updateInfo.version);
        if (latestVersion == null) {
            throw (0, builder_util_runtime_1.newError)(`This file could not be downloaded, or the latest version (from update server) does not have a valid semver version: "${updateInfo.version}"`, "ERR_UPDATER_INVALID_VERSION");
        }
        const currentVersion = this.currentVersion;
        if ((0, semver_1.eq)(latestVersion, currentVersion)) {
            return false;
        }
        if (!(await Promise.resolve(this.isUpdateSupported(updateInfo)))) {
            return false;
        }
        const isUserWithinRollout = await Promise.resolve(this.isUserWithinRollout(updateInfo));
        if (!isUserWithinRollout) {
            return false;
        }
        // https://github.com/electron-userland/electron-builder/pull/3111#issuecomment-405033227
        // https://github.com/electron-userland/electron-builder/pull/3111#issuecomment-405030797
        const isLatestVersionNewer = (0, semver_1.gt)(latestVersion, currentVersion);
        const isLatestVersionOlder = (0, semver_1.lt)(latestVersion, currentVersion);
        if (isLatestVersionNewer) {
            return true;
        }
        return this.allowDowngrade && isLatestVersionOlder;
    }
    checkIfUpdateSupported(updateInfo) {
        const minimumSystemVersion = updateInfo === null || updateInfo === void 0 ? void 0 : updateInfo.minimumSystemVersion;
        const currentOSVersion = (0, os_1.release)();
        if (minimumSystemVersion) {
            try {
                if ((0, semver_1.lt)(currentOSVersion, minimumSystemVersion)) {
                    this._logger.info(`Current OS version ${currentOSVersion} is less than the minimum OS version required ${minimumSystemVersion} for version ${currentOSVersion}`);
                    return false;
                }
            }
            catch (e) {
                this._logger.warn(`Failed to compare current OS version(${currentOSVersion}) with minimum OS version(${minimumSystemVersion}): ${(e.message || e).toString()}`);
            }
        }
        return true;
    }
    async getUpdateInfoAndProvider() {
        await this.app.whenReady();
        if (this.clientPromise == null) {
            this.clientPromise = this.configOnDisk.value.then(it => (0, providerFactory_1.createClient)(it, this, this.createProviderRuntimeOptions()));
        }
        const client = await this.clientPromise;
        const stagingUserId = await this.stagingUserIdPromise.value;
        client.setRequestHeaders(this.computeFinalHeaders({ "x-user-staging-id": stagingUserId }));
        return {
            info: await client.getLatestVersion(),
            provider: client,
        };
    }
    createProviderRuntimeOptions() {
        return {
            isUseMultipleRangeRequest: true,
            platform: this._testOnlyOptions == null ? process.platform : this._testOnlyOptions.platform,
            executor: this.httpExecutor,
        };
    }
    async doCheckForUpdates() {
        this.emit("checking-for-update");
        const result = await this.getUpdateInfoAndProvider();
        const updateInfo = result.info;
        if (!(await this.isUpdateAvailable(updateInfo))) {
            this._logger.info(`Update for version ${this.currentVersion.format()} is not available (latest version: ${updateInfo.version}, downgrade is ${this.allowDowngrade ? "allowed" : "disallowed"}).`);
            this.emit("update-not-available", updateInfo);
            return {
                isUpdateAvailable: false,
                versionInfo: updateInfo,
                updateInfo,
            };
        }
        this.updateInfoAndProvider = result;
        this.onUpdateAvailable(updateInfo);
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        //noinspection ES6MissingAwait
        return {
            isUpdateAvailable: true,
            versionInfo: updateInfo,
            updateInfo,
            cancellationToken,
            downloadPromise: this.autoDownload ? this.downloadUpdate(cancellationToken) : null,
        };
    }
    onUpdateAvailable(updateInfo) {
        this._logger.info(`Found version ${updateInfo.version} (url: ${(0, builder_util_runtime_1.asArray)(updateInfo.files)
            .map(it => it.url)
            .join(", ")})`);
        this.emit("update-available", updateInfo);
    }
    /**
     * Start downloading update manually. You can use this method if `autoDownload` option is set to `false`.
     * @returns {Promise<Array<string>>} Paths to downloaded files.
     */
    downloadUpdate(cancellationToken = new builder_util_runtime_1.CancellationToken()) {
        const updateInfoAndProvider = this.updateInfoAndProvider;
        if (updateInfoAndProvider == null) {
            const error = new Error("Please check update first");
            this.dispatchError(error);
            return Promise.reject(error);
        }
        if (this.downloadPromise != null) {
            this._logger.info("Downloading update (already in progress)");
            return this.downloadPromise;
        }
        this._logger.info(`Downloading update from ${(0, builder_util_runtime_1.asArray)(updateInfoAndProvider.info.files)
            .map(it => it.url)
            .join(", ")}`);
        const errorHandler = (e) => {
            // https://github.com/electron-userland/electron-builder/issues/1150#issuecomment-436891159
            if (!(e instanceof builder_util_runtime_1.CancellationError)) {
                try {
                    this.dispatchError(e);
                }
                catch (nestedError) {
                    this._logger.warn(`Cannot dispatch error event: ${nestedError.stack || nestedError}`);
                }
            }
            return e;
        };
        this.downloadPromise = this.doDownloadUpdate({
            updateInfoAndProvider,
            requestHeaders: this.computeRequestHeaders(updateInfoAndProvider.provider),
            cancellationToken,
            disableWebInstaller: this.disableWebInstaller,
            disableDifferentialDownload: this.disableDifferentialDownload,
        })
            .catch((e) => {
            throw errorHandler(e);
        })
            .finally(() => {
            this.downloadPromise = null;
        });
        return this.downloadPromise;
    }
    dispatchError(e) {
        this.emit("error", e, (e.stack || e).toString());
    }
    dispatchUpdateDownloaded(event) {
        this.emit(types_1.UPDATE_DOWNLOADED, event);
    }
    async loadUpdateConfig() {
        if (this._appUpdateConfigPath == null) {
            this._appUpdateConfigPath = this.app.appUpdateConfigPath;
        }
        return (0, js_yaml_1.load)(await (0, fs_extra_1.readFile)(this._appUpdateConfigPath, "utf-8"));
    }
    computeRequestHeaders(provider) {
        const fileExtraDownloadHeaders = provider.fileExtraDownloadHeaders;
        if (fileExtraDownloadHeaders != null) {
            const requestHeaders = this.requestHeaders;
            return requestHeaders == null
                ? fileExtraDownloadHeaders
                : {
                    ...fileExtraDownloadHeaders,
                    ...requestHeaders,
                };
        }
        return this.computeFinalHeaders({ accept: "*/*" });
    }
    async getOrCreateStagingUserId() {
        const file = path.join(this.app.userDataPath, ".updaterId");
        try {
            const id = await (0, fs_extra_1.readFile)(file, "utf-8");
            if (builder_util_runtime_1.UUID.check(id)) {
                return id;
            }
            else {
                this._logger.warn(`Staging user id file exists, but content was invalid: ${id}`);
            }
        }
        catch (e) {
            if (e.code !== "ENOENT") {
                this._logger.warn(`Couldn't read staging user ID, creating a blank one: ${e}`);
            }
        }
        const id = builder_util_runtime_1.UUID.v5((0, crypto_1.randomBytes)(4096), builder_util_runtime_1.UUID.OID);
        this._logger.info(`Generated new staging user ID: ${id}`);
        try {
            await (0, fs_extra_1.outputFile)(file, id);
        }
        catch (e) {
            this._logger.warn(`Couldn't write out staging user ID: ${e}`);
        }
        return id;
    }
    /** @internal */
    get isAddNoCacheQuery() {
        const headers = this.requestHeaders;
        // https://github.com/electron-userland/electron-builder/issues/3021
        if (headers == null) {
            return true;
        }
        for (const headerName of Object.keys(headers)) {
            const s = headerName.toLowerCase();
            if (s === "authorization" || s === "private-token") {
                return false;
            }
        }
        return true;
    }
    async getOrCreateDownloadHelper() {
        let result = this.downloadedUpdateHelper;
        if (result == null) {
            const dirName = (await this.configOnDisk.value).updaterCacheDirName;
            const logger = this._logger;
            if (dirName == null) {
                logger.error("updaterCacheDirName is not specified in app-update.yml Was app build using at least electron-builder 20.34.0?");
            }
            const cacheDir = path.join(this.app.baseCachePath, dirName || this.app.name);
            if (logger.debug != null) {
                logger.debug(`updater cache dir: ${cacheDir}`);
            }
            result = new DownloadedUpdateHelper_1.DownloadedUpdateHelper(cacheDir);
            this.downloadedUpdateHelper = result;
        }
        return result;
    }
    async executeDownload(taskOptions) {
        const fileInfo = taskOptions.fileInfo;
        const downloadOptions = {
            headers: taskOptions.downloadUpdateOptions.requestHeaders,
            cancellationToken: taskOptions.downloadUpdateOptions.cancellationToken,
            sha2: fileInfo.info.sha2,
            sha512: fileInfo.info.sha512,
        };
        if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = it => this.emit(types_1.DOWNLOAD_PROGRESS, it);
        }
        const updateInfo = taskOptions.downloadUpdateOptions.updateInfoAndProvider.info;
        const version = updateInfo.version;
        const packageInfo = fileInfo.packageInfo;
        function getCacheUpdateFileName() {
            // NodeJS URL doesn't decode automatically
            const urlPath = decodeURIComponent(taskOptions.fileInfo.url.pathname);
            if (urlPath.toLowerCase().endsWith(`.${taskOptions.fileExtension.toLowerCase()}`)) {
                return path.basename(urlPath);
            }
            else {
                // url like /latest — use basename so a server-supplied path like "../../etc/evil"
                // cannot escape the cache directory via path.join
                return path.basename(taskOptions.fileInfo.info.url);
            }
        }
        const downloadedUpdateHelper = await this.getOrCreateDownloadHelper();
        const cacheDir = downloadedUpdateHelper.cacheDirForPendingUpdate;
        await (0, fs_extra_1.mkdir)(cacheDir, { recursive: true });
        const updateFileName = getCacheUpdateFileName();
        let updateFile = path.join(cacheDir, updateFileName);
        const packageFile = packageInfo == null ? null : path.join(cacheDir, `package-${version}${path.extname(packageInfo.path) || ".7z"}`);
        const done = async (isSaveCache) => {
            await downloadedUpdateHelper.setDownloadedFile(updateFile, packageFile, updateInfo, fileInfo, updateFileName, isSaveCache);
            await taskOptions.done({
                ...updateInfo,
                downloadedFile: updateFile,
            });
            const currentBlockMapFile = path.join(cacheDir, "current.blockmap");
            if (await (0, fs_extra_1.pathExists)(currentBlockMapFile)) {
                await (0, fs_extra_1.copyFile)(currentBlockMapFile, path.join(downloadedUpdateHelper.cacheDir, "current.blockmap"));
            }
            return packageFile == null ? [updateFile] : [updateFile, packageFile];
        };
        const log = this._logger;
        const cachedUpdateFile = await downloadedUpdateHelper.validateDownloadedPath(updateFile, updateInfo, fileInfo, log);
        if (cachedUpdateFile != null) {
            updateFile = cachedUpdateFile;
            return await done(false);
        }
        const removeFileIfAny = async () => {
            await downloadedUpdateHelper.clear().catch(() => {
                // ignore
            });
            return await (0, fs_extra_1.unlink)(updateFile).catch(() => {
                // ignore
            });
        };
        const tempUpdateFile = await (0, DownloadedUpdateHelper_1.createTempUpdateFile)(`temp-${updateFileName}`, cacheDir, log);
        try {
            await taskOptions.task(tempUpdateFile, downloadOptions, packageFile, removeFileIfAny);
            await (0, builder_util_runtime_1.retry)(() => (0, fs_extra_1.rename)(tempUpdateFile, updateFile), {
                retries: 60,
                interval: 500,
                shouldRetry: (error) => {
                    if (error instanceof Error && /^EBUSY:/.test(error.message)) {
                        return true;
                    }
                    log.warn(`Cannot rename temp file to final file: ${error.message || error.stack}`);
                    return false;
                },
            });
        }
        catch (e) {
            await removeFileIfAny();
            if (e instanceof builder_util_runtime_1.CancellationError) {
                log.info("cancelled");
                this.emit("update-cancelled", updateInfo);
            }
            throw e;
        }
        log.info(`New version ${version} has been downloaded to ${updateFile}`);
        return await done(true);
    }
    async differentialDownloadInstaller(fileInfo, downloadUpdateOptions, installerPath, provider, oldInstallerFileName) {
        try {
            if (this._testOnlyOptions != null && !this._testOnlyOptions.isUseDifferentialDownload) {
                return true;
            }
            const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
            const blockmapFileUrls = await provider.getBlockMapFiles(fileInfo.url, this.app.version, downloadUpdateOptions.updateInfoAndProvider.info.version, this.previousBlockmapBaseUrlOverride);
            this._logger.info(`Download block maps (old: "${blockmapFileUrls[0]}", new: ${blockmapFileUrls[1]})`);
            const downloadBlockMap = async (url) => {
                const data = await this.httpExecutor.downloadToBuffer(url, {
                    headers: downloadUpdateOptions.requestHeaders,
                    cancellationToken: downloadUpdateOptions.cancellationToken,
                });
                if (data == null || data.length === 0) {
                    throw new Error(`Blockmap "${url.href}" is empty`);
                }
                try {
                    return JSON.parse((0, zlib_1.gunzipSync)(data).toString());
                }
                catch (e) {
                    throw new Error(`Cannot parse blockmap "${url.href}", error: ${e}`);
                }
            };
            const downloadOptions = {
                newUrl: fileInfo.url,
                oldFile: path.join(this.downloadedUpdateHelper.cacheDir, oldInstallerFileName),
                logger: this._logger,
                newFile: installerPath,
                isUseMultipleRangeRequest: provider.isUseMultipleRangeRequest,
                requestHeaders: downloadUpdateOptions.requestHeaders,
                cancellationToken: downloadUpdateOptions.cancellationToken,
            };
            if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
                downloadOptions.onProgress = it => this.emit(types_1.DOWNLOAD_PROGRESS, it);
            }
            const saveBlockMapToCacheDir = async (blockMapData, cacheDir) => {
                const blockMapFile = path.join(cacheDir, "current.blockmap");
                await (0, fs_extra_1.outputFile)(blockMapFile, (0, zlib_1.gzipSync)(JSON.stringify(blockMapData)));
            };
            const getBlockMapFromCacheDir = async (cacheDir) => {
                const blockMapFile = path.join(cacheDir, "current.blockmap");
                try {
                    if (await (0, fs_extra_1.pathExists)(blockMapFile)) {
                        return JSON.parse((0, zlib_1.gunzipSync)(await (0, fs_extra_1.readFile)(blockMapFile)).toString());
                    }
                }
                catch (e) {
                    this._logger.warn(`Cannot parse blockmap "${blockMapFile}", error: ${e}`);
                }
                return null;
            };
            const newBlockMapData = await downloadBlockMap(blockmapFileUrls[1]);
            await saveBlockMapToCacheDir(newBlockMapData, this.downloadedUpdateHelper.cacheDirForPendingUpdate);
            // get old blockmap from cache dir first, if not found, download it
            let oldBlockMapData = await getBlockMapFromCacheDir(this.downloadedUpdateHelper.cacheDir);
            if (oldBlockMapData == null) {
                oldBlockMapData = await downloadBlockMap(blockmapFileUrls[0]);
            }
            await new GenericDifferentialDownloader_1.GenericDifferentialDownloader(fileInfo.info, this.httpExecutor, downloadOptions).download(oldBlockMapData, newBlockMapData);
            return false;
        }
        catch (e) {
            this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
            if (this._testOnlyOptions != null) {
                // test mode
                throw e;
            }
            return true;
        }
    }
}
exports.AppUpdater = AppUpdater;
function hasPrereleaseComponents(version) {
    const versionPrereleaseComponent = (0, semver_1.prerelease)(version);
    return versionPrereleaseComponent != null && versionPrereleaseComponent.length > 0;
}
/** @private */
class NoOpLogger {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    info(message) {
        // ignore
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    warn(message) {
        // ignore
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error(message) {
        // ignore
    }
}
exports.NoOpLogger = NoOpLogger;
//# sourceMappingURL=AppUpdater.js.map
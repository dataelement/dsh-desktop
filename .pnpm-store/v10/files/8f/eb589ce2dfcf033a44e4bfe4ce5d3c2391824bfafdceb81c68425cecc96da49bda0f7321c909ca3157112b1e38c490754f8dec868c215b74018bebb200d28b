import { AllPublishOptions, CancellationToken, PublishConfiguration, UpdateInfo, DownloadOptions, ProgressInfo } from "builder-util-runtime";
import { OutgoingHttpHeaders } from "http";
import { Lazy } from "lazy-val";
import { SemVer } from "semver";
import { AppAdapter } from "./AppAdapter";
import { DownloadedUpdateHelper } from "./DownloadedUpdateHelper";
import { LoginCallback } from "./electronHttpExecutor";
import { Provider, ProviderPlatform } from "./providers/Provider";
import type { TypedEmitter } from "tiny-typed-emitter";
import Session = Electron.Session;
import type { AuthInfo } from "electron";
import { Logger, ResolvedUpdateFileInfo, UpdateCheckResult, UpdateDownloadedEvent, UpdaterSignal } from "./types";
import { VerifyUpdateSupport } from "./main";
export type AppUpdaterEvents = {
    error: (error: Error, message?: string) => void;
    login: (info: AuthInfo, callback: LoginCallback) => void;
    "checking-for-update": () => void;
    "update-not-available": (info: UpdateInfo) => void;
    "update-available": (info: UpdateInfo) => void;
    "update-downloaded": (event: UpdateDownloadedEvent) => void;
    "download-progress": (info: ProgressInfo) => void;
    "update-cancelled": (info: UpdateInfo) => void;
    "appimage-filename-updated": (path: string) => void;
};
declare const AppUpdater_base: new () => TypedEmitter<AppUpdaterEvents>;
export declare abstract class AppUpdater extends AppUpdater_base {
    /**
     * Whether to automatically download an update when it is found.
     * @default true
     */
    autoDownload: boolean;
    /**
     * Whether to automatically install a downloaded update on app quit (if `quitAndInstall` was not called before).
     * @default true
     */
    autoInstallOnAppQuit: boolean;
    /**
     * Whether to run the app after finish install when run the installer is NOT in silent mode.
     * @default true
     */
    autoRunAppAfterInstall: boolean;
    /**
     * *GitHub provider only.* Whether to allow update to pre-release versions. Defaults to `true` if application version contains prerelease components (e.g. `0.12.1-alpha.1`, here `alpha` is a prerelease component), otherwise `false`.
     *
     * If `true`, downgrade will be allowed (`allowDowngrade` will be set to `true`).
     */
    allowPrerelease: boolean;
    /**
     * *GitHub provider only.* Get all release notes (from current version to latest), not just the latest.
     * @default false
     */
    fullChangelog: boolean;
    /**
     * Whether to allow version downgrade (when a user from the beta channel wants to go back to the stable channel).
     *
     * Taken in account only if channel differs (pre-release version component in terms of semantic versioning).
     *
     * @default false
     */
    allowDowngrade: boolean;
    /**
     * Web installer files might not have signature verification, this switch prevents to load them unless it is needed.
     *
     * Currently false to prevent breaking the current API, but it should be changed to default true at some point that
     * breaking changes are allowed.
     *
     * @default false
     */
    disableWebInstaller: boolean;
    /**
     * *NSIS only* Disable differential downloads and always perform full download of installer.
     *
     * @default false
     */
    disableDifferentialDownload: boolean;
    /**
     * Allows developer to force the updater to work in "dev" mode, looking for "dev-app-update.yml" instead of "app-update.yml"
     * Dev: `path.join(this.app.getAppPath(), "dev-app-update.yml")`
     * Prod: `path.join(process.resourcesPath!, "app-update.yml")`
     *
     * @default false
     */
    forceDevUpdateConfig: boolean;
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
    previousBlockmapBaseUrlOverride: string | null;
    /**
     * The current application version.
     */
    readonly currentVersion: SemVer;
    private _channel;
    protected downloadedUpdateHelper: DownloadedUpdateHelper | null;
    /**
     * Get the update channel. Doesn't return `channel` from the update configuration, only if was previously set.
     */
    get channel(): string | null;
    /**
     * Set the update channel. Overrides `channel` in the update configuration.
     *
     * `allowDowngrade` will be automatically set to `true`. If this behavior is not suitable for you, simple set `allowDowngrade` explicitly after.
     */
    set channel(value: string | null);
    /**
     *  The request headers.
     */
    requestHeaders: OutgoingHttpHeaders | null;
    /**
     *  Shortcut for explicitly adding auth tokens to request headers
     */
    addAuthHeader(token: string): void;
    protected _logger: Logger;
    get netSession(): Session;
    /**
     * The logger. You can pass [electron-log](https://github.com/megahertz/electron-log), [winston](https://github.com/winstonjs/winston) or another logger with the following interface: `{ info(), warn(), error() }`.
     * Set it to `null` if you would like to disable a logging feature.
     */
    get logger(): Logger | null;
    set logger(value: Logger | null);
    /**
     * For type safety you can use signals, e.g. `autoUpdater.signals.updateDownloaded(() => {})` instead of `autoUpdater.on('update-available', () => {})`
     */
    readonly signals: UpdaterSignal;
    private _appUpdateConfigPath;
    /**
     * test only
     * @private
     */
    set updateConfigPath(value: string | null);
    protected _isUpdateSupported: VerifyUpdateSupport;
    /**
     * Allows developer to override default logic for determining if an update is supported.
     * The default logic compares the `UpdateInfo` minimum system version against the `os.release()` with `semver` package
     */
    get isUpdateSupported(): VerifyUpdateSupport;
    set isUpdateSupported(value: VerifyUpdateSupport);
    protected _isUserWithinRollout: VerifyUpdateSupport;
    /**
     * Allows developer to override default logic for determining if the user is below the rollout threshold.
     * The default logic compares the staging percentage with numerical representation of user ID.
     * An override can define custom logic, or bypass it if needed.
     */
    get isUserWithinRollout(): VerifyUpdateSupport;
    set isUserWithinRollout(value: VerifyUpdateSupport);
    private clientPromise;
    protected readonly stagingUserIdPromise: Lazy<string>;
    private checkForUpdatesPromise;
    private downloadPromise;
    protected readonly app: AppAdapter;
    protected updateInfoAndProvider: UpdateInfoAndProvider | null;
    protected constructor(options: AllPublishOptions | null | undefined, app?: AppAdapter);
    getFeedURL(): string | null | undefined;
    /**
     * Configure update provider. If value is `string`, [GenericServerOptions](https://www.electron.build/publish#genericserveroptions) will be set with value as `url`.
     * @param options If you want to override configuration in the `app-update.yml`.
     */
    setFeedURL(options: PublishConfiguration | AllPublishOptions | string): void;
    /**
     * Asks the server whether there is an update.
     * @returns null if the updater is disabled, otherwise info about the latest version
     */
    checkForUpdates(): Promise<UpdateCheckResult | null>;
    isUpdaterActive(): boolean;
    checkForUpdatesAndNotify(downloadNotification?: DownloadNotification): Promise<UpdateCheckResult | null>;
    private static formatDownloadNotification;
    private isStagingMatch;
    private computeFinalHeaders;
    private isUpdateAvailable;
    private checkIfUpdateSupported;
    protected getUpdateInfoAndProvider(): Promise<UpdateInfoAndProvider>;
    private createProviderRuntimeOptions;
    private doCheckForUpdates;
    protected onUpdateAvailable(updateInfo: UpdateInfo): void;
    /**
     * Start downloading update manually. You can use this method if `autoDownload` option is set to `false`.
     * @returns {Promise<Array<string>>} Paths to downloaded files.
     */
    downloadUpdate(cancellationToken?: CancellationToken): Promise<Array<string>>;
    protected dispatchError(e: Error): void;
    protected dispatchUpdateDownloaded(event: UpdateDownloadedEvent): void;
    protected abstract doDownloadUpdate(downloadUpdateOptions: DownloadUpdateOptions): Promise<Array<string>>;
    /**
     * Restarts the app and installs the update after it has been downloaded.
     * It should only be called after `update-downloaded` has been emitted.
     *
     * **Note:** `autoUpdater.quitAndInstall()` will close all application windows first and only emit `before-quit` event on `app` after that.
     * This is different from the normal quit event sequence.
     *
     * @param isSilent *windows-only* Runs the installer in silent mode. Defaults to `false`.
     * @param isForceRunAfter Run the app after finish even on silent install. Not applicable for macOS.
     * Ignored if `isSilent` is set to `false`(In this case you can still set `autoRunAppAfterInstall` to `false` to prevent run the app after finish).
     */
    abstract quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
    private loadUpdateConfig;
    private computeRequestHeaders;
    private getOrCreateStagingUserId;
    private getOrCreateDownloadHelper;
    protected executeDownload(taskOptions: DownloadExecutorTask): Promise<Array<string>>;
    protected differentialDownloadInstaller(fileInfo: ResolvedUpdateFileInfo, downloadUpdateOptions: DownloadUpdateOptions, installerPath: string, provider: Provider<any>, oldInstallerFileName: string): Promise<boolean>;
}
export interface DownloadUpdateOptions {
    readonly updateInfoAndProvider: UpdateInfoAndProvider;
    readonly requestHeaders: OutgoingHttpHeaders;
    readonly cancellationToken: CancellationToken;
    readonly disableWebInstaller?: boolean;
    readonly disableDifferentialDownload?: boolean;
}
/** @private */
export declare class NoOpLogger implements Logger {
    info(message?: any): void;
    warn(message?: any): void;
    error(message?: any): void;
}
export interface UpdateInfoAndProvider {
    info: UpdateInfo;
    provider: Provider<any>;
}
export interface DownloadExecutorTask {
    readonly fileExtension: string;
    readonly fileInfo: ResolvedUpdateFileInfo;
    readonly downloadUpdateOptions: DownloadUpdateOptions;
    readonly task: (destinationFile: string, downloadOptions: DownloadOptions, packageFile: string | null, removeTempDirIfAny: () => Promise<any>) => Promise<any>;
    readonly done?: (event: UpdateDownloadedEvent) => Promise<any>;
}
export interface DownloadNotification {
    body: string;
    title: string;
}
/** @private */
export interface TestOnlyUpdaterOptions {
    platform: ProviderPlatform;
    isUseDifferentialDownload?: boolean;
}
export {};

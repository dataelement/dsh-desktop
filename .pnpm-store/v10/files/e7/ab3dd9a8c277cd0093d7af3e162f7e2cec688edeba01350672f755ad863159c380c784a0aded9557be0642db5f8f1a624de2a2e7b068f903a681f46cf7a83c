import { CancellationToken, PackageFileInfo, ProgressInfo, UpdateFileInfo, UpdateInfo } from "builder-util-runtime";
import { EventEmitter } from "events";
import { URL } from "url";
import { LoginCallback } from "./electronHttpExecutor";
export { CancellationToken, PackageFileInfo, ProgressInfo, UpdateFileInfo, UpdateInfo };
export declare const DOWNLOAD_PROGRESS = "download-progress";
export declare const UPDATE_DOWNLOADED = "update-downloaded";
export interface Logger {
    info(message?: any): void;
    warn(message?: any): void;
    error(message?: any): void;
    debug?(message: string): void;
}
export declare class UpdaterSignal {
    private emitter;
    constructor(emitter: EventEmitter);
    /**
     * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
     */
    login(handler: LoginHandler): void;
    progress(handler: (info: ProgressInfo) => void): void;
    updateDownloaded(handler: (info: UpdateDownloadedEvent) => void): void;
    updateCancelled(handler: (info: UpdateInfo) => void): void;
}
export declare function addHandler(emitter: EventEmitter, event: UpdaterEvents, handler: (...args: Array<any>) => void): void;
export interface UpdateCheckResult {
    readonly isUpdateAvailable: boolean;
    readonly updateInfo: UpdateInfo;
    readonly downloadPromise?: Promise<Array<string>> | null;
    readonly cancellationToken?: CancellationToken;
    /** @deprecated */
    readonly versionInfo: UpdateInfo;
}
export interface UpdateDownloadedEvent extends UpdateInfo {
    downloadedFile: string;
}
export interface ResolvedUpdateFileInfo {
    readonly url: URL;
    readonly info: UpdateFileInfo;
    packageInfo?: PackageFileInfo;
}
export type UpdaterEvents = "login" | "checking-for-update" | "update-available" | "update-not-available" | "update-cancelled" | "download-progress" | "update-downloaded" | "error";
export type LoginHandler = (authInfo: any, callback: LoginCallback) => void;

import { UpdateInfo } from "builder-util-runtime";
import { ResolvedUpdateFileInfo } from "./types";
import { Logger } from "./types";
/** @private **/
export declare class DownloadedUpdateHelper {
    readonly cacheDir: string;
    private _file;
    private _packageFile;
    private versionInfo;
    private fileInfo;
    constructor(cacheDir: string);
    private _downloadedFileInfo;
    get downloadedFileInfo(): CachedUpdateInfo | null;
    get file(): string | null;
    get packageFile(): string | null;
    get cacheDirForPendingUpdate(): string;
    validateDownloadedPath(updateFile: string, updateInfo: UpdateInfo, fileInfo: ResolvedUpdateFileInfo, logger: Logger): Promise<string | null>;
    setDownloadedFile(downloadedFile: string, packageFile: string | null, versionInfo: UpdateInfo, fileInfo: ResolvedUpdateFileInfo, updateFileName: string, isSaveCache: boolean): Promise<void>;
    clear(): Promise<void>;
    private cleanCacheDirForPendingUpdate;
    /**
     * Returns "update-info.json" which is created in the update cache directory's "pending" subfolder after the first update is downloaded.  If the update file does not exist then the cache is cleared and recreated.  If the update file exists then its properties are validated.
     * @param fileInfo
     * @param logger
     */
    private getValidCachedUpdateFile;
    private getUpdateInfoFile;
}
interface CachedUpdateInfo {
    fileName: string;
    sha512: string;
    readonly isAdminRightsRequired: boolean;
}
export declare function createTempUpdateFile(name: string, cacheDir: string, log: Logger): Promise<string>;
export {};

import { AllPublishOptions } from "builder-util-runtime";
import { AppAdapter } from "./AppAdapter";
import { AppUpdater, DownloadUpdateOptions } from "./AppUpdater";
import { ResolvedUpdateFileInfo } from "./main";
export declare class MacUpdater extends AppUpdater {
    private readonly nativeUpdater;
    private squirrelDownloadedUpdate;
    private server?;
    constructor(options?: AllPublishOptions, app?: AppAdapter);
    /** Filters update files to the appropriate architecture.
     * On arm64 Macs (including Rosetta), arm64 files are preferred when available.
     * On x64 Macs, arm64 files are excluded. */
    protected static filterFilesForArch(files: ResolvedUpdateFileInfo[], isArm64Mac: boolean): ResolvedUpdateFileInfo[];
    private debug;
    private closeServerIfExists;
    protected doDownloadUpdate(downloadUpdateOptions: DownloadUpdateOptions): Promise<Array<string>>;
    private updateDownloaded;
    private handleUpdateDownloaded;
    quitAndInstall(): void;
}

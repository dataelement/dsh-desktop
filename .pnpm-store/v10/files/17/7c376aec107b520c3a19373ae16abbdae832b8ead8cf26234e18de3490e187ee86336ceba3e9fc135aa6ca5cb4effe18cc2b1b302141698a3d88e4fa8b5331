import { AllPublishOptions } from "builder-util-runtime";
import { DownloadUpdateOptions } from "./AppUpdater";
import { BaseUpdater, InstallOptions } from "./BaseUpdater";
export declare class AppImageUpdater extends BaseUpdater {
    constructor(options?: AllPublishOptions | null, app?: any);
    isUpdaterActive(): boolean;
    /*** @private */
    protected doDownloadUpdate(downloadUpdateOptions: DownloadUpdateOptions): Promise<Array<string>>;
    private downloadDifferential;
    protected doInstall(options: InstallOptions): boolean;
}

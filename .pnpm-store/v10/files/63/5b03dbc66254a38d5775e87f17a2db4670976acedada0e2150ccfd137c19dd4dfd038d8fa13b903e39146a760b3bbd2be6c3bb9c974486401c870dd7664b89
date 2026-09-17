import { AllPublishOptions } from "builder-util-runtime";
import { AppAdapter } from "./AppAdapter";
import { DownloadUpdateOptions } from "./AppUpdater";
import { InstallOptions } from "./BaseUpdater";
import { Logger } from "./types";
import { LinuxUpdater } from "./LinuxUpdater";
export declare class RpmUpdater extends LinuxUpdater {
    constructor(options?: AllPublishOptions | null, app?: AppAdapter);
    /*** @private */
    protected doDownloadUpdate(downloadUpdateOptions: DownloadUpdateOptions): Promise<Array<string>>;
    protected doInstall(options: InstallOptions): boolean;
    static installWithCommandRunner(packageManager: "zypper" | "dnf" | "yum" | "rpm", installerPath: string, commandRunner: (commandWithArgs: string[]) => void, logger: Logger): void;
}

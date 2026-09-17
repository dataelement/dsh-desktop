import { AllPublishOptions } from "builder-util-runtime";
import { StdioOptions } from "child_process";
import { AppAdapter } from "./AppAdapter";
import { AppUpdater, DownloadExecutorTask } from "./AppUpdater";
export declare abstract class BaseUpdater extends AppUpdater {
    protected quitAndInstallCalled: boolean;
    private quitHandlerAdded;
    protected constructor(options?: AllPublishOptions | null, app?: AppAdapter);
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
    protected executeDownload(taskOptions: DownloadExecutorTask): Promise<Array<string>>;
    protected get installerPath(): string | null;
    protected abstract doInstall(options: InstallOptions): boolean;
    install(isSilent?: boolean, isForceRunAfter?: boolean): boolean;
    protected addQuitHandler(): void;
    /**
     * Strips relative-path entries from a PATH string.
     * Prevents PATH-poisoning where a writable directory earlier in PATH shadows
     * a trusted package manager binary.
     */
    protected sanitizeEnvPath(envPath: string): string;
    protected spawnSyncLog(cmd: string, args?: string[], env?: {}): string;
    /**
     * This handles both node 8 and node 10 way of emitting error when spawning a process
     *   - node 8: Throws the error
     *   - node 10: Emit the error(Need to listen with on)
     */
    protected spawnLog(cmd: string, args?: string[], env?: any, stdio?: StdioOptions): Promise<boolean>;
}
export interface InstallOptions {
    readonly isSilent: boolean;
    readonly isForceRunAfter: boolean;
    readonly isAdminRightsRequired: boolean;
}

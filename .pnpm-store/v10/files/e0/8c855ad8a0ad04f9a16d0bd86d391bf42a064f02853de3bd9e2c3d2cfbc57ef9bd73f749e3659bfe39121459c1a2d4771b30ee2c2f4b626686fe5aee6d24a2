import { AllPublishOptions } from "builder-util-runtime";
import { AppAdapter } from "./AppAdapter";
import { DownloadUpdateOptions } from "./AppUpdater";
import { BaseUpdater, InstallOptions } from "./BaseUpdater";
import { VerifyUpdateCodeSignature } from "./main";
export declare class NsisUpdater extends BaseUpdater {
    /**
     * Specify custom install directory path
     *
     */
    installDirectory?: string;
    constructor(options?: AllPublishOptions | null, app?: AppAdapter);
    protected _verifyUpdateCodeSignature: VerifyUpdateCodeSignature;
    /**
     * The verifyUpdateCodeSignature. You can pass [win-verify-signature](https://github.com/beyondkmp/win-verify-trust) or another custom verify function: ` (publisherName: string[], path: string) => Promise<string | null>`.
     * The default verify function uses [windowsExecutableCodeSignatureVerifier](https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/windowsExecutableCodeSignatureVerifier.ts)
     */
    get verifyUpdateCodeSignature(): VerifyUpdateCodeSignature;
    set verifyUpdateCodeSignature(value: VerifyUpdateCodeSignature);
    /*** @private */
    protected doDownloadUpdate(downloadUpdateOptions: DownloadUpdateOptions): Promise<Array<string>>;
    private verifySignature;
    protected doInstall(options: InstallOptions): boolean;
    private differentialDownloadWebPackage;
}

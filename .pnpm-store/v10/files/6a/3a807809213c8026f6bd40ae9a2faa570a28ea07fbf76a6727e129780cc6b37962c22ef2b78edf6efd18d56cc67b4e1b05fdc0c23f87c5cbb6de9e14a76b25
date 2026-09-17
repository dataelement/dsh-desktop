import { Configuration } from "../configuration";
import { Framework } from "../Framework";
import { Packager } from "../index";
import { ElectronDownloadOptions } from "../util/electronGet";
export { ElectronDownloadOptions };
export type ElectronPlatformName = "darwin" | "linux" | "win32" | "mas";
/**
 * Electron distributables branding options.
 * @see [Electron BRANDING.json](https://github.com/electron/electron/blob/master/shell/app/BRANDING.json).
 */
export interface ElectronBrandingOptions {
    projectName?: string;
    productName?: string;
}
export declare function createBrandingOpts(opts: Configuration): Required<ElectronBrandingOptions>;
export declare function createElectronFrameworkSupport(configuration: Configuration, packager: Packager): Promise<Framework>;

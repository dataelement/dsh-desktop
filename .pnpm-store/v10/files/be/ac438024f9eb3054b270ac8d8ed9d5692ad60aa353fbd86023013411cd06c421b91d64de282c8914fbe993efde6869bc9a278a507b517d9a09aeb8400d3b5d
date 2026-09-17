import { FileTransformer } from "builder-util";
import { Platform } from "./core";
import { LibUiFramework } from "./frameworks/LibUiFramework";
export declare class ProtonFramework extends LibUiFramework {
    readonly name = "proton";
    readonly defaultAppIdPrefix = "com.proton-native.";
    constructor(version: string, macOsProductName: string, isUseLaunchUi: boolean);
    getDefaultIcon(platform: Platform): string;
    createTransformer(): FileTransformer | null;
}

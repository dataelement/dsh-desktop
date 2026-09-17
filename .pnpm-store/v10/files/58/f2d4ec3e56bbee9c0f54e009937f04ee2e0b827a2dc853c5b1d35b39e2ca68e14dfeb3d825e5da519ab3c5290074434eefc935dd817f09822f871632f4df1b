import { Arch } from "builder-util";
import { ToolsetConfig } from "../configuration";
export declare const appimageChecksums: {
    readonly "0.0.0": {
        readonly "appimage-12.0.1.7z": "d12ff7eb8f1d1ec4652ca5237a7fbdca33acc0c758045636feca62dc6ecb8ec4";
    };
    readonly "1.0.2": {
        readonly "appimage-tools-runtime-20251108.tar.gz": "a784a8c26331ec2e945c23d6bdb14af5c9df27f5939825d84b8709c61dc81eb0";
    };
    readonly "1.0.3": {
        readonly "appimage-tools-runtime-20251108.tar.gz": "84021a78ee214ae6fd33a2d62a92ba25542dd10bc86bf117a9b2d0bba44e7665";
    };
};
export declare function getLinuxToolsPath(): Promise<string>;
export declare function getLinuxToolsMacToolset(): Promise<{
    ar: string;
    lzip: string;
    gtar: string;
}>;
export declare function getFpmPath(): Promise<string>;
export declare function getAppImageTools(appimageToolVersion: ToolsetConfig["appimage"], targetArch: Arch): Promise<{
    mksquashfs: string;
    desktopFileValidate: string;
    runtime: string;
    runtimeLibraries: string;
}>;

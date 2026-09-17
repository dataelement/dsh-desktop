import { Arch } from "builder-util";
import { Nullish } from "builder-util-runtime";
import { ToolsetConfig } from "../configuration";
import { ToolInfo } from "../util/bundledTool";
export declare const wincodesignChecksums: {
    readonly "0.0.0": {};
    readonly "1.0.0": {
        readonly "rcedit-windows-2_0_0.zip": "589709935902545a8335190b08644cf61b46a9042e34c0c3ef0660a5aeddeaae";
        readonly "win-codesign-darwin-arm64.zip": "7eb41c3e6e48a75ced6b3384de22185da4bb458960fa410970eedd4e838c5c14";
        readonly "win-codesign-darwin-x86_64.zip": "3986c97429f002df63490193d7f787281836f055934e3cdd9e69c70a8acb695e";
        readonly "win-codesign-linux-amd64.zip": "d362a1a981053841554867e3e9dff51fe420fd577b44653df89bd7d3c916b156";
        readonly "win-codesign-linux-arm64.zip": "fb848d498281f081c937be48dd6ddaf49b0201f32210dfc816ad061c47ecd37b";
        readonly "win-codesign-linux-i386.zip": "11f8d9ffbf5b01e3bf6321c6d93b9b5e43d0c2d2a9fde1bca07698f2eb967cdf";
        readonly "win-codesign-windows-x64.zip": "1bd27f9fa553cb14bec8df530cb3caffcfb095f9dd187dab6eaf5e9b7d6e7bff";
        readonly "windows-kits-bundle-10_0_26100_0.zip": "1a12c81024c3499c212fdc5fac34a918e6d199271a39dfc524f6d8da484329bd";
    };
    readonly "1.1.0": {
        readonly "rcedit-windows-2_0_0.zip": "c66591ebe0919c60231f0bf79ff223e6504bfa69bc13edc1fa8bfc6177b73402";
        readonly "win-codesign-darwin-arm64.zip": "3f263b0e53cdc5410f6165471b2e808aee3148dc792efa23a7c303e7a01e67b7";
        readonly "win-codesign-darwin-x86_64.zip": "143fbdfcbc53bc273fa181356be8416829778452621484d39eadbe1ce49979ba";
        readonly "win-codesign-linux-amd64.zip": "65477fe8e40709b0f998928afb8336f82413b123310bf5adaa8efb7ed6ed0eeb";
        readonly "win-codesign-linux-arm64.zip": "575b01a966f2b775bbea119de263957378e2bd28cbd064d35f9e981827e37b59";
        readonly "win-codesign-linux-i386.zip": "aa3ce90e9aaa3449a228a3fa30633cdeb6b2791913786677a85c59db1d985598";
        readonly "win-codesign-windows-x64.zip": "6e5dcc5d7af7c00a7387e2101d1ad986aef80e963a3526da07bd0e65de484c30";
        readonly "windows-kits-bundle-10_0_26100_0.zip": "284f18a2fde66e6ecfbefc3065926c9bfdf641761a9e6cd2bd26e18d1e328bf7";
    };
};
type CodeSignVersionKey = keyof typeof wincodesignChecksums;
export declare function getSignToolPath(winCodeSign: ToolsetConfig["winCodeSign"] | Nullish, isWin: boolean): Promise<ToolInfo>;
export declare function getWindowsKitsBundle({ winCodeSign, arch }: {
    winCodeSign: CodeSignVersionKey | Nullish;
    arch: Arch;
}): Promise<{
    kit: string;
    appxAssets: string;
}>;
export declare function isOldWin6(): boolean;
export declare function getRceditBundle(winCodeSign: ToolsetConfig["winCodeSign"] | Nullish): Promise<{
    x86: string;
    x64: string;
}>;
export declare const nsisChecksums: {
    readonly "0.0.0": {};
    readonly "1.2.1": {
        readonly "nsis-bundle-3.12.tar.gz": "56997fdefe25e7928a1a68b4583d08b240b66cf660234053b20131a74cc082f4";
    };
};
type CustomNsisBinaryConfig = {
    url: string | null;
    checksum?: string | null;
    version?: string | null;
};
export declare function getMakeNsisPath(nsis: ToolsetConfig["nsis"] | Nullish, customBinary?: CustomNsisBinaryConfig | null): Promise<ToolInfo>;
type CustomNsisResourcesConfig = {
    url: string;
    checksum: string;
    version: string;
};
export declare function getNsisPluginsPath(nsis: ToolsetConfig["nsis"] | Nullish, customNsisResources?: CustomNsisResourcesConfig | null): Promise<string>;
export declare function getNsisElevatePath(nsis: ToolsetConfig["nsis"] | Nullish, customBinary?: CustomNsisBinaryConfig | null): Promise<string>;
export {};

/// <reference types="node" />
export declare enum AsarMode {
    NO_ASAR = 0,
    HAS_ASAR = 1
}
export type MergeASARsOptions = {
    x64AsarPath: string;
    arm64AsarPath: string;
    outputAsarPath: string;
    singleArchFiles?: string;
};
export declare const detectAsarMode: (appPath: string) => Promise<AsarMode>;
export declare const generateAsarIntegrity: (asarPath: string) => {
    algorithm: "SHA256";
    hash: string;
};
export declare const mergeASARs: ({ x64AsarPath, arm64AsarPath, outputAsarPath, singleArchFiles, }: MergeASARsOptions) => Promise<void>;
export declare const isUniversalMachO: (fileContent: Buffer) => boolean;

import { EventEmitter } from 'node:events';
export declare enum BuildType {
    Debug = "Debug",
    Release = "Release"
}
export type RebuildMode = 'sequential' | 'parallel';
export interface IRebuilder {
    ABI: string;
    arch: string;
    buildPath: string;
    buildType: BuildType;
    cachePath: string;
    debug: boolean;
    disablePreGypCopy: boolean;
    electronVersion: string;
    force: boolean;
    headerURL: string;
    jobs?: number;
    lifecycle: EventEmitter;
    mode: RebuildMode;
    msvsVersion?: string;
    platform: NodeJS.Platform;
    prebuildTagPrefix: string;
    buildFromSource: boolean;
    useCache: boolean;
    useElectronClang: boolean;
}

import { IRebuilder } from './types.js';
export declare class ModuleRebuilder {
    private modulePath;
    private nodeGyp;
    private rebuilder;
    private prebuildify;
    private prebuildInstall;
    private nodePreGyp;
    constructor(rebuilder: IRebuilder, modulePath: string);
    get metaPath(): string;
    get metaData(): string;
    alreadyBuiltByRebuild(): Promise<boolean>;
    cacheModuleState(cacheKey: string): Promise<void>;
    /**
     * Whether a prebuild-install-generated native module exists.
     */
    prebuildInstallNativeModuleExists(): Promise<boolean>;
    /**
     * If the native module uses prebuildify, check to see if it comes with a prebuilt module for
     * the given platform and arch.
     */
    findPrebuildifyModule(cacheKey: string): Promise<boolean>;
    findPrebuildInstallModule(cacheKey: string): Promise<boolean>;
    findNodePreGypInstallModule(cacheKey: string): Promise<boolean>;
    rebuildNodeGypModule(cacheKey: string): Promise<boolean>;
    replaceExistingNativeModule(): Promise<void>;
    writeMetadata(): Promise<void>;
    rebuild(cacheKey: string): Promise<boolean>;
}

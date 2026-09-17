import { NativeModule } from './index.js';
export declare class PrebuildInstall extends NativeModule {
    usesTool(): Promise<boolean>;
    locateBinary(): Promise<string | null>;
    run(prebuildInstallPath: string): Promise<void>;
    findPrebuiltModule(): Promise<boolean>;
    /**
     * Whether a prebuild-install-based native module exists.
     */
    prebuiltModuleExists(): Promise<boolean>;
    getPrebuildInstallRuntimeArgs(): Promise<string[]>;
}

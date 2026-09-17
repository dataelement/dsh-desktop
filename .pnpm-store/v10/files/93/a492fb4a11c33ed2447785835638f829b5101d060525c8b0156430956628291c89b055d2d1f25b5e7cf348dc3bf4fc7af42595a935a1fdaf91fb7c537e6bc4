import { NativeModule } from './index.js';
export declare function determineNativePrebuildArch(arch: string): string;
/**
 * The extension of `prebuildify`-generated native modules, after the last `.`. This value differs
 * based on whether the target arch is ARM-based.
 */
export declare function determineNativePrebuildExtension(arch: string): string;
export declare class Prebuildify extends NativeModule {
    usesTool(): Promise<boolean>;
    findPrebuiltModule(): Promise<boolean>;
}

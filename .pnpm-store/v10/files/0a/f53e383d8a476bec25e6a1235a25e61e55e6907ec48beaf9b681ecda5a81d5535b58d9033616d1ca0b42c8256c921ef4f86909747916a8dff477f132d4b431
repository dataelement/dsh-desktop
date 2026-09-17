import { DebugLogger, ExtraSpawnOptions } from "builder-util";
import { ExecFileOptions, SpawnOptions } from "child_process";
import { Lazy } from "lazy-val";
export declare class VmManager {
    get pathSep(): string;
    exec(file: string, args: Array<string>, options?: ExecFileOptions, isLogOutIfDebug?: boolean): Promise<string>;
    spawn(file: string, args: Array<string>, options?: SpawnOptions, extraOptions?: ExtraSpawnOptions): Promise<any>;
    toVmFile(file: string): string;
    readonly powershellCommand: Lazy<string>;
}
export declare function getWindowsVm(debugLogger: DebugLogger): Promise<VmManager>;
export declare function getLinuxVm(debugLogger: DebugLogger): Promise<VmManager | undefined>;
export declare const isPwshAvailable: Lazy<boolean>;
export declare const isCommandAvailable: (command: string, args: string[]) => Promise<boolean>;

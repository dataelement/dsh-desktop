import { ExtraSpawnOptions } from "builder-util";
import { ExecFileOptions, SpawnOptions } from "child_process";
import { VmManager } from "./vm";
export declare class ParallelsVmManager extends VmManager {
    private readonly vm;
    private startPromise;
    private isExitHookAdded;
    constructor(vm: ParallelsVm);
    get pathSep(): string;
    private handleExecuteError;
    exec(file: string, args: Array<string>, options?: ExecFileOptions): Promise<string>;
    spawn(file: string, args: Array<string>, options?: SpawnOptions, extraOptions?: ExtraSpawnOptions): Promise<any>;
    private doStartVm;
    private ensureThatVmStarted;
    toVmFile(file: string): string;
}
export declare function macPathToParallelsWindows(file: string): string;
export interface ParallelsVm {
    id: string;
    name: string;
    os: "win-10" | "win-11" | "ubuntu" | "elementary";
    state: "running" | "suspended" | "stopped";
}

import { ExtraSpawnOptions } from "builder-util";
import { ExecFileOptions, SpawnOptions } from "child_process";
import { VmManager } from "./vm";
export declare class MonoVmManager extends VmManager {
    constructor();
    exec(file: string, args: Array<string>, options?: ExecFileOptions, isLogOutIfDebug?: boolean): Promise<string>;
    spawn(file: string, args: Array<string>, options?: SpawnOptions, extraOptions?: ExtraSpawnOptions): Promise<any>;
}

import { ExtraSpawnOptions } from "builder-util";
import { ExecFileOptions, SpawnOptions } from "child_process";
import { ToolsetConfig } from "../configuration";
import { VmManager } from "./vm";
export declare class WineVmManager extends VmManager {
    private readonly wineToolset;
    constructor(wineToolset: ToolsetConfig["wine"]);
    exec(file: string, args: Array<string>, options?: ExecFileOptions, _isLogOutIfDebug?: boolean): Promise<string>;
    spawn(file: string, args: Array<string>, options?: SpawnOptions, extraOptions?: ExtraSpawnOptions): Promise<any>;
    toVmFile(file: string): string;
    private execWine;
}

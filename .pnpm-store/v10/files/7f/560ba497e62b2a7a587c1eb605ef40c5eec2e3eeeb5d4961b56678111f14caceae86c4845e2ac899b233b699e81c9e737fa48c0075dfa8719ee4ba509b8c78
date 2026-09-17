import { DotenvParseInput } from "dotenv-expand";
import { Lazy } from "lazy-val";
export interface ReadConfigResult<T> {
    readonly result: T;
    readonly configFile: string | null;
}
export declare function findAndReadConfig<T>(request: ReadConfigRequest): Promise<ReadConfigResult<T> | null>;
export declare function orNullIfFileNotExist<T>(promise: Promise<T>): Promise<T | null>;
export declare function orIfFileNotExist<T>(promise: Promise<T>, fallbackValue: T): Promise<T>;
export interface ReadConfigRequest {
    packageKey: string;
    configFilename: string;
    projectDir: string;
    packageMetadata: Lazy<Record<string, any> | null> | null;
}
export declare function loadConfig<T>(request: ReadConfigRequest): Promise<ReadConfigResult<T> | null>;
export declare function getConfig<T>(request: ReadConfigRequest, configPath?: string | null): Promise<ReadConfigResult<T> | null>;
export declare function loadParentConfig<T>(request: ReadConfigRequest, spec: string): Promise<ReadConfigResult<T>>;
export declare function loadEnv(envFile: string): Promise<DotenvParseInput | null>;

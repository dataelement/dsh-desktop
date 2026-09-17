import { DebugLogger } from "builder-util";
import { Nullish } from "builder-util-runtime";
import { Lazy } from "lazy-val";
import { Configuration } from "../../configuration";
export declare function getConfig(projectDir: string, configPath: string | null, configFromOptions: Configuration | Nullish, packageMetadata?: Lazy<Record<string, any> | null>): Promise<Configuration>;
/**
 * `doMergeConfigs` takes configs in the order you would pass them to
 * Object.assign as sources.
 */
export declare function doMergeConfigs(configs: Configuration[]): Configuration;
export declare function validateConfiguration(config: Configuration, debugLogger: DebugLogger): Promise<void>;
export declare function computeDefaultAppDirectory(projectDir: string, userAppDir: string | Nullish): Promise<string>;

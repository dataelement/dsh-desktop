import { Nullish } from "builder-util-runtime";
import { ChildProcess, ExecFileOptions, SpawnOptions } from "child_process";
import _debug from "debug";
export { isEmptyOrSpaces } from "./stringUtil";
export { safeStringifyJson, retry } from "builder-util-runtime";
export { TmpDir } from "temp-file";
export * from "./arch";
export { Arch, archFromString, ArchType, defaultArchFromString, getArchCliNames, getArchSuffix, toLinuxArchString } from "./arch";
export { AsyncTaskManager } from "./asyncTaskManager";
export { DebugLogger } from "./DebugLogger";
export * from "./log";
export { buildGotProxyAgent, httpExecutor, NodeHttpExecutor } from "./nodeHttpExecutor";
export * from "./promise";
export * from "./envUtil";
export { parseValidEnvVarUrl } from "./envUtil";
export { asArray, deepAssign, isValidKey } from "builder-util-runtime";
export * from "./fs";
export { generateKsuid } from "./ksuid";
export { loadCscLink, decodeCscLinkBase64, resolveCscLinkPath } from "./cscLink";
export declare const debug7z: _debug.Debugger;
export declare function serializeToYaml(object: any, skipInvalid?: boolean, noRefs?: boolean): string;
export declare function removePassword(input: string): string;
/**
 * Returns a copy of the environment with sensitive keys removed.
 * Use this when building the environment for child processes that do not
 * need signing credentials, tokens, or passwords (e.g. package managers).
 */
export declare function stripSensitiveEnvVars(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export declare function filterSensitiveEnv(env: Record<string, string | undefined>): Record<string, string | undefined>;
export declare function exec(file: string, args?: Array<string> | null, options?: ExecFileOptions, isLogOutIfDebug?: boolean): Promise<string>;
export interface ExtraSpawnOptions {
    isPipeInput?: boolean;
}
export declare function doSpawn(command: string, args: Array<string>, options?: SpawnOptions, extraOptions?: ExtraSpawnOptions): ChildProcess;
export declare function spawnAndWrite(command: string, args: Array<string>, data: string, options?: SpawnOptions): Promise<any>;
export declare function spawnAndWriteWithOutput(command: string, args: Array<string>, data: string, options?: SpawnOptions): Promise<{
    stdout: string;
    stderr: string;
}>;
export declare function spawn(command: string, args?: Array<string> | null, options?: SpawnOptions, extraOptions?: ExtraSpawnOptions): Promise<any>;
export declare class ExecError extends Error {
    readonly exitCode: number;
    alreadyLogged: boolean;
    static code: string;
    constructor(command: string, exitCode: number, out: string, errorOut: string, code?: string);
}
export declare function use<T, R>(value: T | Nullish, task: (value: T) => R): R | null;
export declare function isTokenCharValid(token: string): boolean;
export declare function getUserDefinedCacheDir(): Promise<string | undefined>;
export declare function addValue<K, T>(map: Map<K, Array<T>>, key: K, value: T): void;
export declare function isArrayEqualRegardlessOfSort(a: Array<string>, b: Array<string>): boolean;
/**
 * Recursively removes all undefined and null values from an object
 */
export declare function removeNullish<T>(obj: T): T;
export declare function replaceDefault(inList: Array<string> | Nullish, defaultList: Array<string>): Array<string>;
export declare function getPlatformIconFileName(value: string | Nullish, isMac: boolean): string | null | undefined;
export declare function isPullRequest(): boolean | "" | undefined;
export declare function isEnvTrue(value: string | Nullish): boolean;
export declare class InvalidConfigurationError extends Error {
    constructor(message: string, code?: string);
}
/**
 * Resolves a user-supplied path to an absolute form and validates it.
 *
 * Always rejects paths containing null bytes or newlines (C-level argument
 * injection risk even with array-form execFile).
 *
 * When `base` is provided, also enforces containment: the resolved path must
 * start with the resolved `base` directory.  This `startsWith`-based check is
 * the pattern that CodeQL's path-injection analysis recognises as a sanitizer,
 * clearing the taint on the returned value for interprocedural analysis.
 */
export declare function sanitizeDirPath(p: string, base?: string): string;
/**
 * Validates a path and returns the complete 7-Zip `-o<dir>` switch token.
 *
 * Input is first normalized via `sanitizeDirPath` (absolute resolution + null/newline
 * rejection), then validated for 7za switch-token safety.
 *
 * Allowlist rejects:
 *   - empty string (7za would receive bare `-o`, which fails)
 *   - leading `-`  (7za would misparse the token as a new switch)
 *   - control chars 0x00–0x1F and DEL 0x7F (C-level truncation/control risk)
 */
export declare function to7zaOutputSwitch(p: string): string;

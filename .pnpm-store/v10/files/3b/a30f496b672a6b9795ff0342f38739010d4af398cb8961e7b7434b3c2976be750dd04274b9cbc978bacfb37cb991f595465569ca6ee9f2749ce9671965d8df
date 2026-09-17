/// <reference types="node" />
import * as child from 'child_process';
import debug from 'debug';
import { BaseSignOptions, ElectronMacPlatform } from './types';
export declare const debugLog: debug.Debugger;
export declare const debugWarn: debug.Debugger;
export declare function execFileAsync(file: string, args: string[], options?: child.ExecFileOptions): Promise<string>;
type DeepListItem<T> = null | T | DeepListItem<T>[];
type DeepList<T> = DeepListItem<T>[];
export declare function compactFlattenedList<T>(list: DeepList<T>): T[];
/**
 * Returns the path to the "Contents" folder inside the application bundle
 */
export declare function getAppContentsPath(opts: BaseSignOptions): string;
/**
 * Returns the path to app "Frameworks" within contents.
 */
export declare function getAppFrameworksPath(opts: BaseSignOptions): string;
export declare function detectElectronPlatform(opts: BaseSignOptions): Promise<ElectronMacPlatform>;
/**
 * This function returns a promise validating opts.app, the application to be signed or flattened.
 */
export declare function validateOptsApp(opts: BaseSignOptions): Promise<void>;
/**
 * This function returns a promise validating opts.platform, the platform of Electron build. It allows auto-discovery if no opts.platform is specified.
 */
export declare function validateOptsPlatform(opts: BaseSignOptions): Promise<ElectronMacPlatform>;
/**
 * This function returns a promise resolving all child paths within the directory specified.
 * @function
 * @param {string} dirPath - Path to directory.
 * @returns {Promise} Promise resolving child paths needing signing in order.
 * @internal
 */
export declare function walkAsync(dirPath: string): Promise<string[]>;
export {};

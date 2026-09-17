import { Arch } from "builder-util";
import { Nullish } from "builder-util-runtime";
import { Identity } from "../codeSign/macCodeSign";
import { Target } from "../core";
import { MacPackager } from "../macPackager";
import { PkgOptions } from "../options/pkgOptions";
export declare class PkgTarget extends Target {
    private readonly packager;
    readonly outDir: string;
    readonly options: PkgOptions;
    constructor(packager: MacPackager, outDir: string);
    build(appPath: string, arch: Arch): Promise<any>;
    private getExtraPackages;
    private customizeDistributionConfiguration;
    private buildComponentPackage;
}
export declare function prepareProductBuildArgs(identity: Identity | null, keychain: string | Nullish): Array<string>;
/**
 * Resolves the version string to pass as `--version` to pkgbuild.
 * Reads CFBundleShortVersionString from the app bundle's Info.plist (what pkgbuild
 * previously inferred automatically), falling back to the appInfo version.
 */
export declare function resolvePkgBuildVersion(appPath: string, fallback: string): Promise<string>;
/**
 * Resolves the scripts directory path for pkgbuild.
 * Returns null when scripts is explicitly set to null (disabled).
 * Returns a custom path when scripts is a non-empty string.
 * Falls back to the default "pkg-scripts" directory otherwise.
 */
export declare function resolveScriptsDir(buildResourcesDir: string, scripts: string | null | undefined): string | null;

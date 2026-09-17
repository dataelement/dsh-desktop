import { Arch } from "builder-util";
import { FileAssociation } from "../../options/FileAssociation";
import { BlockMapDataHolder } from "builder-util-runtime";
import { ToolsetConfig } from "../../configuration";
import { IconInfo } from "../../util/iconConverter";
interface Options {
    productName: string;
    productFilename: string;
    executableName: string;
    desktopEntry: string;
    icons: IconInfo[];
    license?: string | null;
    fileAssociations: FileAssociation[];
    /**
     * The compression type available for static runtime is limited as it's only compiled with support for gzip and zstd.
     * "xz" is only valid for the legacy FUSE2 (0.0.0) toolset.
     *
     * [stderr] Squashfs image uses lzo compression, this version supports only zlib, zstd.
     * Failed to open squashfs image
     * Failed to extract AppImage
     *
     */
    compression?: "gzip" | "zstd" | "xz";
    /** Pre-computed desktop basename (already validated). When absent, falls back to `executableName`. */
    desktopBaseName?: string;
}
export interface AppImageBuilderOptions {
    appDir: string;
    stageDir: string;
    arch: Arch;
    output: string;
    options: Options;
}
export declare function buildStaticRuntimeAppImage(appimageToolVersion: ToolsetConfig["appimage"], opts: AppImageBuilderOptions): Promise<BlockMapDataHolder>;
export declare function buildLegacyFuse2AppImage(opts: AppImageBuilderOptions): Promise<BlockMapDataHolder>;
/**
 * Validates that critical path fields (executable name, product filename, license filename)
 * contain only characters that are safe for use in filesystem paths and embedded bash strings.
 * Allowed: Unicode letters, digits, dots, underscores, hyphens, and spaces.
 */
export declare function validateCriticalPathString(str: string, fieldName: string): void;
export type AppRunScriptBase = {
    ExecutableName: string;
    DesktopFileName: string;
    ProductFilename: string;
    ProductName: string;
    ResourceName: string;
    MimeTypeFile?: string;
};
export type AppRunScriptWithEula = AppRunScriptBase & {
    EulaFile: string;
    IsHtmlEula: boolean;
};
export type AppRunScript = AppRunScriptBase | AppRunScriptWithEula;
export declare function generateAppRunScript(config: AppRunScript): string;
export {};

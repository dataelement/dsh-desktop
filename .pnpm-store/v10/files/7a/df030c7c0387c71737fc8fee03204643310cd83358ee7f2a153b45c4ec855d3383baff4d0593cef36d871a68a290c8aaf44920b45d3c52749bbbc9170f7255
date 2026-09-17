import { LinuxPackager } from "../linuxPackager";
import { CommonLinuxOptions } from "../options/linuxOptions";
import { SnapCore } from "./snap/SnapTarget";
import { IconInfo } from "../util/iconConverter";
export declare const installPrefix = "/opt";
export declare class LinuxTargetHelper {
    private packager;
    private readonly iconPromise;
    private readonly mimeTypeFilesPromise;
    maxIconPath: string | null;
    constructor(packager: LinuxPackager);
    get icons(): Promise<Array<IconInfo>>;
    get mimeTypeFiles(): Promise<string | null>;
    getSnapCore(): SnapCore<any>;
    isElectronVersionGreaterOrEqualThan(version: string, fallback?: string): boolean;
    private computeMimeTypeFiles;
    private computeDesktopIcons;
    getDescription(options: CommonLinuxOptions): string;
    getSanitizedVersion(target: string): string;
    writeDesktopEntry(targetSpecificOptions: CommonLinuxOptions, exec?: string, destination?: string | null, extra?: Record<string, string>): Promise<string>;
    getDesktopFileName(fallback?: string): string;
    computeDesktopEntry(targetSpecificOptions: CommonLinuxOptions, exec?: string, extra?: Record<string, string>): Promise<string>;
}

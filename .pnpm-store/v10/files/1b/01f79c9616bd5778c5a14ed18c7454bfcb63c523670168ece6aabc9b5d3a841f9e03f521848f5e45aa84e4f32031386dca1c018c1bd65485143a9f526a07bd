import { DmgOptions, Target } from "app-builder-lib";
import { MacPackager } from "app-builder-lib/out/macPackager";
import { Arch } from "builder-util";
import type { DmgBuildLicenseConfig } from "./dmgLicense";
export interface DmgBuildConfig {
    title: string;
    icon?: string | null;
    "badge-icon"?: string | null;
    background?: string | null;
    "background-color"?: string | null;
    "icon-size"?: number | null;
    "text-size"?: number | null;
    window?: {
        position?: {
            x?: number;
            y?: number;
        };
        size?: {
            width?: number;
            height?: number;
        };
    };
    format?: string;
    size?: string | null;
    shrink?: boolean;
    filesystem?: string;
    "compression-level"?: number | null;
    license?: DmgBuildLicenseConfig | null;
    contents?: Array<{
        path: string;
        x: number;
        y: number;
        name?: string;
        type?: "file" | "link" | "position";
        hide_extension?: boolean;
        hidden?: boolean;
    }>;
}
export declare class DmgTarget extends Target {
    private readonly packager;
    readonly outDir: string;
    readonly options: DmgOptions;
    isAsyncSupported: boolean;
    constructor(packager: MacPackager, outDir: string);
    build(appPath: string, arch: Arch): Promise<void>;
    private signDmg;
    computeVolumeName(arch: Arch, custom?: string | null): string;
    computeDmgOptions(appPath: string): Promise<DmgOptions>;
}

import { Arch } from "builder-util";
import { SnapStoreOptions } from "builder-util-runtime";
import { Configuration } from "../../configuration";
import { Target } from "../../core";
import { LinuxPackager } from "../../linuxPackager";
import { SnapcraftOptions, SnapOptions } from "../../options/SnapOptions";
import { LinuxTargetHelper } from "../LinuxTargetHelper";
import { SnapcraftYAML } from "./snapcraft";
/** Abstract base for all snap build strategies (core24, legacy core18/20/22, custom pass-through). */
export declare abstract class SnapCore<T> {
    protected readonly packager: LinuxPackager;
    protected readonly helper: LinuxTargetHelper;
    protected readonly options: T;
    protected abstract defaultPlugs: Array<string>;
    constructor(packager: LinuxPackager, helper: LinuxTargetHelper, options: T);
    abstract createDescriptor(arch: Arch): Promise<SnapcraftYAML>;
    abstract buildSnap(params: {
        snap: SnapcraftYAML;
        appOutDir: string;
        stageDir: string;
        snapArch: Arch;
        artifactPath: string;
    }): Promise<void>;
}
/** Snap build target — merges `snapcraft` (preferred) and legacy `snap` config, then delegates to the appropriate `SnapCore` strategy. */
export default class SnapTarget extends Target {
    protected readonly packager: LinuxPackager;
    protected readonly helper: LinuxTargetHelper;
    readonly outDir: string;
    readonly options: SnapcraftOptions | SnapOptions;
    constructor(name: string, packager: LinuxPackager, helper: LinuxTargetHelper, outDir: string);
    build(appOutDir: string, arch: Arch): Promise<any>;
    protected findSnapPublishConfig(config?: Configuration): SnapStoreOptions | null;
    private findSnapPublishConfigInPublishNode;
    private isSnapStoreOptions;
}

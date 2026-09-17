import { Arch } from "builder-util";
import { Target } from "../../core";
import { LinuxPackager } from "../../linuxPackager";
import { AppImageOptions } from "../../options/linuxOptions";
import { LinuxTargetHelper } from "../LinuxTargetHelper";
export declare const APP_RUN_ENTRYPOINT = "AppRun";
export default class AppImageTarget extends Target {
    private readonly packager;
    private readonly helper;
    readonly outDir: string;
    readonly options: AppImageOptions;
    private readonly desktopEntry;
    constructor(_ignored: string, packager: LinuxPackager, helper: LinuxTargetHelper, outDir: string);
    build(appOutDir: string, arch: Arch): Promise<any>;
}

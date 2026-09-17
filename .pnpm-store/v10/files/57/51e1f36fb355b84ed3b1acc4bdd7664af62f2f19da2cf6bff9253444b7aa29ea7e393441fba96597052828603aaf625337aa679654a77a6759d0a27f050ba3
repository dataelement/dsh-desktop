import { Arch } from "builder-util";
import { SnapOptions } from "../../options/SnapOptions";
import { SnapCore } from "./SnapTarget";
import { SnapcraftYAML } from "./snapcraft";
export declare class SnapCoreLegacy extends SnapCore<SnapOptions> {
    private isUseTemplateApp;
    defaultPlugs: string[];
    private replaceDefault;
    createDescriptor(arch: Arch): Promise<SnapcraftYAML>;
    buildSnap(props: {
        snap: any;
        appOutDir: string;
        stageDir: string;
        snapArch: Arch;
        artifactPath: string;
    }): Promise<void>;
    private buildWithTemplate;
    private buildWithoutTemplate;
    private stageSnapFiles;
    private normalizePlugConfiguration;
    private isBrowserSandboxAllowed;
    private archNameToTriplet;
}
/** Single-quote a shell argument, escaping any embedded single quotes. */
export declare function shellQuote(arg: string): string;
/**
 * Builds the content of command.sh for a snap package.
 *
 * For both template and no-template builds, the desktop-integration scripts are
 * sourced from the snap root ($SNAP):
 *   - Template: scripts are embedded in the template tarball at the snap root.
 *   - No-template: the snapcraft.yaml `launch-scripts` part uses `plugin: dump,
 *     source: scripts`, which stages stageDir/scripts/ contents directly into the
 *     snap root — so $SNAP/desktop-init.sh is correct in both cases.
 *
 * The only difference between template and no-template is the app executable prefix:
 * template apps are at $SNAP/<name>; no-template apps are at $SNAP/app/<name>.
 */
export declare function buildCommandShContent(opts: {
    isTemplate: boolean;
    executableName: string;
    extraAppArgs: string[];
}): string;

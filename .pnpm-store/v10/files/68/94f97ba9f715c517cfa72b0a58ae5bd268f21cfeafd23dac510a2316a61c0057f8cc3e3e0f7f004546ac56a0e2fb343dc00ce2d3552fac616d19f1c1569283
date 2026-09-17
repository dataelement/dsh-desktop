import { Arch } from "builder-util";
import { PlugDescriptor, SlotDescriptor, SnapOptions24 } from "../../options/SnapOptions";
import { SnapCore } from "./SnapTarget";
import { SnapcraftYAML } from "./snapcraft";
import { Nullish } from "builder-util-runtime";
/** Snap build strategy for core24 — generates a native snapcraft.yaml and invokes the snapcraft CLI. */
export declare class SnapCore24 extends SnapCore<SnapOptions24> {
    defaultPlugs: string[];
    readonly configRelativePath = "snap";
    readonly guiRelativePath: string;
    createDescriptor(arch: Arch): Promise<SnapcraftYAML>;
    private isHostMode;
    /** Writes the snapcraft.yaml, stages app files, then invokes `buildSnap()` to run the actual snapcraft build. */
    buildSnap(params: {
        snap: SnapcraftYAML;
        appOutDir: string;
        stageDir: string;
        snapArch: Arch;
        artifactPath: string;
    }): Promise<void>;
    /** Converts `SnapOptions24` into a fully resolved `SnapcraftYAML` descriptor for the given architecture. */
    mapSnapOptionsToSnapcraftYAML(arch: Arch): Promise<SnapcraftYAML>;
    /**
     * Build environment variables with proper defaults
     */
    private buildEnvironment;
    /**
     * Build default layout for core24 with GNOME platform content snaps (non-extension mode)
     * This allows the app to access libraries from the gnome-46-2404 and mesa-2404 content snaps
     */
    private buildDefaultLayout;
    /**
     * Process hooks directory into hook definitions
     */
    private processHooks;
    /**
     * Normalize assumes list (can be string or array)
     */
    normalizeAssumesList(assumes: Array<string> | string | Nullish): string[] | undefined;
    /**
     * Process plugs or slots into root-level definitions and app-level references
     */
    processPlugOrSlots<T extends Array<string | SlotDescriptor | PlugDescriptor> | SlotDescriptor | PlugDescriptor | null>(items: T): {
        root: Record<string, unknown> | undefined;
        app: string[] | undefined;
    };
    private isBrowserSandboxAllowed;
    /**
     * Expand "default" keyword in arrays of anything
     */
    private expandDefaultsInArray;
}

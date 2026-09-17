import { Arch } from "builder-util";
import { SnapOptionsCustom } from "../../options/SnapOptions";
import { SnapCore } from "./SnapTarget";
import { SnapcraftYAML } from "./snapcraft";
/**
 * Pass-through snap builder for `base: "custom"`.
 *
 * electron-builder reads the file at `snapcraft.custom.yaml` (or the inline object),
 * writes it into the stage directory, and invokes snapcraft. **Nothing is injected or
 * modified in any way** — no plugs, extensions, organize mappings, desktop files,
 * environment variables, layout entries, or stage packages. `linux.*` configuration
 * is also not cascaded into the descriptor.
 *
 * Because electron-builder exerts no control over the descriptor's content, GitHub
 * issue support for snap runtime problems encountered with custom yaml files is limited.
 * Prefer a structured base (`core24`, `core22`, etc.) for a fully managed build.
 */
export declare class SnapCoreCustom extends SnapCore<SnapOptionsCustom> {
    readonly defaultPlugs: string[];
    createDescriptor(_arch: Arch): Promise<SnapcraftYAML>;
    buildSnap(params: {
        snap: SnapcraftYAML;
        appOutDir: string;
        stageDir: string;
        snapArch: Arch;
        artifactPath: string;
    }): Promise<void>;
}

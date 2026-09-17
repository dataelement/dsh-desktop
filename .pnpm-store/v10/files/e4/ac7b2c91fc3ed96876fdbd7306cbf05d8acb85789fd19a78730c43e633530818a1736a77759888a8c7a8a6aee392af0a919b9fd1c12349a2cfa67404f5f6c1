import { LinuxPackager } from "../../linuxPackager";
import { RemoteBuildOptions } from "../../options/SnapOptions";
import { SnapcraftYAML } from "./snapcraft";
export declare const SNAPCRAFT_YAML_OPTIONS: {
    readonly indent: 2;
    readonly lineWidth: -1;
    readonly noRefs: true;
};
export declare const DEFAULT_STAGE_PACKAGES: string[];
interface BuildSnapOptions {
    /** The snapcraft YAML configuration */
    snapcraftConfig: SnapcraftYAML;
    /** Working directory where snapcraft.yaml is written and the build executes */
    stageDir: string;
    /** Whether to use remote build (builds on Launchpad) */
    remoteBuild?: RemoteBuildOptions;
    /** Whether to use LXD for local builds */
    useLXD?: boolean;
    /** Whether to use Multipass for local builds */
    useMultipass?: boolean;
    /** Whether to use destructive mode (builds directly on host, Linux only) */
    useDestructiveMode?: boolean;
    /** The snap output path */
    artifactPath: string;
    /** LinuxPackager instance, used to resolve workspace dir for remote build authentication */
    packager: LinuxPackager;
    /** Snap Store credentials from SnapcraftOptions root — base64 string or file path */
    cscLink?: string;
}
/**
 * Builds a snap package from SnapcraftYAML configuration.
 *
 * `SNAPCRAFT_NO_NETWORK` is intentionally **not** forced to `"1"` here.
 * All build modes (destructive-mode, LXD, Multipass, remote) require network
 * access to download stage-packages, the base image, and extensions.
 * To opt into an offline build, set `SNAPCRAFT_NO_NETWORK=1` in your environment.
 */
export declare function buildSnap(options: BuildSnapOptions): Promise<string>;
export {};

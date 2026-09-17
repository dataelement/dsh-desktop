import { Arch, DebugLogger, TmpDir } from "builder-util";
import { CancellationToken } from "builder-util-runtime";
import { AppInfo } from "./appInfo";
import { AfterExtractContext, AfterPackContext, BeforePackContext, Configuration, Hook } from "./configuration";
import { Platform, SourceRepositoryInfo, Target } from "./core";
import { Framework } from "./Framework";
import { Metadata } from "./options/metadata";
import { ArtifactBuildStarted, ArtifactCreated, PackagerOptions } from "./packagerApi";
import { PlatformPackager } from "./platformPackager";
import { HandlerType } from "./util/asyncEventEmitter";
import { PM } from "./node-module-collector";
type PackagerEvents = {
    artifactBuildStarted: Hook<ArtifactBuildStarted, void>;
    beforePack: Hook<BeforePackContext, void>;
    afterExtract: Hook<AfterExtractContext, void>;
    afterPack: Hook<AfterPackContext, void>;
    afterSign: Hook<AfterPackContext, void>;
    artifactBuildCompleted: Hook<ArtifactCreated, void>;
    msiProjectCreated: Hook<string, void>;
    appxManifestCreated: Hook<string, void>;
    artifactCreated: Hook<ArtifactCreated, void>;
};
export declare class Packager {
    readonly cancellationToken: CancellationToken;
    readonly projectDir: string;
    private _appDir;
    get appDir(): string;
    private readonly _packageManager;
    getPackageManager(): Promise<PM>;
    getWorkspaceRoot(): Promise<string>;
    /** Stores original metadata merged with extraMetadata from configuration. */
    private _metadata;
    get metadata(): Metadata;
    /** Stores original metadata from package.json before merging with extraMetadata. */
    private _originalMetadata;
    get originalMetadata(): Metadata;
    /** The "name" field from package.json. */
    get nodePackageName(): string;
    private _nodeModulesHandledExternally;
    get areNodeModulesHandledExternally(): boolean;
    private _isPrepackedAppAsar;
    get isPrepackedAppAsar(): boolean;
    private _devMetadata;
    get devMetadata(): Metadata | null;
    private _configuration;
    get config(): Configuration;
    isTwoPackageJsonProjectLayoutUsed: boolean;
    private readonly eventEmitter;
    _appInfo: AppInfo | null;
    get appInfo(): AppInfo;
    readonly tempDirManager: TmpDir;
    private _repositoryInfo;
    readonly options: PackagerOptions;
    readonly debugLogger: DebugLogger;
    get repositoryInfo(): Promise<SourceRepositoryInfo | null>;
    private runtimeEnvironmentVariables;
    stageDirPathCustomizer: (target: Target, packager: PlatformPackager<any>, arch: Arch) => string;
    private _buildResourcesDir;
    get buildResourcesDir(): string;
    get relativeBuildResourcesDirname(): string;
    private _framework;
    get framework(): Framework;
    private readonly toDispose;
    disposeOnBuildFinish(disposer: () => Promise<void>): void;
    constructor(options: PackagerOptions, cancellationToken?: CancellationToken);
    private addPackagerEventHandlers;
    onAfterPack(handler: PackagerEvents["afterPack"]): Packager;
    onArtifactCreated(handler: PackagerEvents["artifactCreated"]): Packager;
    filterPackagerEventListeners(event: keyof PackagerEvents, type: HandlerType | undefined): {
        handler: (...args: any[]) => Promise<void> | void;
        type: HandlerType;
    }[];
    clearPackagerEventListeners(): void;
    emitArtifactBuildStarted(event: ArtifactBuildStarted, logFields?: any): Promise<void>;
    /**
     * Only for sub artifacts (update info), for main artifacts use `callArtifactBuildCompleted`.
     */
    emitArtifactCreated(event: ArtifactCreated): Promise<void>;
    emitArtifactBuildCompleted(event: ArtifactCreated): Promise<void>;
    emitAppxManifestCreated(path: string): Promise<void>;
    emitMsiProjectCreated(path: string): Promise<void>;
    emitBeforePack(context: BeforePackContext): Promise<void>;
    emitAfterPack(context: AfterPackContext): Promise<void>;
    emitAfterSign(context: AfterPackContext): Promise<void>;
    emitAfterExtract(context: AfterPackContext): Promise<void>;
    validateConfig(): Promise<void>;
    build(repositoryInfo?: SourceRepositoryInfo): Promise<BuildResult>;
    private readProjectMetadataIfTwoPackageStructureOrPrepacked;
    private doBuild;
    private createHelper;
    installAppDependencies(platform: Platform, arch: Arch): Promise<any>;
}
export interface BuildResult {
    readonly outDir: string;
    readonly artifactPaths: Array<string>;
    readonly platformToTargets: Map<Platform, Map<string, Target>>;
    readonly configuration: Configuration;
}
export {};

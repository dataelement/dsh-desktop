import { GenericServerOptions, UpdateInfo } from "builder-util-runtime";
import { AppUpdater } from "../AppUpdater";
import { ResolvedUpdateFileInfo } from "../types";
import { Provider, ProviderRuntimeOptions } from "./Provider";
export declare class GenericProvider extends Provider<UpdateInfo> {
    private readonly configuration;
    private readonly updater;
    private readonly baseUrl;
    constructor(configuration: GenericServerOptions, updater: AppUpdater, runtimeOptions: ProviderRuntimeOptions);
    private get channel();
    getLatestVersion(): Promise<UpdateInfo>;
    resolveFiles(updateInfo: UpdateInfo): Array<ResolvedUpdateFileInfo>;
}

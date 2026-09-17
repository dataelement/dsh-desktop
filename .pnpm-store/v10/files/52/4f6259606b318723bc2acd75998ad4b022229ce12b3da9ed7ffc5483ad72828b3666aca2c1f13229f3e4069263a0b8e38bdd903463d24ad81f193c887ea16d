import { KeygenOptions, UpdateInfo } from "builder-util-runtime";
import { AppUpdater } from "../AppUpdater";
import { ResolvedUpdateFileInfo } from "../types";
import { Provider, ProviderRuntimeOptions } from "./Provider";
export declare class KeygenProvider extends Provider<UpdateInfo> {
    private readonly configuration;
    private readonly updater;
    private readonly defaultHostname;
    private readonly baseUrl;
    constructor(configuration: KeygenOptions, updater: AppUpdater, runtimeOptions: ProviderRuntimeOptions);
    private get channel();
    getLatestVersion(): Promise<UpdateInfo>;
    resolveFiles(updateInfo: UpdateInfo): Array<ResolvedUpdateFileInfo>;
    toString(): string;
}

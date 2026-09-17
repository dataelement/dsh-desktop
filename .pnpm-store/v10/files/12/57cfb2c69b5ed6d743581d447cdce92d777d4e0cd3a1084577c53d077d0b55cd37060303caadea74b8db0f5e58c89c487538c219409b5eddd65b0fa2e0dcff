import { GithubOptions, UpdateInfo } from "builder-util-runtime";
import { OutgoingHttpHeaders, RequestOptions } from "http";
import { AppUpdater } from "../AppUpdater";
import { URL } from "url";
import { BaseGitHubProvider } from "./GitHubProvider";
import { ResolvedUpdateFileInfo } from "../types";
import { ProviderRuntimeOptions } from "./Provider";
export interface PrivateGitHubUpdateInfo extends UpdateInfo {
    assets: Array<Asset>;
}
export declare class PrivateGitHubProvider extends BaseGitHubProvider<PrivateGitHubUpdateInfo> {
    private readonly updater;
    private readonly token;
    constructor(options: GithubOptions, updater: AppUpdater, token: string, runtimeOptions: ProviderRuntimeOptions);
    protected createRequestOptions(url: URL, headers?: OutgoingHttpHeaders | null): RequestOptions;
    getLatestVersion(): Promise<PrivateGitHubUpdateInfo>;
    get fileExtraDownloadHeaders(): OutgoingHttpHeaders | null;
    private configureHeaders;
    private getLatestVersionInfo;
    private get basePath();
    resolveFiles(updateInfo: PrivateGitHubUpdateInfo): Array<ResolvedUpdateFileInfo>;
}
export interface Asset {
    name: string;
    url: string;
}

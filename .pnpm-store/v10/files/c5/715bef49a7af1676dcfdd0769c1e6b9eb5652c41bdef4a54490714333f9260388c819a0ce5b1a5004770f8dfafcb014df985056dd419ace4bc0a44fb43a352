import { GithubOptions, ReleaseNoteInfo, UpdateInfo, XElement } from "builder-util-runtime";
import * as semver from "semver";
import { URL } from "url";
import { AppUpdater } from "../AppUpdater";
import { ResolvedUpdateFileInfo } from "../types";
import { Provider, ProviderRuntimeOptions } from "./Provider";
interface GithubUpdateInfo extends UpdateInfo {
    tag: string;
}
export declare abstract class BaseGitHubProvider<T extends UpdateInfo> extends Provider<T> {
    protected readonly options: GithubOptions;
    protected readonly baseUrl: URL;
    protected readonly baseApiUrl: URL;
    protected constructor(options: GithubOptions, defaultHost: string, runtimeOptions: ProviderRuntimeOptions);
    protected computeGithubBasePath(result: string): string;
}
export declare class GitHubProvider extends BaseGitHubProvider<GithubUpdateInfo> {
    protected readonly options: GithubOptions;
    private readonly updater;
    constructor(options: GithubOptions, updater: AppUpdater, runtimeOptions: ProviderRuntimeOptions);
    private get channel();
    getLatestVersion(): Promise<GithubUpdateInfo>;
    private getLatestTagName;
    private get basePath();
    resolveFiles(updateInfo: GithubUpdateInfo): Array<ResolvedUpdateFileInfo>;
    private getBaseDownloadPath;
}
export declare function computeReleaseNotes(currentVersion: semver.SemVer, isFullChangelog: boolean, feed: XElement, latestRelease: XElement): string | Array<ReleaseNoteInfo> | null;
export {};

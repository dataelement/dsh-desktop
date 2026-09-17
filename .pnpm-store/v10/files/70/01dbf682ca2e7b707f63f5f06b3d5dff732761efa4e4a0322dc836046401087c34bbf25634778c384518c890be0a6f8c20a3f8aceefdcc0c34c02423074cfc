import { GitlabOptions, UpdateInfo } from "builder-util-runtime";
import { OutgoingHttpHeaders, RequestOptions } from "http";
import { URL } from "url";
import { AppUpdater } from "../AppUpdater";
import { ResolvedUpdateFileInfo } from "../types";
import { Provider, ProviderRuntimeOptions } from "./Provider";
interface GitlabUpdateInfo extends UpdateInfo {
    tag: string;
    assets: Map<string, string>;
}
export declare class GitLabProvider extends Provider<GitlabUpdateInfo> {
    private readonly options;
    private readonly updater;
    private readonly baseApiUrl;
    private cachedLatestVersion;
    /**
     * Normalizes filenames by replacing spaces and underscores with dashes.
     *
     * This is a workaround to handle filename formatting differences between tools:
     * - electron-builder formats filenames like "test file.txt" as "test-file.txt"
     * - GitLab may provide asset URLs using underscores, such as "test_file.txt"
     *
     * Because of this mismatch, we can't reliably extract the correct filename from
     * the asset path without normalization. This function ensures consistent matching
     * across different filename formats by converting all spaces and underscores to dashes.
     *
     * @param filename The filename to normalize
     * @returns The normalized filename with spaces and underscores replaced by dashes
     */
    private normalizeFilename;
    constructor(options: GitlabOptions, updater: AppUpdater, runtimeOptions: ProviderRuntimeOptions);
    protected createRequestOptions(url: URL, headers?: OutgoingHttpHeaders | null): RequestOptions;
    private get channel();
    getLatestVersion(): Promise<GitlabUpdateInfo>;
    /**
     * Utility function to convert GitlabReleaseAsset to Map<string, string>
     * Maps asset names to their download URLs
     */
    private convertAssetsToMap;
    /**
     * Find blockmap file URL in assets map for a specific filename
     */
    private findBlockMapInAssets;
    private fetchReleaseInfoByVersion;
    private setAuthHeaderForToken;
    /**
     * Get version info for blockmap files, using cache when possible
     */
    private getVersionInfoForBlockMap;
    /**
     * Find blockmap URLs from version assets
     */
    private findBlockMapUrlsFromAssets;
    getBlockMapFiles(baseUrl: URL, oldVersion: string, newVersion: string, oldBlockMapFileBaseUrl?: string | null): Promise<URL[]>;
    resolveFiles(updateInfo: GitlabUpdateInfo): Array<ResolvedUpdateFileInfo>;
    toString(): string;
}
export {};

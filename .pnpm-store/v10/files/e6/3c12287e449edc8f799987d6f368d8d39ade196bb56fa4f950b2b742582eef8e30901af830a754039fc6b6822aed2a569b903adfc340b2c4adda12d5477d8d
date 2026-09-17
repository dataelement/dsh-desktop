import { CancellationToken, UpdateFileInfo, UpdateInfo } from "builder-util-runtime";
import { OutgoingHttpHeaders, RequestOptions } from "http";
import { URL } from "url";
import { ElectronHttpExecutor } from "../electronHttpExecutor";
import { ResolvedUpdateFileInfo } from "../types";
export type ProviderPlatform = "darwin" | "linux" | "win32";
export interface ProviderRuntimeOptions {
    isUseMultipleRangeRequest: boolean;
    platform: ProviderPlatform;
    executor: ElectronHttpExecutor;
}
export declare abstract class Provider<T extends UpdateInfo> {
    private readonly runtimeOptions;
    private requestHeaders;
    protected readonly executor: ElectronHttpExecutor;
    protected constructor(runtimeOptions: ProviderRuntimeOptions);
    getBlockMapFiles(baseUrl: URL, oldVersion: string, newVersion: string, oldBlockMapFileBaseUrl?: string | null): URL[] | Promise<URL[]>;
    get isUseMultipleRangeRequest(): boolean;
    private getChannelFilePrefix;
    protected getDefaultChannelName(): string;
    protected getCustomChannelName(channel: string): string;
    get fileExtraDownloadHeaders(): OutgoingHttpHeaders | null;
    setRequestHeaders(value: OutgoingHttpHeaders | null): void;
    abstract getLatestVersion(): Promise<T>;
    abstract resolveFiles(updateInfo: T): Array<ResolvedUpdateFileInfo>;
    /**
     * Method to perform API request only to resolve update info, but not to download update.
     */
    protected httpRequest(url: URL, headers?: OutgoingHttpHeaders | null, cancellationToken?: CancellationToken): Promise<string | null>;
    protected createRequestOptions(url: URL, headers?: OutgoingHttpHeaders | null): RequestOptions;
}
export declare function findFile(files: Array<ResolvedUpdateFileInfo>, extension: string, not?: Array<string>): ResolvedUpdateFileInfo | null | undefined;
export declare function parseUpdateInfo(rawData: string | null, channelFile: string, channelFileUrl: URL): UpdateInfo;
export declare function getFileList(updateInfo: UpdateInfo): Array<UpdateFileInfo>;
export declare function resolveFiles(updateInfo: UpdateInfo, baseUrl: URL, pathTransformer?: (p: string) => string): Array<ResolvedUpdateFileInfo>;

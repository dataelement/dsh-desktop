import { BlockMapDataHolder, HttpExecutor } from "builder-util-runtime";
import { BlockMap } from "builder-util-runtime/out/blockMapApi";
import { OutgoingHttpHeaders, RequestOptions } from "http";
import { ProgressInfo, CancellationToken } from "builder-util-runtime";
import { Logger } from "../types";
import { URL } from "url";
export interface DifferentialDownloaderOptions {
    readonly oldFile: string;
    readonly newUrl: URL;
    readonly logger: Logger;
    readonly newFile: string;
    readonly requestHeaders: OutgoingHttpHeaders | null;
    readonly isUseMultipleRangeRequest?: boolean;
    readonly cancellationToken: CancellationToken;
    onProgress?: (progress: ProgressInfo) => void;
}
export declare abstract class DifferentialDownloader {
    protected readonly blockAwareFileInfo: BlockMapDataHolder;
    readonly httpExecutor: HttpExecutor<any>;
    readonly options: DifferentialDownloaderOptions;
    fileMetadataBuffer: Buffer | null;
    private readonly logger;
    constructor(blockAwareFileInfo: BlockMapDataHolder, httpExecutor: HttpExecutor<any>, options: DifferentialDownloaderOptions);
    createRequestOptions(): RequestOptions;
    protected doDownload(oldBlockMap: BlockMap, newBlockMap: BlockMap): Promise<any>;
    private downloadFile;
    private doDownloadFile;
    protected readRemoteBytes(start: number, endInclusive: number): Promise<Buffer>;
    private request;
}

import { Transform } from "stream";
import { CancellationToken } from "builder-util-runtime";
export interface ProgressInfo {
    total: number;
    delta: number;
    transferred: number;
    percent: number;
    bytesPerSecond: number;
}
export interface ProgressDifferentialDownloadInfo {
    expectedByteCounts: Array<number>;
    grandTotal: number;
}
export declare class ProgressDifferentialDownloadCallbackTransform extends Transform {
    private readonly progressDifferentialDownloadInfo;
    private readonly cancellationToken;
    private readonly onProgress;
    private start;
    private transferred;
    private delta;
    private expectedBytes;
    private index;
    private operationType;
    private nextUpdate;
    constructor(progressDifferentialDownloadInfo: ProgressDifferentialDownloadInfo, cancellationToken: CancellationToken, onProgress: (info: ProgressInfo) => any);
    _transform(chunk: any, encoding: string, callback: any): void;
    beginFileCopy(): void;
    beginRangeDownload(): void;
    endRangeDownload(): void;
    _flush(callback: any): void;
}

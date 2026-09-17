import { Writable } from "stream";
import { Operation } from "./downloadPlanBuilder";
import { ProgressInfo } from "./ProgressDifferentialDownloadCallbackTransform";
export interface PartListDataTask {
    readonly oldFileFd: number;
    readonly tasks: Array<Operation>;
    readonly start: number;
    readonly end: number;
}
export declare function copyData(task: Operation, out: Writable, oldFileFd: number, reject: (error: Error) => void, resolve: () => void): void;
export declare class DataSplitter extends Writable {
    private readonly out;
    private readonly options;
    private readonly partIndexToTaskIndex;
    private readonly partIndexToLength;
    private readonly finishHandler;
    private readonly grandTotalBytes;
    private readonly onProgress?;
    private start;
    private nextUpdate;
    private transferred;
    private delta;
    partIndex: number;
    private headerListBuffer;
    private readState;
    private ignoreByteCount;
    private remainingPartDataCount;
    private readonly boundaryLength;
    constructor(out: Writable, options: PartListDataTask, partIndexToTaskIndex: Map<number, number>, boundary: string, partIndexToLength: Array<number>, finishHandler: () => any, grandTotalBytes: number, onProgress?: ((info: ProgressInfo) => any) | undefined);
    get isFinished(): boolean;
    _write(data: Buffer, encoding: string, callback: (error?: Error) => void): void;
    private handleData;
    private copyExistingData;
    private searchHeaderListEnd;
    private actualPartLength;
    private onPartEnd;
    private processPartStarted;
    private processPartData;
}

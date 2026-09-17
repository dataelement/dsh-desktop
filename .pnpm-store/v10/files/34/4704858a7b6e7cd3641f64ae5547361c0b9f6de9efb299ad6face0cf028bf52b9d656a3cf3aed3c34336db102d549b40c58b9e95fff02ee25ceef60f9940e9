import { PublishProvider } from "builder-util-runtime";
import { Stats } from "fs-extra";
import { PublishContext, UploadTask } from ".";
import { ProgressBar } from "./progress";
export declare abstract class Publisher {
    protected readonly context: PublishContext;
    protected constructor(context: PublishContext);
    abstract get providerName(): PublishProvider;
    abstract upload(task: UploadTask): Promise<any>;
    protected createProgressBar(fileName: string, size: number): ProgressBar | null;
    protected createReadStreamAndProgressBar(file: string, fileStat: Stats, progressBar: ProgressBar | null, reject: (error: Error) => void): NodeJS.ReadableStream;
    abstract toString(): string;
}
export declare function getCiTag(): string | null;

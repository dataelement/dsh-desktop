import { Arch } from "builder-util";
import { ClientRequest } from "http";
import { PublishContext, UploadTask } from ".";
import { Publisher } from "./publisher";
export declare abstract class HttpPublisher extends Publisher {
    protected readonly context: PublishContext;
    private readonly useSafeArtifactName;
    protected constructor(context: PublishContext, useSafeArtifactName?: boolean);
    upload(task: UploadTask): Promise<any>;
    protected abstract doUpload(fileName: string, arch: Arch, dataLength: number, requestProcessor: (request: ClientRequest, reject: (error: Error) => void) => void, file: string): Promise<any>;
}

import { SnapStoreOptions } from "builder-util-runtime/out/publishOptions";
import { PublishContext, UploadTask } from ".";
import { Publisher } from "./publisher";
export declare class SnapStorePublisher extends Publisher {
    readonly context: PublishContext;
    private readonly options;
    private readonly credentials;
    readonly providerName = "snapStore";
    constructor(context: PublishContext, options: SnapStoreOptions, credentials: {
        cscLink: string | undefined;
        resourcesDir: string;
    });
    upload(task: UploadTask): Promise<any>;
    toString(): string;
}
export declare function resolveSnapCredentials(cscLink: string | undefined, resourcesDir: string | undefined): Promise<Record<string, string>>;

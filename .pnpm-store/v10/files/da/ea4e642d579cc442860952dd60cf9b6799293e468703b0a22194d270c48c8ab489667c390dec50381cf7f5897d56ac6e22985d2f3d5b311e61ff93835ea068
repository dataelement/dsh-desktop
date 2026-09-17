import { S3Options } from "builder-util-runtime";
import { PublishContext } from "..";
import { BaseS3Publisher, S3UploadConfig, S3UploadExtraParams } from "./baseS3Publisher";
export declare class S3Publisher extends BaseS3Publisher {
    private readonly info;
    readonly providerName = "s3";
    constructor(context: PublishContext, info: S3Options);
    static checkAndResolveOptions(options: S3Options, channelFromAppVersion: string | null, errorIfCannot: boolean): Promise<void>;
    protected getBucketName(): string;
    getS3UploadConfig(): S3UploadConfig;
    getUploadExtraParams(): S3UploadExtraParams;
    toString(): string;
}

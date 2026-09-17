import { BaseS3Options } from "builder-util-runtime";
import { PublishContext, UploadTask } from "..";
import { Publisher } from "../publisher";
import type { AwsCredentials } from "./awsCredentials";
export interface S3UploadConfig {
    region: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    credentials?: AwsCredentials;
}
export interface S3UploadExtraParams {
    acl?: string;
    storageClass?: string;
    serverSideEncryption?: string;
}
export declare abstract class BaseS3Publisher extends Publisher {
    private readonly options;
    protected constructor(context: PublishContext, options: BaseS3Options);
    protected abstract getBucketName(): string;
    abstract getS3UploadConfig(): S3UploadConfig;
    getUploadExtraParams(): S3UploadExtraParams;
    upload(task: UploadTask): Promise<any>;
    toString(): string;
}

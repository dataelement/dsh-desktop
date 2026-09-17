import * as http from "http";
import type { AwsCredentials } from "./awsCredentials";
export interface S3PutObjectParams {
    bucket: string;
    key: string;
    file: string;
    region: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    contentType: string;
    acl?: string;
    storageClass?: string;
    serverSideEncryption?: string;
    credentials?: AwsCredentials;
}
/**
 * Uploads a file to S3 (or S3-compatible storage) using a single PutObject request.
 * Suitable for files up to 5 GB — the S3 single-part upload limit.
 * Returns the underlying ClientRequest so callers can abort mid-flight.
 * Mirrors the behaviour of the `publish-s3` app-builder subcommand.
 */
export declare function startS3PutObject(params: S3PutObjectParams): {
    req: http.ClientRequest;
    done: Promise<void>;
};
/**
 * Returns the MIME content-type for an S3 upload key, using explicit overrides
 * for formats that mime databases commonly misidentify. Mirrors the Go binary's
 * getContentType() function in pkg/publisher/s3.go.
 */
export declare function getS3ContentType(file: string): string;

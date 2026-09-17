/**
 * Resolves the AWS region for a bucket via the S3 GetBucketLocation API (SigV4-signed).
 * Uses path-style endpoint so dotted bucket names pass TLS hostname validation.
 * Credentials are resolved via the standard provider chain (env vars → ~/.aws/credentials).
 * AWS returns an empty LocationConstraint element for us-east-1 (the implicit default region).
 * Mirrors the behaviour of the `get-bucket-location` app-builder subcommand.
 */
export declare function getBucketLocation(bucket: string): Promise<string>;

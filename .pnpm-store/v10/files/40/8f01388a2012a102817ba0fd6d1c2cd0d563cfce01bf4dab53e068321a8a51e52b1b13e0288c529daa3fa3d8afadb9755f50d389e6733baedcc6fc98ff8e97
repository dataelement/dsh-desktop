export interface AwsCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
}
/**
 * Resolves AWS credentials using the standard provider chain:
 *   1. Environment variables (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
 *   2. Shared credentials file (~/.aws/credentials, respects AWS_PROFILE)
 *
 * Returns undefined when no credentials are found — callers should let aws4 sign
 * with anonymous credentials or throw a descriptive error as appropriate.
 */
export declare function resolveAwsCredentials(): AwsCredentials | undefined;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Publisher = void 0;
const builder_util_1 = require("builder-util");
const awsCredentials_1 = require("./awsCredentials");
const baseS3Publisher_1 = require("./baseS3Publisher");
const bucketLocation_1 = require("./bucketLocation");
class S3Publisher extends baseS3Publisher_1.BaseS3Publisher {
    constructor(context, info) {
        super(context, info);
        this.info = info;
        this.providerName = "s3";
    }
    static async checkAndResolveOptions(options, channelFromAppVersion, errorIfCannot) {
        const bucket = options.bucket;
        if (bucket == null) {
            throw new builder_util_1.InvalidConfigurationError(`Please specify "bucket" for "s3" publish provider`);
        }
        if (options.endpoint == null && bucket.includes(".") && options.region == null) {
            // on dotted bucket names, we need to use a path-based endpoint URL. Path-based endpoint URLs need to include the region.
            try {
                options.region = await (0, bucketLocation_1.getBucketLocation)(bucket);
            }
            catch (e) {
                if (errorIfCannot) {
                    throw e;
                }
                else {
                    builder_util_1.log.warn(`cannot compute region for bucket (required because on dotted bucket names, we need to use a path-based endpoint URL): ${e}`);
                }
            }
        }
        if (options.channel == null && channelFromAppVersion != null) {
            options.channel = channelFromAppVersion;
        }
        if (options.endpoint != null && options.endpoint.endsWith("/")) {
            ;
            options.endpoint = options.endpoint.slice(0, -1);
        }
    }
    getBucketName() {
        return this.info.bucket;
    }
    getS3UploadConfig() {
        var _a, _b, _c;
        return {
            region: (_a = this.info.region) !== null && _a !== void 0 ? _a : "us-east-1",
            endpoint: (_b = this.info.endpoint) !== null && _b !== void 0 ? _b : undefined,
            forcePathStyle: (_c = this.info.forcePathStyle) !== null && _c !== void 0 ? _c : undefined,
            credentials: (0, awsCredentials_1.resolveAwsCredentials)(),
        };
    }
    getUploadExtraParams() {
        var _a, _b;
        const base = super.getUploadExtraParams();
        return {
            ...base,
            storageClass: (_a = this.info.storageClass) !== null && _a !== void 0 ? _a : undefined,
            serverSideEncryption: (_b = this.info.encryption) !== null && _b !== void 0 ? _b : undefined,
        };
    }
    toString() {
        const result = super.toString();
        const endpoint = this.info.endpoint;
        if (endpoint != null) {
            return result.substring(0, result.length - 1) + `, endpoint: ${endpoint})`;
        }
        return result;
    }
}
exports.S3Publisher = S3Publisher;
//# sourceMappingURL=s3Publisher.js.map
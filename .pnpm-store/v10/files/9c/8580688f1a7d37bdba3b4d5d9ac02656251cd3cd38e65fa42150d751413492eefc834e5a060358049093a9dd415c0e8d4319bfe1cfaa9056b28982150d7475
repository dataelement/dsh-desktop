"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseS3Publisher = void 0;
const builder_util_1 = require("builder-util");
const promises_1 = require("fs/promises");
const path = require("path");
const publisher_1 = require("../publisher");
const s3UploadHelper_1 = require("./s3UploadHelper");
class BaseS3Publisher extends publisher_1.Publisher {
    constructor(context, options) {
        super(context);
        this.options = options;
    }
    getUploadExtraParams() {
        var _a;
        return {
            acl: this.options.acl !== null ? ((_a = this.options.acl) !== null && _a !== void 0 ? _a : "public-read") : undefined,
        };
    }
    // http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/s3-example-creating-buckets.html
    async upload(task) {
        const fileName = path.basename(task.file);
        const cancellationToken = this.context.cancellationToken;
        const key = (this.options.path == null ? "" : `${this.options.path}/`) + fileName;
        if (process.env.__TEST_S3_PUBLISHER__ != null) {
            const testFile = path.join(process.env.__TEST_S3_PUBLISHER__, key);
            await (0, promises_1.mkdir)(path.dirname(testFile), { recursive: true });
            await (0, promises_1.symlink)(task.file, testFile);
            return;
        }
        this.createProgressBar(fileName, -1);
        const config = this.getS3UploadConfig();
        const extraParams = this.getUploadExtraParams();
        return await cancellationToken.createPromise((resolve, reject, onCancel) => {
            const { req, done } = (0, s3UploadHelper_1.startS3PutObject)({
                bucket: this.getBucketName(),
                key,
                file: task.file,
                contentType: (0, s3UploadHelper_1.getS3ContentType)(task.file),
                ...config,
                ...extraParams,
            });
            onCancel(() => req.destroy());
            done
                .then(() => {
                try {
                    builder_util_1.log.debug({ provider: this.providerName, file: fileName, bucket: this.getBucketName() }, "uploaded");
                }
                finally {
                    resolve(undefined);
                }
            })
                .catch(reject);
        });
    }
    toString() {
        return `${this.providerName} (bucket: ${this.getBucketName()})`;
    }
}
exports.BaseS3Publisher = BaseS3Publisher;
//# sourceMappingURL=baseS3Publisher.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitbucketPublisher = void 0;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const FormData = require("form-data");
const fs_extra_1 = require("fs-extra");
const httpPublisher_1 = require("./httpPublisher");
class BitbucketPublisher extends httpPublisher_1.HttpPublisher {
    constructor(context, info) {
        super(context);
        this.providerName = "bitbucket";
        this.hostname = "api.bitbucket.org";
        const token = info.token || process.env.BITBUCKET_TOKEN || null;
        const username = info.username || process.env.BITBUCKET_USERNAME || null;
        if ((0, builder_util_1.isEmptyOrSpaces)(token)) {
            throw new builder_util_1.InvalidConfigurationError(`Bitbucket token is not set using env "BITBUCKET_TOKEN" (see https://www.electron.build/publish#BitbucketOptions)`);
        }
        if ((0, builder_util_1.isEmptyOrSpaces)(username)) {
            builder_util_1.log.warn('No Bitbucket username provided via "BITBUCKET_USERNAME". Defaulting to use repo owner.');
        }
        this.info = info;
        this.auth = BitbucketPublisher.convertAppPassword(username !== null && username !== void 0 ? username : this.info.owner, token);
        this.basePath = `/2.0/repositories/${this.info.owner}/${this.info.slug}/downloads`;
    }
    doUpload(fileName, _arch, _dataLength, _requestProcessor, file) {
        return builder_util_runtime_1.HttpExecutor.retryOnServerError(async () => {
            const fileContent = await (0, fs_extra_1.readFile)(file);
            const form = new FormData();
            form.append("files", fileContent, fileName);
            const upload = {
                hostname: this.hostname,
                path: this.basePath,
                headers: form.getHeaders(),
                timeout: this.info.timeout || undefined,
            };
            await builder_util_1.httpExecutor.doApiRequest((0, builder_util_runtime_1.configureRequestOptions)(upload, this.auth, "POST"), this.context.cancellationToken, it => form.pipe(it));
            return fileName;
        });
    }
    async deleteRelease(filename) {
        const req = {
            hostname: this.hostname,
            path: `${this.basePath}/${filename}`,
            timeout: this.info.timeout || undefined,
        };
        await builder_util_1.httpExecutor.request((0, builder_util_runtime_1.configureRequestOptions)(req, this.auth, "DELETE"), this.context.cancellationToken);
    }
    toString() {
        const { owner, slug, channel } = this.info;
        return `Bitbucket (owner: ${owner}, slug: ${slug}, channel: ${channel})`;
    }
    static convertAppPassword(username, token) {
        const base64encodedData = Buffer.from(`${username}:${token.trim()}`).toString("base64");
        return `Basic ${base64encodedData}`;
    }
}
exports.BitbucketPublisher = BitbucketPublisher;
//# sourceMappingURL=bitbucketPublisher.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitbucketProvider = void 0;
const builder_util_runtime_1 = require("builder-util-runtime");
const util_1 = require("../util");
const Provider_1 = require("./Provider");
class BitbucketProvider extends Provider_1.Provider {
    constructor(configuration, updater, runtimeOptions) {
        super({
            ...runtimeOptions,
            isUseMultipleRangeRequest: false,
        });
        this.configuration = configuration;
        this.updater = updater;
        const { owner, slug } = configuration;
        this.baseUrl = (0, util_1.newBaseUrl)(`https://api.bitbucket.org/2.0/repositories/${owner}/${slug}/downloads`);
    }
    get channel() {
        return this.updater.channel || this.configuration.channel || "latest";
    }
    async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const channelFile = (0, util_1.getChannelFilename)(this.getCustomChannelName(this.channel));
        const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        try {
            const updateInfo = await this.httpRequest(channelUrl, undefined, cancellationToken);
            return (0, Provider_1.parseUpdateInfo)(updateInfo, channelFile, channelUrl);
        }
        catch (e) {
            throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
    }
    resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
    }
    toString() {
        const { owner, slug } = this.configuration;
        return `Bitbucket (owner: ${owner}, slug: ${slug}, channel: ${this.channel})`;
    }
}
exports.BitbucketProvider = BitbucketProvider;
//# sourceMappingURL=BitbucketProvider.js.map
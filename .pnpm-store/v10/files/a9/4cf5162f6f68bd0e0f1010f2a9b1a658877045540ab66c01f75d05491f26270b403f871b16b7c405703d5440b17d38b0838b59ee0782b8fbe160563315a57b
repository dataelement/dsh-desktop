"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeygenProvider = void 0;
const builder_util_runtime_1 = require("builder-util-runtime");
const util_1 = require("../util");
const Provider_1 = require("./Provider");
class KeygenProvider extends Provider_1.Provider {
    constructor(configuration, updater, runtimeOptions) {
        super({
            ...runtimeOptions,
            isUseMultipleRangeRequest: false,
        });
        this.configuration = configuration;
        this.updater = updater;
        this.defaultHostname = "api.keygen.sh";
        const host = this.configuration.host || this.defaultHostname;
        this.baseUrl = (0, util_1.newBaseUrl)(`https://${host}/v1/accounts/${this.configuration.account}/artifacts?product=${this.configuration.product}`);
    }
    get channel() {
        return this.updater.channel || this.configuration.channel || "stable";
    }
    async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const channelFile = (0, util_1.getChannelFilename)(this.getCustomChannelName(this.channel));
        const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        try {
            const updateInfo = await this.httpRequest(channelUrl, {
                Accept: "application/vnd.api+json",
                "Keygen-Version": "1.1",
            }, cancellationToken);
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
        const { account, product, platform } = this.configuration;
        return `Keygen (account: ${account}, product: ${product}, platform: ${platform}, channel: ${this.channel})`;
    }
}
exports.KeygenProvider = KeygenProvider;
//# sourceMappingURL=KeygenProvider.js.map
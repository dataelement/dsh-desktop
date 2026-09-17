"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericProvider = void 0;
const builder_util_runtime_1 = require("builder-util-runtime");
const util_1 = require("../util");
const Provider_1 = require("./Provider");
class GenericProvider extends Provider_1.Provider {
    constructor(configuration, updater, runtimeOptions) {
        super(runtimeOptions);
        this.configuration = configuration;
        this.updater = updater;
        this.baseUrl = (0, util_1.newBaseUrl)(this.configuration.url);
    }
    get channel() {
        const result = this.updater.channel || this.configuration.channel;
        return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
    }
    async getLatestVersion() {
        const channelFile = (0, util_1.getChannelFilename)(this.channel);
        const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        for (let attemptNumber = 0;; attemptNumber++) {
            try {
                return (0, Provider_1.parseUpdateInfo)(await this.httpRequest(channelUrl), channelFile, channelUrl);
            }
            catch (e) {
                if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
                    throw (0, builder_util_runtime_1.newError)(`Cannot find channel "${channelFile}" update info: ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
                }
                else if (e.code === "ECONNREFUSED") {
                    if (attemptNumber < 3) {
                        await new Promise((resolve, reject) => {
                            try {
                                setTimeout(resolve, 1000 * attemptNumber);
                            }
                            catch (e) {
                                reject(e);
                            }
                        });
                        continue;
                    }
                }
                throw e;
            }
        }
    }
    resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
    }
}
exports.GenericProvider = GenericProvider;
//# sourceMappingURL=GenericProvider.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpacesPublisher = void 0;
const builder_util_1 = require("builder-util");
const baseS3Publisher_1 = require("./baseS3Publisher");
class SpacesPublisher extends baseS3Publisher_1.BaseS3Publisher {
    constructor(context, info) {
        super(context, info);
        this.info = info;
        this.providerName = "spaces";
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static checkAndResolveOptions(options, channelFromAppVersion, _errorIfCannot) {
        if (options.name == null) {
            throw new builder_util_1.InvalidConfigurationError(`Please specify "name" for "spaces" publish provider (see https://www.electron.build/publish#spacesoptions)`);
        }
        if (options.region == null) {
            throw new builder_util_1.InvalidConfigurationError(`Please specify "region" for "spaces" publish provider (see https://www.electron.build/publish#spacesoptions)`);
        }
        if (options.channel == null && channelFromAppVersion != null) {
            options.channel = channelFromAppVersion;
        }
        return Promise.resolve();
    }
    getBucketName() {
        return this.info.name;
    }
    getS3UploadConfig() {
        const accessKey = process.env.DO_KEY_ID;
        const secretKey = process.env.DO_SECRET_KEY;
        if ((0, builder_util_1.isEmptyOrSpaces)(accessKey)) {
            throw new builder_util_1.InvalidConfigurationError("Please set env DO_KEY_ID (see https://www.electron.build/publish#spacesoptions)");
        }
        if ((0, builder_util_1.isEmptyOrSpaces)(secretKey)) {
            throw new builder_util_1.InvalidConfigurationError("Please set env DO_SECRET_KEY (see https://www.electron.build/publish#spacesoptions)");
        }
        return {
            region: this.info.region,
            endpoint: `https://${this.info.region}.digitaloceanspaces.com`,
            credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        };
    }
}
exports.SpacesPublisher = SpacesPublisher;
//# sourceMappingURL=spacesPublisher.js.map
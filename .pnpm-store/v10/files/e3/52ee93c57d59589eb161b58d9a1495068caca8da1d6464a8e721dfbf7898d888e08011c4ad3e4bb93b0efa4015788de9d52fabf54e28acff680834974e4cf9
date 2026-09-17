"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUrlProbablySupportMultiRangeRequests = isUrlProbablySupportMultiRangeRequests;
exports.createClient = createClient;
const builder_util_runtime_1 = require("builder-util-runtime");
const BitbucketProvider_1 = require("./providers/BitbucketProvider");
const GenericProvider_1 = require("./providers/GenericProvider");
const GitHubProvider_1 = require("./providers/GitHubProvider");
const GitLabProvider_1 = require("./providers/GitLabProvider");
const KeygenProvider_1 = require("./providers/KeygenProvider");
const PrivateGitHubProvider_1 = require("./providers/PrivateGitHubProvider");
function isUrlProbablySupportMultiRangeRequests(url) {
    return !url.includes("s3.amazonaws.com");
}
function createClient(data, updater, runtimeOptions) {
    // noinspection SuspiciousTypeOfGuard
    if (typeof data === "string") {
        throw (0, builder_util_runtime_1.newError)("Please pass PublishConfiguration object", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
    }
    const provider = data.provider;
    switch (provider) {
        case "github": {
            const githubOptions = data;
            const token = (githubOptions.private ? process.env["GH_TOKEN"] || process.env["GITHUB_TOKEN"] : null) || githubOptions.token;
            if (token == null) {
                return new GitHubProvider_1.GitHubProvider(githubOptions, updater, runtimeOptions);
            }
            else {
                return new PrivateGitHubProvider_1.PrivateGitHubProvider(githubOptions, updater, token, runtimeOptions);
            }
        }
        case "bitbucket":
            return new BitbucketProvider_1.BitbucketProvider(data, updater, runtimeOptions);
        case "gitlab":
            return new GitLabProvider_1.GitLabProvider(data, updater, runtimeOptions);
        case "keygen":
            return new KeygenProvider_1.KeygenProvider(data, updater, runtimeOptions);
        case "s3":
        case "spaces":
            return new GenericProvider_1.GenericProvider({
                provider: "generic",
                url: (0, builder_util_runtime_1.getS3LikeProviderBaseUrl)(data),
                channel: data.channel || null,
            }, updater, {
                ...runtimeOptions,
                // https://github.com/minio/minio/issues/5285#issuecomment-350428955
                isUseMultipleRangeRequest: false,
            });
        case "generic": {
            const options = data;
            return new GenericProvider_1.GenericProvider(options, updater, {
                ...runtimeOptions,
                isUseMultipleRangeRequest: options.useMultipleRangeRequest !== false && isUrlProbablySupportMultiRangeRequests(options.url),
            });
        }
        case "custom": {
            const options = data;
            const constructor = options.updateProvider;
            if (!constructor) {
                throw (0, builder_util_runtime_1.newError)("Custom provider not specified", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
            }
            return new constructor(options, updater, runtimeOptions);
        }
        default:
            throw (0, builder_util_runtime_1.newError)(`Unsupported provider: ${provider}`, "ERR_UPDATER_UNSUPPORTED_PROVIDER");
    }
}
//# sourceMappingURL=providerFactory.js.map
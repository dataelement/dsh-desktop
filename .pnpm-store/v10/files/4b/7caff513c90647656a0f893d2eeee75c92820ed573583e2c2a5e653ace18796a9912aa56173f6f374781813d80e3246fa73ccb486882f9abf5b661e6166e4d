"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateGitHubProvider = void 0;
const builder_util_runtime_1 = require("builder-util-runtime");
const js_yaml_1 = require("js-yaml");
const path = require("path");
const url_1 = require("url");
const util_1 = require("../util");
const GitHubProvider_1 = require("./GitHubProvider");
const Provider_1 = require("./Provider");
class PrivateGitHubProvider extends GitHubProvider_1.BaseGitHubProvider {
    constructor(options, updater, token, runtimeOptions) {
        super(options, "api.github.com", runtimeOptions);
        this.updater = updater;
        this.token = token;
    }
    createRequestOptions(url, headers) {
        const result = super.createRequestOptions(url, headers);
        result.redirect = "manual";
        return result;
    }
    async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const channelFile = (0, util_1.getChannelFilename)(this.getDefaultChannelName());
        const releaseInfo = await this.getLatestVersionInfo(cancellationToken);
        const asset = releaseInfo.assets.find(it => it.name === channelFile);
        if (asset == null) {
            // html_url must be always, but just to be sure
            throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the release ${releaseInfo.html_url || releaseInfo.name}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
        }
        const url = new url_1.URL(asset.url);
        let result;
        try {
            result = (0, js_yaml_1.load)((await this.httpRequest(url, this.configureHeaders("application/octet-stream"), cancellationToken)));
        }
        catch (e) {
            if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
                throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${url}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            throw e;
        }
        ;
        result.assets = releaseInfo.assets;
        return result;
    }
    get fileExtraDownloadHeaders() {
        return this.configureHeaders("application/octet-stream");
    }
    configureHeaders(accept) {
        return {
            accept,
            authorization: `token ${this.token}`,
        };
    }
    async getLatestVersionInfo(cancellationToken) {
        const allowPrerelease = this.updater.allowPrerelease;
        let basePath = this.basePath;
        if (!allowPrerelease) {
            basePath = `${basePath}/latest`;
        }
        const url = (0, util_1.newUrlFromBase)(basePath, this.baseUrl);
        try {
            const version = JSON.parse((await this.httpRequest(url, this.configureHeaders("application/vnd.github.v3+json"), cancellationToken)));
            // only `latest` can return a single ReleaseInfo. Otherwise, a list of ReleaseInfo is returned and we need to find the latest one ourselves
            if (allowPrerelease) {
                const candidates = version.filter(it => !it.draft);
                return candidates.find(it => it.prerelease) || candidates[0];
            }
            else {
                return version;
            }
        }
        catch (e) {
            throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
    }
    get basePath() {
        return this.computeGithubBasePath(`/repos/${this.options.owner}/${this.options.repo}/releases`);
    }
    resolveFiles(updateInfo) {
        return (0, Provider_1.getFileList)(updateInfo).map(it => {
            const name = path.posix.basename(it.url).replace(/ /g, "-");
            const asset = updateInfo.assets.find(it => it != null && it.name === name);
            if (asset == null) {
                throw (0, builder_util_runtime_1.newError)(`Cannot find asset "${name}" in: ${JSON.stringify(updateInfo.assets, null, 2)}`, "ERR_UPDATER_ASSET_NOT_FOUND");
            }
            return {
                url: new url_1.URL(asset.url),
                info: it,
            };
        });
    }
}
exports.PrivateGitHubProvider = PrivateGitHubProvider;
//# sourceMappingURL=PrivateGitHubProvider.js.map
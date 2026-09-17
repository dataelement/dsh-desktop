"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitLabProvider = void 0;
const builder_util_runtime_1 = require("builder-util-runtime");
const url_1 = require("url");
// @ts-ignore
const escapeRegExp = require("lodash.escaperegexp");
const util_1 = require("../util");
const Provider_1 = require("./Provider");
class GitLabProvider extends Provider_1.Provider {
    /**
     * Normalizes filenames by replacing spaces and underscores with dashes.
     *
     * This is a workaround to handle filename formatting differences between tools:
     * - electron-builder formats filenames like "test file.txt" as "test-file.txt"
     * - GitLab may provide asset URLs using underscores, such as "test_file.txt"
     *
     * Because of this mismatch, we can't reliably extract the correct filename from
     * the asset path without normalization. This function ensures consistent matching
     * across different filename formats by converting all spaces and underscores to dashes.
     *
     * @param filename The filename to normalize
     * @returns The normalized filename with spaces and underscores replaced by dashes
     */
    normalizeFilename(filename) {
        return filename.replace(/ |_/g, "-");
    }
    constructor(options, updater, runtimeOptions) {
        super({
            ...runtimeOptions,
            // GitLab might not support multiple range requests efficiently
            isUseMultipleRangeRequest: false,
        });
        this.options = options;
        this.updater = updater;
        // Cache the latest version info to avoid unnecessary HTTP requests
        this.cachedLatestVersion = null;
        const defaultHost = "gitlab.com";
        const host = options.host || defaultHost;
        this.baseApiUrl = (0, util_1.newBaseUrl)(`https://${host}/api/v4`);
    }
    createRequestOptions(url, headers) {
        const result = super.createRequestOptions(url, headers);
        result.redirect = "manual";
        return result;
    }
    get channel() {
        const result = this.updater.channel || this.options.channel;
        return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
    }
    async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        // Get latest release from GitLab API using the permalink/latest endpoint
        const latestReleaseUrl = (0, util_1.newUrlFromBase)(`projects/${this.options.projectId}/releases/permalink/latest`, this.baseApiUrl);
        const header = { Accept: "application/json", ...this.setAuthHeaderForToken(this.options.token || null) };
        let releaseResponse;
        try {
            releaseResponse = await this.httpRequest(latestReleaseUrl, header, cancellationToken);
        }
        catch (e) {
            throw (0, builder_util_runtime_1.newError)(`Unable to find latest release on GitLab (${latestReleaseUrl}): ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
        if (!releaseResponse) {
            throw (0, builder_util_runtime_1.newError)("No published releases on GitLab", "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
        }
        let latestRelease;
        try {
            latestRelease = JSON.parse(releaseResponse);
        }
        catch (e) {
            throw (0, builder_util_runtime_1.newError)(`Unable to parse latest release response from GitLab (${latestReleaseUrl}): response was not valid JSON: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
        if (latestRelease.upcoming_release) {
            throw (0, builder_util_runtime_1.newError)("Latest GitLab release is scheduled but not yet published", "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
        const tag = latestRelease.tag_name;
        // Look for channel file in release assets
        let rawData = null;
        let channelFile = "";
        let channelFileUrl = null;
        const fetchChannelData = async (channelName) => {
            channelFile = (0, util_1.getChannelFilename)(channelName);
            // Find the channel file in GitLab release assets
            const channelAsset = latestRelease.assets.links.find(asset => asset.name === channelFile);
            if (!channelAsset) {
                throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release assets`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            channelFileUrl = new url_1.URL(channelAsset.direct_asset_url);
            const authHeaders = this.setAuthHeaderForToken(this.options.token || null);
            const headers = Object.keys(authHeaders).length ? authHeaders : undefined;
            try {
                const result = await this.httpRequest(channelFileUrl, headers, cancellationToken);
                if (!result) {
                    throw (0, builder_util_runtime_1.newError)(`Empty response from ${channelFileUrl}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
                }
                return result;
            }
            catch (e) {
                if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
                    throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
                }
                throw e;
            }
        };
        try {
            rawData = await fetchChannelData(this.channel);
        }
        catch (e) {
            // If custom channel fails, try default channel as fallback
            if (this.channel !== this.getDefaultChannelName()) {
                rawData = await fetchChannelData(this.getDefaultChannelName());
            }
            else {
                throw e;
            }
        }
        if (!rawData) {
            throw (0, builder_util_runtime_1.newError)(`Unable to parse channel data from ${channelFile}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
        }
        const result = (0, Provider_1.parseUpdateInfo)(rawData, channelFile, channelFileUrl);
        // Set release name from GitLab if not present
        if (result.releaseName == null) {
            result.releaseName = latestRelease.name;
        }
        // Set release notes from GitLab description if not present
        if (result.releaseNotes == null) {
            result.releaseNotes = latestRelease.description || null;
        }
        const gitlabUpdateInfo = {
            tag: tag,
            assets: this.convertAssetsToMap(latestRelease.assets),
            ...result,
        };
        // Cache the latest version info
        this.cachedLatestVersion = gitlabUpdateInfo;
        return gitlabUpdateInfo;
    }
    /**
     * Utility function to convert GitlabReleaseAsset to Map<string, string>
     * Maps asset names to their download URLs
     */
    convertAssetsToMap(assets) {
        const assetsMap = new Map();
        for (const asset of assets.links) {
            assetsMap.set(this.normalizeFilename(asset.name), asset.direct_asset_url);
        }
        return assetsMap;
    }
    /**
     * Find blockmap file URL in assets map for a specific filename
     */
    findBlockMapInAssets(assets, filename) {
        const possibleBlockMapNames = [`${filename}.blockmap`, `${this.normalizeFilename(filename)}.blockmap`];
        for (const blockMapName of possibleBlockMapNames) {
            const assetUrl = assets.get(blockMapName);
            if (assetUrl) {
                return new url_1.URL(assetUrl);
            }
        }
        return null;
    }
    async fetchReleaseInfoByVersion(version) {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        // Try v-prefixed version first, then fallback to plain version
        const possibleReleaseIds = [`v${version}`, version];
        for (const releaseId of possibleReleaseIds) {
            const releaseUrl = (0, util_1.newUrlFromBase)(`projects/${this.options.projectId}/releases/${encodeURIComponent(releaseId)}`, this.baseApiUrl);
            try {
                const header = { Accept: "application/json", ...this.setAuthHeaderForToken(this.options.token || null) };
                const releaseResponse = await this.httpRequest(releaseUrl, header, cancellationToken);
                if (releaseResponse) {
                    const release = JSON.parse(releaseResponse);
                    return release;
                }
            }
            catch (e) {
                // If it's a 404 error, try the next release ID format
                if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
                    continue;
                }
                // For other errors, throw immediately
                throw (0, builder_util_runtime_1.newError)(`Unable to find release ${releaseId} on GitLab (${releaseUrl}): ${e.stack || e.message}`, "ERR_UPDATER_RELEASE_NOT_FOUND");
            }
        }
        // If we get here, none of the release ID formats worked
        throw (0, builder_util_runtime_1.newError)(`Unable to find release with version ${version} (tried: ${possibleReleaseIds.join(", ")}) on GitLab`, "ERR_UPDATER_RELEASE_NOT_FOUND");
    }
    setAuthHeaderForToken(token) {
        const headers = {};
        if (token != null) {
            // If the token starts with "Bearer", it is an OAuth application secret
            // Note that the original gitlab token would not start with "Bearer"
            // it might start with "gloas-", if so user needs to add "Bearer " prefix to the token
            if (token.startsWith("Bearer")) {
                headers.authorization = token;
            }
            else {
                headers["PRIVATE-TOKEN"] = token;
            }
        }
        return headers;
    }
    /**
     * Get version info for blockmap files, using cache when possible
     */
    async getVersionInfoForBlockMap(version) {
        // Check if we can use cached version info
        if (this.cachedLatestVersion && this.cachedLatestVersion.version === version) {
            return this.cachedLatestVersion.assets;
        }
        // Fetch version info if not cached or version doesn't match
        const versionInfo = await this.fetchReleaseInfoByVersion(version);
        if (versionInfo && versionInfo.assets) {
            return this.convertAssetsToMap(versionInfo.assets);
        }
        return null;
    }
    /**
     * Find blockmap URLs from version assets
     */
    async findBlockMapUrlsFromAssets(oldVersion, newVersion, baseFilename) {
        let newBlockMapUrl = null;
        let oldBlockMapUrl = null;
        // Get new version assets
        const newVersionAssets = await this.getVersionInfoForBlockMap(newVersion);
        if (newVersionAssets) {
            newBlockMapUrl = this.findBlockMapInAssets(newVersionAssets, baseFilename);
        }
        // Get old version assets
        const oldVersionAssets = await this.getVersionInfoForBlockMap(oldVersion);
        if (oldVersionAssets) {
            const oldFilename = baseFilename.replace(new RegExp(escapeRegExp(newVersion), "g"), oldVersion);
            oldBlockMapUrl = this.findBlockMapInAssets(oldVersionAssets, oldFilename);
        }
        return [oldBlockMapUrl, newBlockMapUrl];
    }
    async getBlockMapFiles(baseUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl = null) {
        // If is `project_upload`, find blockmap files from corresponding gitLab assets
        // Because each asset has an unique path that includes an identified hash code,
        // e.g. https://gitlab.com/-/project/71361100/uploads/051f27a925eaf679f2ad688105362acc/latest.yml
        if (this.options.uploadTarget === "project_upload") {
            // Get the base filename from the URL to find corresponding blockmap files
            const baseFilename = baseUrl.pathname.split("/").pop() || "";
            // Try to find blockmap files in GitLab assets
            const [oldBlockMapUrl, newBlockMapUrl] = await this.findBlockMapUrlsFromAssets(oldVersion, newVersion, baseFilename);
            if (!newBlockMapUrl) {
                throw (0, builder_util_runtime_1.newError)(`Cannot find blockmap file for ${newVersion} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
            }
            if (!oldBlockMapUrl) {
                throw (0, builder_util_runtime_1.newError)(`Cannot find blockmap file for ${oldVersion} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
            }
            return [oldBlockMapUrl, newBlockMapUrl];
        }
        else {
            return super.getBlockMapFiles(baseUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl);
        }
    }
    resolveFiles(updateInfo) {
        return (0, Provider_1.getFileList)(updateInfo).map((fileInfo) => {
            // Try both original and normalized filename formats
            const possibleNames = [
                fileInfo.url, // Original filename
                this.normalizeFilename(fileInfo.url), // Normalized filename (spaces/underscores → dashes)
            ];
            const matchingAssetName = possibleNames.find(name => updateInfo.assets.has(name));
            const assetUrl = matchingAssetName ? updateInfo.assets.get(matchingAssetName) : undefined;
            if (!assetUrl) {
                throw (0, builder_util_runtime_1.newError)(`Cannot find asset "${fileInfo.url}" in GitLab release assets. Available assets: ${Array.from(updateInfo.assets.keys()).join(", ")}`, "ERR_UPDATER_ASSET_NOT_FOUND");
            }
            return {
                url: new url_1.URL(assetUrl),
                info: fileInfo,
            };
        });
    }
    toString() {
        return `GitLab (projectId: ${this.options.projectId}, channel: ${this.channel})`;
    }
}
exports.GitLabProvider = GitLabProvider;
//# sourceMappingURL=GitLabProvider.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubProvider = exports.BaseGitHubProvider = void 0;
exports.computeReleaseNotes = computeReleaseNotes;
const builder_util_runtime_1 = require("builder-util-runtime");
const semver = require("semver");
const url_1 = require("url");
const util_1 = require("../util");
const Provider_1 = require("./Provider");
const hrefRegExp = /\/tag\/(v?[^/]+)$/;
class BaseGitHubProvider extends Provider_1.Provider {
    constructor(options, defaultHost, runtimeOptions) {
        super({
            ...runtimeOptions,
            /* because GitHib uses S3 */
            isUseMultipleRangeRequest: false,
        });
        this.options = options;
        this.baseUrl = (0, util_1.newBaseUrl)((0, builder_util_runtime_1.githubUrl)(options, defaultHost));
        const apiHost = defaultHost === "github.com" ? "api.github.com" : defaultHost;
        this.baseApiUrl = (0, util_1.newBaseUrl)((0, builder_util_runtime_1.githubUrl)(options, apiHost));
    }
    computeGithubBasePath(result) {
        // https://github.com/electron-userland/electron-builder/issues/1903#issuecomment-320881211
        const host = this.options.host;
        return host && !["github.com", "api.github.com"].includes(host) ? `/api/v3${result}` : result;
    }
}
exports.BaseGitHubProvider = BaseGitHubProvider;
class GitHubProvider extends BaseGitHubProvider {
    constructor(options, updater, runtimeOptions) {
        super(options, "github.com", runtimeOptions);
        this.options = options;
        this.updater = updater;
    }
    get channel() {
        const result = this.updater.channel || this.options.channel;
        return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
    }
    async getLatestVersion() {
        var _a, _b, _c, _d, _e;
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const feedXml = (await this.httpRequest((0, util_1.newUrlFromBase)(`${this.basePath}.atom`, this.baseUrl), {
            accept: "application/xml, application/atom+xml, text/xml, */*",
        }, cancellationToken));
        const feed = (0, builder_util_runtime_1.parseXml)(feedXml);
        // noinspection TypeScriptValidateJSTypes
        let latestRelease = feed.element("entry", false, `No published versions on GitHub`);
        let tag = null;
        try {
            if (this.updater.allowPrerelease) {
                const currentChannel = ((_a = this.updater) === null || _a === void 0 ? void 0 : _a.channel) || ((_b = semver.prerelease(this.updater.currentVersion)) === null || _b === void 0 ? void 0 : _b[0]) || null;
                if (currentChannel === null) {
                    // allowPrerelease=true with no explicit channel and stable current version:
                    // pick the first entry from the Atom feed, which may be a prerelease
                    // noinspection TypeScriptValidateJSTypes
                    tag = hrefRegExp.exec(latestRelease.element("link").attribute("href"))[1];
                }
                else {
                    for (const element of feed.getElements("entry")) {
                        // noinspection TypeScriptValidateJSTypes
                        const hrefElement = hrefRegExp.exec(element.element("link").attribute("href"));
                        // If this is null then something is wrong and skip this release
                        if (hrefElement === null) {
                            continue;
                        }
                        // This Release's Tag
                        const hrefTag = hrefElement[1];
                        if (!semver.valid(hrefTag)) {
                            continue;
                        }
                        //Get Channel from this release's tag
                        const hrefChannel = ((_c = semver.prerelease(hrefTag)) === null || _c === void 0 ? void 0 : _c[0]) || null;
                        const shouldFetchVersion = !currentChannel || ["alpha", "beta"].includes(currentChannel);
                        const isCustomChannel = hrefChannel !== null && !["alpha", "beta"].includes(String(hrefChannel));
                        // Allow moving from alpha to beta but not down
                        const channelMismatch = currentChannel === "beta" && hrefChannel === "alpha";
                        if (shouldFetchVersion && !isCustomChannel && !channelMismatch) {
                            tag = hrefTag;
                            latestRelease = element;
                            break;
                        }
                        const isNextPreRelease = hrefChannel && hrefChannel === currentChannel;
                        if (isNextPreRelease) {
                            tag = hrefTag;
                            latestRelease = element;
                            break;
                        }
                    }
                }
            }
            else {
                tag = await this.getLatestTagName(cancellationToken);
                for (const element of feed.getElements("entry")) {
                    // noinspection TypeScriptValidateJSTypes
                    const hrefMatch = hrefRegExp.exec(element.element("link").attribute("href"));
                    if (hrefMatch == null) {
                        continue;
                    }
                    if (hrefMatch[1] === tag) {
                        latestRelease = element;
                        break;
                    }
                }
            }
        }
        catch (e) {
            throw (0, builder_util_runtime_1.newError)(`Cannot parse releases feed: ${e.stack || e.message},\nXML:\n${feedXml}`, "ERR_UPDATER_INVALID_RELEASE_FEED");
        }
        if (tag == null) {
            throw (0, builder_util_runtime_1.newError)(`No published versions on GitHub`, "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
        }
        let rawData;
        let channelFile = "";
        let channelFileUrl = "";
        const fetchData = async (channelName) => {
            channelFile = (0, util_1.getChannelFilename)(channelName);
            channelFileUrl = (0, util_1.newUrlFromBase)(this.getBaseDownloadPath(String(tag), channelFile), this.baseUrl);
            const requestOptions = this.createRequestOptions(channelFileUrl);
            try {
                return (await this.executor.request(requestOptions, cancellationToken));
            }
            catch (e) {
                if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
                    throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
                }
                throw e;
            }
        };
        try {
            let channel = this.channel;
            if (this.updater.allowPrerelease && ((_d = semver.prerelease(tag)) === null || _d === void 0 ? void 0 : _d[0])) {
                channel = this.getCustomChannelName(String((_e = semver.prerelease(tag)) === null || _e === void 0 ? void 0 : _e[0]));
            }
            rawData = await fetchData(channel);
        }
        catch (e) {
            if (this.updater.allowPrerelease) {
                // Allow fallback to `latest.yml`
                rawData = await fetchData(this.getDefaultChannelName());
            }
            else {
                throw e;
            }
        }
        const result = (0, Provider_1.parseUpdateInfo)(rawData, channelFile, channelFileUrl);
        if (result.releaseName == null) {
            result.releaseName = latestRelease.elementValueOrEmpty("title");
        }
        if (result.releaseNotes == null) {
            result.releaseNotes = computeReleaseNotes(this.updater.currentVersion, this.updater.fullChangelog, feed, latestRelease);
        }
        return {
            tag: tag,
            ...result,
        };
    }
    async getLatestTagName(cancellationToken) {
        const options = this.options;
        // do not use API for GitHub to avoid limit, only for custom host or GitHub Enterprise
        const url = options.host == null || options.host === "github.com"
            ? (0, util_1.newUrlFromBase)(`${this.basePath}/latest`, this.baseUrl)
            : new url_1.URL(`${this.computeGithubBasePath(`/repos/${options.owner}/${options.repo}/releases`)}/latest`, this.baseApiUrl);
        try {
            const rawData = await this.httpRequest(url, { Accept: "application/json" }, cancellationToken);
            if (rawData == null) {
                return null;
            }
            const releaseInfo = JSON.parse(rawData);
            return releaseInfo.tag_name;
        }
        catch (e) {
            throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
    }
    get basePath() {
        return `/${this.options.owner}/${this.options.repo}/releases`;
    }
    resolveFiles(updateInfo) {
        // still replace space to - due to backward compatibility
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl, p => this.getBaseDownloadPath(updateInfo.tag, p.replace(/ /g, "-")));
    }
    getBaseDownloadPath(tag, fileName) {
        return `${this.basePath}/download/${tag}/${fileName}`;
    }
}
exports.GitHubProvider = GitHubProvider;
function getNoteValue(parent) {
    const result = parent.elementValueOrEmpty("content");
    // GitHub reports empty notes as <content>No content.</content>
    return result === "No content." ? "" : result;
}
function computeReleaseNotes(currentVersion, isFullChangelog, feed, latestRelease) {
    if (!isFullChangelog) {
        return getNoteValue(latestRelease);
    }
    const releaseVersionRegExp = /\/tag\/v?([^/]+)$/;
    let latestVersion = undefined;
    try {
        latestVersion = releaseVersionRegExp.exec(latestRelease.element("link").attribute("href"))[1];
        latestVersion = semver.valid(latestVersion) ? latestVersion : undefined;
    }
    catch {
        // If we cannot parse the latest release version, return null — notes cannot be determined
    }
    if (latestVersion == null) {
        return null;
    }
    const releaseNotes = [];
    for (const release of feed.getElements("entry")) {
        let versionRelease;
        try {
            const match = releaseVersionRegExp.exec(release.element("link").attribute("href"));
            if (!match) {
                continue;
            }
            versionRelease = match[1];
        }
        catch {
            continue;
        }
        // skip non-semver tags (e.g. doc/website releases in monorepos)
        if (!semver.valid(versionRelease)) {
            continue;
        }
        const isGreaterThanCurrent = semver.gt(versionRelease, currentVersion.raw);
        const isLessOrEqualThanLatest = semver.lte(versionRelease, latestVersion);
        if (isGreaterThanCurrent && isLessOrEqualThanLatest) {
            releaseNotes.push({
                version: versionRelease,
                note: getNoteValue(release),
            });
        }
    }
    return releaseNotes.sort((a, b) => semver.rcompare(a.version, b.version));
}
//# sourceMappingURL=GitHubProvider.js.map
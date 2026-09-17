"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Provider = void 0;
exports.findFile = findFile;
exports.parseUpdateInfo = parseUpdateInfo;
exports.getFileList = getFileList;
exports.resolveFiles = resolveFiles;
const builder_util_runtime_1 = require("builder-util-runtime");
const js_yaml_1 = require("js-yaml");
const url_1 = require("url");
const util_1 = require("../util");
// @ts-ignore
const escapeRegExp = require("lodash.escaperegexp");
class Provider {
    constructor(runtimeOptions) {
        this.runtimeOptions = runtimeOptions;
        this.requestHeaders = null;
        this.executor = runtimeOptions.executor;
    }
    // By default, the blockmap file is in the same directory as the main file
    // But some providers may have a different blockmap file, so we need to override this method
    getBlockMapFiles(baseUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl = null) {
        const newBlockMapUrl = (0, util_1.newUrlFromBase)(`${baseUrl.pathname}.blockmap`, baseUrl);
        const oldBlockMapUrl = (0, util_1.newUrlFromBase)(`${baseUrl.pathname.replace(new RegExp(escapeRegExp(newVersion), "g"), oldVersion)}.blockmap`, oldBlockMapFileBaseUrl ? new url_1.URL(oldBlockMapFileBaseUrl) : baseUrl);
        return [oldBlockMapUrl, newBlockMapUrl];
    }
    get isUseMultipleRangeRequest() {
        return this.runtimeOptions.isUseMultipleRangeRequest !== false;
    }
    getChannelFilePrefix() {
        if (this.runtimeOptions.platform === "linux") {
            const arch = process.env["TEST_UPDATER_ARCH"] || process.arch;
            const archSuffix = arch === "x64" ? "" : `-${arch}`;
            return "-linux" + archSuffix;
        }
        else {
            return this.runtimeOptions.platform === "darwin" ? "-mac" : "";
        }
    }
    // due to historical reasons for windows we use channel name without platform specifier
    getDefaultChannelName() {
        return this.getCustomChannelName("latest");
    }
    getCustomChannelName(channel) {
        return `${channel}${this.getChannelFilePrefix()}`;
    }
    get fileExtraDownloadHeaders() {
        return null;
    }
    setRequestHeaders(value) {
        this.requestHeaders = value;
    }
    /**
     * Method to perform API request only to resolve update info, but not to download update.
     */
    httpRequest(url, headers, cancellationToken) {
        return this.executor.request(this.createRequestOptions(url, headers), cancellationToken);
    }
    createRequestOptions(url, headers) {
        const result = {};
        if (this.requestHeaders == null) {
            if (headers != null) {
                result.headers = headers;
            }
        }
        else {
            result.headers = headers == null ? this.requestHeaders : { ...this.requestHeaders, ...headers };
        }
        (0, builder_util_runtime_1.configureRequestUrl)(url, result);
        return result;
    }
}
exports.Provider = Provider;
function findFile(files, extension, not) {
    var _a;
    if (files.length === 0) {
        throw (0, builder_util_runtime_1.newError)("No files provided", "ERR_UPDATER_NO_FILES_PROVIDED");
    }
    const filteredFiles = files.filter(it => it.url.pathname.toLowerCase().endsWith(`.${extension.toLowerCase()}`));
    const result = (_a = filteredFiles.find(it => [it.url.pathname, it.info.url].some(n => n.includes(process.arch)))) !== null && _a !== void 0 ? _a : filteredFiles.shift();
    if (result) {
        return result;
    }
    else if (not == null) {
        return files[0];
    }
    else {
        return files.find(fileInfo => !not.some(ext => fileInfo.url.pathname.toLowerCase().endsWith(`.${ext.toLowerCase()}`)));
    }
}
function parseUpdateInfo(rawData, channelFile, channelFileUrl) {
    if (rawData == null) {
        throw (0, builder_util_runtime_1.newError)(`Cannot parse update info from ${channelFile} in the latest release artifacts (${channelFileUrl}): rawData: null`, "ERR_UPDATER_INVALID_UPDATE_INFO");
    }
    let result;
    try {
        result = (0, js_yaml_1.load)(rawData);
    }
    catch (e) {
        throw (0, builder_util_runtime_1.newError)(`Cannot parse update info from ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}, rawData: ${rawData}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
    }
    return result;
}
function getFileList(updateInfo) {
    const files = updateInfo.files;
    if (files != null && files.length > 0) {
        return files;
    }
    // noinspection JSDeprecatedSymbols
    if (updateInfo.path != null) {
        // noinspection JSDeprecatedSymbols
        return [
            {
                url: updateInfo.path,
                sha2: updateInfo.sha2,
                sha512: updateInfo.sha512,
            },
        ];
    }
    else {
        throw (0, builder_util_runtime_1.newError)(`No files provided: ${(0, builder_util_runtime_1.safeStringifyJson)(updateInfo)}`, "ERR_UPDATER_NO_FILES_PROVIDED");
    }
}
function resolveFiles(updateInfo, baseUrl, pathTransformer = (p) => p) {
    const files = getFileList(updateInfo);
    const result = files.map(fileInfo => {
        if (fileInfo.sha2 == null && fileInfo.sha512 == null) {
            throw (0, builder_util_runtime_1.newError)(`Update info doesn't contain nor sha256 neither sha512 checksum: ${(0, builder_util_runtime_1.safeStringifyJson)(fileInfo)}`, "ERR_UPDATER_NO_CHECKSUM");
        }
        return {
            url: (0, util_1.newUrlFromBase)(pathTransformer(fileInfo.url), baseUrl),
            info: fileInfo,
        };
    });
    const packages = updateInfo.packages;
    const packageInfo = packages == null ? null : packages[process.arch] || packages.ia32;
    if (packageInfo != null) {
        ;
        result[0].packageInfo = {
            ...packageInfo,
            path: (0, util_1.newUrlFromBase)(pathTransformer(packageInfo.path), baseUrl).href,
        };
    }
    return result;
}
//# sourceMappingURL=Provider.js.map
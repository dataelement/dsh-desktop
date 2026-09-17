"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppInfo = void 0;
exports.smarten = smarten;
exports.filterCFBundleIdentifier = filterCFBundleIdentifier;
const builder_util_1 = require("builder-util");
const filename_1 = require("builder-util/out/filename");
const semver_1 = require("semver");
const macroExpander_1 = require("./util/macroExpander");
// fpm bug - rpm build --description is not escaped, well... decided to replace quite to smart quote
// http://leancrew.com/all-this/2010/11/smart-quotes-in-javascript/
function smarten(s) {
    // opening singles
    s = s.replace(/(^|[-\u2014\s(["])'/g, "$1\u2018");
    // closing singles & apostrophes
    s = s.replace(/'/g, "\u2019");
    // opening doubles
    s = s.replace(/(^|[-\u2014/[(\u2018\s])"/g, "$1\u201c");
    // closing doubles
    s = s.replace(/"/g, "\u201d");
    return s;
}
class AppInfo {
    constructor(info, buildVersion, platformSpecificOptions = null, normalizeNfd = false) {
        var _a;
        this.info = info;
        this.platformSpecificOptions = platformSpecificOptions;
        this.description = smarten(this.info.metadata.description || "");
        this.version = info.metadata.version;
        this.type = info.metadata.type;
        if (buildVersion == null) {
            buildVersion = info.config.buildVersion;
        }
        const buildNumberEnvs = process.env.BUILD_NUMBER ||
            process.env.TRAVIS_BUILD_NUMBER ||
            process.env.APPVEYOR_BUILD_NUMBER ||
            process.env.CIRCLE_BUILD_NUM ||
            process.env.BUILD_BUILDNUMBER ||
            process.env.CI_PIPELINE_IID;
        this.buildNumber = info.config.buildNumber || buildNumberEnvs;
        if (buildVersion == null) {
            buildVersion = this.version;
            if (!(0, builder_util_1.isEmptyOrSpaces)(this.buildNumber)) {
                buildVersion += `.${this.buildNumber}`;
            }
        }
        this.buildVersion = buildVersion;
        if (info.metadata.shortVersion) {
            this.shortVersion = info.metadata.shortVersion;
        }
        if (info.metadata.shortVersionWindows) {
            this.shortVersionWindows = info.metadata.shortVersionWindows;
        }
        this.productName = info.config.productName || info.metadata.productName || info.metadata.name;
        this.sanitizedProductName = (0, filename_1.sanitizeFileName)(this.productName, normalizeNfd);
        const executableName = (_a = platformSpecificOptions === null || platformSpecificOptions === void 0 ? void 0 : platformSpecificOptions.executableName) !== null && _a !== void 0 ? _a : info.config.executableName;
        this.productFilename = executableName != null ? (0, filename_1.sanitizeFileName)(executableName, normalizeNfd) : this.sanitizedProductName;
    }
    get channel() {
        const prereleaseInfo = (0, semver_1.prerelease)(this.version);
        if (prereleaseInfo != null && prereleaseInfo.length > 0) {
            return prereleaseInfo[0];
        }
        return null;
    }
    getVersionInWeirdWindowsForm(isSetBuildNumber = true) {
        const [major, maybe_minor, maybe_patch] = this.version.split(".").map(versionPart => parseInt(versionPart));
        // The major component must be present. Here it can be either NaN or undefined, which
        // both returns true from isNaN.
        if (isNaN(major)) {
            throw new Error(`Invalid major number in: ${this.version}`);
        }
        // Allow missing version parts. Minor and patch can be left out and default to zero
        const minor = maybe_minor !== null && maybe_minor !== void 0 ? maybe_minor : 0;
        const patch = maybe_patch !== null && maybe_patch !== void 0 ? maybe_patch : 0;
        // ... but reject non-integer version parts. '1.a' is not going to fly
        if (isNaN(minor) || isNaN(patch)) {
            throw new Error(`Invalid minor or patch number in: ${this.version}`);
        }
        // https://github.com/electron-userland/electron-builder/issues/2635#issuecomment-371792272
        let buildNumber = isSetBuildNumber ? this.buildNumber : null;
        if (buildNumber == null || !/^\d+$/.test(buildNumber)) {
            buildNumber = "0";
        }
        return `${major}.${minor}.${patch}.${buildNumber}`;
    }
    get notNullDevMetadata() {
        return this.info.devMetadata || {};
    }
    get companyName() {
        const author = this.info.metadata.author || this.notNullDevMetadata.author;
        return author == null ? null : author.name;
    }
    get id() {
        let appId = null;
        for (const options of [this.platformSpecificOptions, this.info.config]) {
            if (options != null && appId == null) {
                appId = options.appId;
            }
        }
        const generateDefaultAppId = () => {
            const info = this.info;
            return `${info.framework.defaultAppIdPrefix}${info.metadata.name.toLowerCase()}`;
        };
        if (appId != null && (appId === "your.id" || (0, builder_util_1.isEmptyOrSpaces)(appId))) {
            const incorrectAppId = appId;
            appId = generateDefaultAppId();
            builder_util_1.log.warn(`do not use "${incorrectAppId}" as appId, "${appId}" will be used instead`);
        }
        return appId == null ? generateDefaultAppId() : appId;
    }
    get macBundleIdentifier() {
        return filterCFBundleIdentifier(this.id);
    }
    get name() {
        return this.info.metadata.name;
    }
    get linuxPackageName() {
        const name = this.name;
        // https://github.com/electron-userland/electron-builder/issues/2963
        return name.startsWith("@") ? this.sanitizedProductName : name;
    }
    get sanitizedName() {
        return (0, filename_1.sanitizeFileName)(this.name);
    }
    get updaterCacheDirName() {
        return this.sanitizedName.toLowerCase() + "-updater";
    }
    get copyright() {
        const copyright = this.info.config.copyright;
        if (copyright != null) {
            return (0, macroExpander_1.expandMacro)(copyright, null, this);
        }
        return `Copyright © ${new Date().getFullYear()} ${this.companyName || this.productName}`;
    }
    async computePackageUrl() {
        const url = this.info.metadata.homepage || this.notNullDevMetadata.homepage;
        if (url != null) {
            return url;
        }
        const info = await this.info.repositoryInfo;
        return info == null || info.type !== "github" ? null : `https://${info.domain}/${info.user}/${info.project}`;
    }
}
exports.AppInfo = AppInfo;
/** @internal */
function filterCFBundleIdentifier(identifier) {
    // Remove special characters and allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)
    // Apple documentation: https://developer.apple.com/library/mac/documentation/General/Reference/InfoPlistKeyReference/Articles/CoreFoundationKeys.html#//apple_ref/doc/uid/20001431-102070
    return identifier.replace(/ /g, "-").replace(/[^a-zA-Z0-9.-]/g, "");
}
//# sourceMappingURL=appInfo.js.map
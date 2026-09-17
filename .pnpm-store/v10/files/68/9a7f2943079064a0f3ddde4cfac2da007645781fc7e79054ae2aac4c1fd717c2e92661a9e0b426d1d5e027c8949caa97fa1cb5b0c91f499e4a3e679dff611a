"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMacOsHighSierra = isMacOsHighSierra;
exports.isMacOsSierra = isMacOsSierra;
exports.isMacOsCatalina = isMacOsCatalina;
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const lazy_val_1 = require("lazy-val");
const os_1 = require("os");
const semver = require("semver");
const macOsVersion = new lazy_val_1.Lazy(async () => {
    const file = await (0, fs_extra_1.readFile)("/System/Library/CoreServices/SystemVersion.plist", "utf8");
    const matches = /<key>ProductVersion<\/key>[\s\S]*<string>([\d.]+)<\/string>/.exec(file);
    if (!matches) {
        throw new Error("Couldn't find the macOS version");
    }
    builder_util_1.log.debug({ version: matches[1] }, "macOS version");
    return clean(matches[1]);
});
function clean(version) {
    return version.split(".").length === 2 ? `${version}.0` : version;
}
async function isOsVersionGreaterThanOrEqualTo(input) {
    return semver.gte(await macOsVersion.value, clean(input));
}
function isMacOsHighSierra() {
    // 17.7.0 === 10.13.6
    return process.platform === "darwin" && semver.gte((0, os_1.release)(), "17.7.0");
}
async function isMacOsSierra() {
    return process.platform === "darwin" && (await isOsVersionGreaterThanOrEqualTo("10.12.0"));
}
function isMacOsCatalina() {
    return process.platform === "darwin" && semver.gte((0, os_1.release)(), "19.0.0");
}
//# sourceMappingURL=macosVersion.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUseSystemSigncode = isUseSystemSigncode;
exports.isBuildCacheEnabled = isBuildCacheEnabled;
exports.isAutoDiscoveryCodeSignIdentity = isAutoDiscoveryCodeSignIdentity;
const builder_util_1 = require("builder-util");
function isUseSystemSigncode() {
    return (0, builder_util_1.isEnvTrue)(process.env.USE_SYSTEM_SIGNCODE);
}
function isBuildCacheEnabled() {
    return !(0, builder_util_1.isEnvTrue)(process.env.ELECTRON_BUILDER_DISABLE_BUILD_CACHE);
}
function isAutoDiscoveryCodeSignIdentity() {
    return process.env.CSC_IDENTITY_AUTO_DISCOVERY !== "false";
}
//# sourceMappingURL=flags.js.map
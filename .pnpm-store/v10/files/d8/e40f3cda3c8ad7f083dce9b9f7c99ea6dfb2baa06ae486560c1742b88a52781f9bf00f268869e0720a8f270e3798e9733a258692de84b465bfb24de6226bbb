export var errorUtil;
(function (errorUtil) {
    errorUtil.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    // biome-ignore lint/suspicious/noShadowRestrictedNames: renaming churns 31 v3 call sites
    errorUtil.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopShortcutCreationPolicy = void 0;
exports.getEffectiveOptions = getEffectiveOptions;
const builder_util_1 = require("builder-util");
const filename_1 = require("builder-util/out/filename");
function getEffectiveOptions(options, packager) {
    const appInfo = packager.appInfo;
    let menuCategory = null;
    if (options.menuCategory != null && options.menuCategory !== false) {
        if (options.menuCategory === true) {
            const companyName = packager.appInfo.companyName;
            if (companyName == null) {
                throw new builder_util_1.InvalidConfigurationError(`Please specify "author" in the application package.json — it is required because "menuCategory" is set to true.`);
            }
            menuCategory = (0, filename_1.sanitizeFileName)(companyName);
        }
        else {
            menuCategory = options.menuCategory
                .split(/[/\\]/)
                .map(it => (0, filename_1.sanitizeFileName)(it))
                .join("\\");
        }
    }
    return {
        isPerMachine: options.perMachine === true,
        isAssisted: options.oneClick === false,
        shortcutName: (0, builder_util_1.isEmptyOrSpaces)(options.shortcutName) ? appInfo.sanitizedProductName : packager.expandMacro(options.shortcutName),
        isCreateDesktopShortcut: convertToDesktopShortcutCreationPolicy(options.createDesktopShortcut),
        isCreateStartMenuShortcut: options.createStartMenuShortcut !== false,
        menuCategory,
    };
}
function convertToDesktopShortcutCreationPolicy(value) {
    if (value === false) {
        return DesktopShortcutCreationPolicy.NEVER;
    }
    else if (value === "always") {
        return DesktopShortcutCreationPolicy.ALWAYS;
    }
    else {
        return DesktopShortcutCreationPolicy.FRESH_INSTALL;
    }
}
var DesktopShortcutCreationPolicy;
(function (DesktopShortcutCreationPolicy) {
    DesktopShortcutCreationPolicy[DesktopShortcutCreationPolicy["FRESH_INSTALL"] = 0] = "FRESH_INSTALL";
    DesktopShortcutCreationPolicy[DesktopShortcutCreationPolicy["ALWAYS"] = 1] = "ALWAYS";
    DesktopShortcutCreationPolicy[DesktopShortcutCreationPolicy["NEVER"] = 2] = "NEVER";
})(DesktopShortcutCreationPolicy || (exports.DesktopShortcutCreationPolicy = DesktopShortcutCreationPolicy = {}));
//# sourceMappingURL=CommonWindowsInstallerConfiguration.js.map
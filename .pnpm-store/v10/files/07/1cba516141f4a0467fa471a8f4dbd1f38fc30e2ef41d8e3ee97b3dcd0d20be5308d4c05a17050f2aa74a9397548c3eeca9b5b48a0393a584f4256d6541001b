"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinuxTargetHelper = exports.installPrefix = void 0;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const fs_extra_1 = require("fs-extra");
const lazy_val_1 = require("lazy-val");
const path_1 = require("path");
const semver = require("semver");
const core24_1 = require("./snap/core24");
const coreCustom_1 = require("./snap/coreCustom");
const coreLegacy_1 = require("./snap/coreLegacy");
/**
 * Escape a string value for use in a freedesktop .desktop file string field
 * (Name, Comment, StartupWMClass, etc.).
 *
 * The freedesktop Desktop Entry Specification requires that the following
 * characters be escaped in string / localestring values:
 *   \n  →  \\n      (newline — would inject new key=value lines otherwise)
 *   \r  →  \\r
 *   \t  →  \\t
 *   \\  →  \\\\
 *
 * Without escaping, a productName or description containing a literal newline
 * can inject arbitrary key=value pairs into the generated .desktop file,
 * potentially overriding the Exec key.
 *
 * @see https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html#value-types
 */
function desktopStringEscape(value) {
    return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
}
/**
 * Characters that require an Exec argument to be double-quoted per the
 * freedesktop Desktop Entry Specification.  Plain alphanumeric args and
 * field codes must NOT be wrapped in quotes.
 *
 * @see https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html#exec-variables
 */
const EXEC_RESERVED_RE = /[\s"'`\\<>~|&;$*?#()]/;
/**
 * Quote a single argument for use in a .desktop file Exec key.
 *
 * Field codes (`%f`, `%u`, `%F`, `%U`, etc.) MUST be left unquoted — the
 * desktop launcher only expands them in unquoted token positions.  Wrapping
 * them in `"…"` causes the launcher to treat them as literal strings, which
 * breaks file-association / drag-and-drop functionality.
 *
 * For all other arguments, double-quoting is used when the argument contains
 * any character that would be misinterpreted by the launcher without quoting
 * (spaces, shell metacharacters, etc.).  Safe plain-word args are passed
 * through unchanged to keep the Exec line readable.
 *
 * @see https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html#exec-variables
 */
function desktopExecArgEscape(arg) {
    // Field codes (%f, %u, %F, %U, %i, %c, %k, …) must never be quoted.
    if (/^%[a-zA-Z]$/.test(arg)) {
        return arg;
    }
    // Only quote when the arg actually contains characters that need it.
    if (EXEC_RESERVED_RE.test(arg)) {
        return `"${arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return arg;
}
function mapLinuxCompressionToSnap(level) {
    if (level === "store") {
        return "lzo";
    }
    if (level === "maximum") {
        return "xz";
    }
    return undefined;
}
exports.installPrefix = "/opt";
class LinuxTargetHelper {
    constructor(packager) {
        this.packager = packager;
        this.iconPromise = new lazy_val_1.Lazy(() => this.computeDesktopIcons());
        this.mimeTypeFilesPromise = new lazy_val_1.Lazy(() => this.computeMimeTypeFiles());
        this.maxIconPath = null;
    }
    get icons() {
        return this.iconPromise.value;
    }
    get mimeTypeFiles() {
        return this.mimeTypeFilesPromise.value;
    }
    getSnapCore() {
        const { snapcraft, snap: legacySnap } = this.packager.config;
        if (snapcraft != null && legacySnap != null) {
            builder_util_1.log.warn("Both `snapcraft` and `snap` configurations are present. `snapcraft` takes precedence; please remove the `snap` key to silence this warning.");
        }
        // Merge linux-level options (category, description, mimeTypes, etc.) as the base so they
        // propagate into the generated snapcraft.yaml and .desktop file without requiring users to
        // duplicate them under core24/core18/etc. Per-core options always win for conflicts.
        // linux.compression is a CompressionLevel ("store"/"normal"/"maximum"); snap compression is an
        // algorithm ("xz"/"lzo"). Map the level to the nearest algorithm; per-core options override.
        const { compression: linuxCompression, ...linuxOptions } = this.packager.platformSpecificBuildOptions;
        const snapLinuxOptions = { ...linuxOptions, compression: mapLinuxCompressionToSnap(linuxCompression) };
        if (snapcraft != null) {
            const core = snapcraft.base;
            const options = snapcraft[core] || {};
            switch (core) {
                case "core18":
                case "core20":
                case "core22":
                    if (!this.isElectronVersionGreaterOrEqualThan("4.0.0")) {
                        if (!this.isElectronVersionGreaterOrEqualThan("2.0.0-beta.1")) {
                            throw new builder_util_1.InvalidConfigurationError("Electron 2 and higher is required to build Snap with core18/core20/core22");
                        }
                        builder_util_1.log.warn(null, "electron 4 and higher is highly recommended for Snap with core18/core20/core22");
                    }
                    return new coreLegacy_1.SnapCoreLegacy(this.packager, this, (0, builder_util_runtime_1.deepAssign)({}, snapLinuxOptions, { base: core, ...options }));
                case "core24":
                    if (!this.isElectronVersionGreaterOrEqualThan("28.0.0")) {
                        if (!this.isElectronVersionGreaterOrEqualThan("25.0.0")) {
                            throw new builder_util_1.InvalidConfigurationError("Electron 25 and higher is required to build Snap with core24");
                        }
                        builder_util_1.log.warn(null, "electron 28 and higher is highly recommended for Snap with core24");
                    }
                    return new core24_1.SnapCore24(this.packager, this, (0, builder_util_runtime_1.deepAssign)({}, snapLinuxOptions, options));
                case "custom":
                    // Pass-through: do not inject linux options into user-supplied yaml
                    return new coreCustom_1.SnapCoreCustom(this.packager, this, snapcraft.custom || {});
            }
        }
        if (legacySnap != null) {
            builder_util_1.log.warn({
                reason: "`snap` configuration is deprecated",
                docs: "https://www.electron.build/snapcraft",
            }, "please consider migrating `snap` configuration to `snapcraft.<core>` and remove `snap` configuration");
        }
        return new coreLegacy_1.SnapCoreLegacy(this.packager, this, (0, builder_util_runtime_1.deepAssign)({}, snapLinuxOptions, legacySnap !== null && legacySnap !== void 0 ? legacySnap : {}));
    }
    isElectronVersionGreaterOrEqualThan(version, fallback) {
        const electronVersion = this.packager.config.electronVersion;
        if (!electronVersion) {
            return fallback ? semver.gte(fallback, version) : true;
        }
        return semver.gte(electronVersion, version);
    }
    async computeMimeTypeFiles() {
        const items = [];
        for (const fileAssociation of this.packager.fileAssociations) {
            if (!fileAssociation.mimeType) {
                continue;
            }
            const data = `<mime-type type="${fileAssociation.mimeType}">
  <glob pattern="*.${fileAssociation.ext}"/>
    ${fileAssociation.description ? `<comment>${fileAssociation.description}</comment>` : ""}
  <icon name="x-office-document" />
</mime-type>`;
            items.push(data);
        }
        if (items.length === 0) {
            return null;
        }
        const file = await this.packager.getTempFile(".xml");
        await (0, fs_extra_1.outputFile)(file, '<?xml version="1.0" encoding="utf-8"?>\n<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">\n' + items.join("\n") + "\n</mime-info>");
        return file;
    }
    // must be name without spaces and other special characters, but not product name used
    async computeDesktopIcons() {
        var _a, _b, _c;
        const packager = this.packager;
        const { platformSpecificBuildOptions, config } = packager;
        const sources = [platformSpecificBuildOptions.icon, (_b = (_a = config.mac) === null || _a === void 0 ? void 0 : _a.icon) !== null && _b !== void 0 ? _b : config.icon].filter(str => !!str);
        // If no explicit sources are defined, fallback to buildResources directory, then default framework icon
        let fallbackSources = [...(0, builder_util_1.asArray)(packager.getDefaultFrameworkIcon())];
        const buildResources = (_c = config.directories) === null || _c === void 0 ? void 0 : _c.buildResources;
        if (buildResources && (await (0, builder_util_1.exists)((0, path_1.join)(buildResources, "icons")))) {
            fallbackSources = [buildResources, ...fallbackSources];
        }
        // need to put here and not as default because need to resolve image size
        const result = await packager.resolveIcon(sources, fallbackSources, "set");
        this.maxIconPath = result[result.length - 1].file;
        // Ignore .icon files for linux (they are exclusive for macOS)
        return result.filter(icon => !icon.file.endsWith(".icon"));
    }
    getDescription(options) {
        return options.description || this.packager.appInfo.description;
    }
    getSanitizedVersion(target) {
        const { appInfo: { version }, } = this.packager;
        switch (target) {
            case "pacman":
                return version.replace(/-/g, "_");
            case "rpm":
            case "deb":
                return version.replace(/-/g, "~");
            default:
                return version;
        }
    }
    async writeDesktopEntry(targetSpecificOptions, exec, destination, extra) {
        const data = await this.computeDesktopEntry(targetSpecificOptions, exec, extra);
        const file = destination || (await this.packager.getTempFile(`${this.packager.appInfo.productFilename}.desktop`));
        await (0, fs_extra_1.outputFile)(file, data);
        return file;
    }
    getDesktopFileName(fallback = this.packager.executableName) {
        var _a;
        if (!this.packager.platformSpecificBuildOptions.syncDesktopName) {
            return fallback;
        }
        const trimmedDesktopName = (_a = this.packager.info.metadata.desktopName) === null || _a === void 0 ? void 0 : _a.trim();
        if ((0, builder_util_1.isEmptyOrSpaces)(trimmedDesktopName)) {
            return fallback;
        }
        const basename = trimmedDesktopName.replace(/\.desktop$/, "");
        // Guard against path traversal: desktopName flows into filesystem paths
        // (snap/gui/<name>.desktop, /usr/share/applications/<name>.desktop, etc.).
        if (/[/\\]/.test(basename) || [...basename].some(c => c.charCodeAt(0) === 0)) {
            throw new builder_util_1.InvalidConfigurationError(`desktopName "${trimmedDesktopName}" produces an invalid .desktop filename — remove any path separators or NUL characters`);
        }
        return basename;
    }
    computeDesktopEntry(targetSpecificOptions, exec, extra) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (exec != null && exec.length === 0) {
            throw new Error("Specified exec is empty");
        }
        // https://github.com/electron-userland/electron-builder/issues/3418
        if ((_b = (_a = targetSpecificOptions.desktop) === null || _a === void 0 ? void 0 : _a.entry) === null || _b === void 0 ? void 0 : _b.Exec) {
            throw new Error("Please specify executable name as linux.executableName instead of linux.desktop.Exec");
        }
        const packager = this.packager;
        const appInfo = packager.appInfo;
        const executableArgs = targetSpecificOptions.executableArgs;
        if (exec == null) {
            exec = `${exports.installPrefix}/${appInfo.sanitizedProductName}/${packager.executableName}`;
            if (!/^[/0-9A-Za-z._-]+$/.test(exec)) {
                exec = `"${exec}"`;
            }
            if (executableArgs) {
                exec += " ";
                // Each arg is double-quoted per the freedesktop Exec key spec so that
                // spaces, $, ;, & and other reserved characters are not misinterpreted.
                exec += executableArgs.map(desktopExecArgEscape).join(" ");
            }
            // https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html#exec-variables
            const execCodes = ["%f", "%u", "%F", "%U"];
            if (executableArgs == null || executableArgs.findIndex(arg => execCodes.includes(arg)) === -1) {
                exec += " %U";
            }
        }
        // https://github.com/electron-userland/electron-builder/issues/9103
        // Electron derives app_id from desktopName in package.json; StartupWMClass must match.
        // https://github.com/electron/electron/blob/9a7b73b5334f1d72c08e2d5e94106706ed751186/lib/browser/init.ts#L128-L133
        const trimmedDesktopName = (_c = packager.info.metadata.desktopName) === null || _c === void 0 ? void 0 : _c.trim();
        if ((0, builder_util_1.isEmptyOrSpaces)(trimmedDesktopName)) {
            builder_util_1.log.warn({
                reason: "desktopName is not set in package.json",
                docs: "https://www.electron.build/linux#window-association-desktopname--syncdesktopname",
            }, "electron uses desktopName as app_id / WM_CLASS for window association. Without it desktop environments may not link running windows to this .desktop entry. Set desktopName in package.json and linux.syncDesktopName: true to fix.");
        }
        const wmClass = !(0, builder_util_1.isEmptyOrSpaces)(trimmedDesktopName) ? trimmedDesktopName.replace(/\.desktop$/, "") : appInfo.productName;
        const desktopMeta = (0, builder_util_runtime_1.deepAssign)({
            // String values are escaped per the freedesktop spec (\\, \n, \r, \t)
            // so that a product name containing a newline cannot inject new key=value
            // pairs into the .desktop file (e.g. overriding the Exec key).
            Name: desktopStringEscape(appInfo.productName),
            Exec: exec,
            Terminal: "false",
            Type: "Application",
            Icon: packager.executableName,
            // https://askubuntu.com/questions/367396/what-represent-the-startupwmclass-field-of-a-desktop-file
            // Set to desktopName (minus .desktop suffix) when provided, so it matches Electron's
            // app_id and desktop environments can associate running windows with this entry.
            // Falls back to productName for apps that don't set desktopName.
            // to get WM_CLASS of running window: xprop WM_CLASS
            // StartupWMClass doesn't work for unicode
            // https://github.com/electron/electron/blob/2-0-x/atom/browser/native_window_views.cc#L226
            StartupWMClass: desktopStringEscape(wmClass),
        }, extra, (_e = (_d = targetSpecificOptions.desktop) === null || _d === void 0 ? void 0 : _d.entry) !== null && _e !== void 0 ? _e : {});
        const description = this.getDescription(targetSpecificOptions);
        if (!(0, builder_util_1.isEmptyOrSpaces)(description)) {
            desktopMeta.Comment = desktopStringEscape(description);
        }
        const mimeTypes = (0, builder_util_1.asArray)(targetSpecificOptions.mimeTypes);
        for (const fileAssociation of packager.fileAssociations) {
            if (fileAssociation.mimeType != null) {
                mimeTypes.push(fileAssociation.mimeType);
            }
        }
        for (const protocol of (0, builder_util_1.asArray)(packager.config.protocols).concat((0, builder_util_1.asArray)(packager.platformSpecificBuildOptions.protocols))) {
            for (const scheme of (0, builder_util_1.asArray)(protocol.schemes)) {
                mimeTypes.push(`x-scheme-handler/${scheme}`);
            }
        }
        if (mimeTypes.length !== 0) {
            desktopMeta.MimeType = mimeTypes.join(";") + ";";
        }
        let category = targetSpecificOptions.category;
        if ((0, builder_util_1.isEmptyOrSpaces)(category)) {
            const macCategory = (packager.config.mac || {}).category;
            if (macCategory != null) {
                category = macToLinuxCategory[macCategory];
            }
            if (category == null) {
                // https://github.com/develar/onshape-desktop-shell/issues/48
                if (macCategory != null) {
                    builder_util_1.log.warn({ macCategory }, "cannot map macOS category to Linux. If possible mapping is known for you, please file issue to add it.");
                }
                builder_util_1.log.warn({
                    reason: "linux.category is not set and cannot map from macOS",
                    docs: "https://www.electron.build/linux",
                }, 'application Linux category is set to default "Utility"');
                category = "Utility";
            }
        }
        desktopMeta.Categories = `${category}${category.endsWith(";") ? "" : ";"}`;
        let data = `[Desktop Entry]`;
        for (const name of Object.keys(desktopMeta)) {
            data += `\n${name}=${desktopMeta[name]}`;
        }
        data += "\n";
        const desktopActions = (_g = (_f = targetSpecificOptions.desktop) === null || _f === void 0 ? void 0 : _f.desktopActions) !== null && _g !== void 0 ? _g : {};
        for (const [actionName, config] of Object.entries(desktopActions)) {
            if (!Object.keys(config !== null && config !== void 0 ? config : {}).length) {
                continue;
            }
            data += `\n[Desktop Action ${actionName}]`;
            for (const [key, value] of Object.entries(config !== null && config !== void 0 ? config : {})) {
                data += `\n${key}=${value}`;
            }
            data += "\n";
        }
        return Promise.resolve(data);
    }
}
exports.LinuxTargetHelper = LinuxTargetHelper;
const macToLinuxCategory = {
    "public.app-category.graphics-design": "Graphics",
    "public.app-category.developer-tools": "Development",
    "public.app-category.education": "Education",
    "public.app-category.games": "Game",
    "public.app-category.video": "Video;AudioVideo",
    "public.app-category.utilities": "Utility",
    "public.app-category.social-networking": "Network;Chat",
    "public.app-category.finance": "Office;Finance",
    "public.app-category.music": "Audio;AudioVideo",
};
//# sourceMappingURL=LinuxTargetHelper.js.map
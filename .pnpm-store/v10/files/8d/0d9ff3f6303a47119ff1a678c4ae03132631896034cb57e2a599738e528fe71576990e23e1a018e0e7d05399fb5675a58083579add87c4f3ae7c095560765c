"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPackageJson = readPackageJson;
exports.checkMetadata = checkMetadata;
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const semver = require("semver");
const normalizePackageData_1 = require("./normalizePackageData");
/** @internal */
async function readPackageJson(file) {
    const data = await (0, fs_extra_1.readJson)(file);
    await authors(file, data);
    // remove not required fields because can be used for remote build
    delete data.scripts;
    delete data.readme;
    (0, normalizePackageData_1.normalizePackageData)(data);
    return data;
}
async function authors(file, data) {
    if (data.contributors != null) {
        return;
    }
    let authorData;
    try {
        authorData = await (0, fs_extra_1.readFile)(path.resolve(path.dirname(file), "AUTHORS"), "utf8");
    }
    catch (_ignored) {
        return;
    }
    data.contributors = authorData.split(/\r?\n/g).map(it => it.replace(/^\s*#.*$/, "").trim());
}
/** @internal */
function checkMetadata(metadata, devMetadata, appPackageFile, devAppPackageFile) {
    const errors = [];
    const reportError = (missedFieldName) => {
        errors.push(`Please specify '${missedFieldName}' in the package.json (${appPackageFile})`);
    };
    const checkNotEmpty = (name, value) => {
        if ((0, builder_util_1.isEmptyOrSpaces)(value)) {
            reportError(name);
        }
    };
    if (metadata.directories != null) {
        errors.push(`"directories" in the root is deprecated, please specify in the "build"`);
    }
    checkNotEmpty("name", metadata.name);
    if ((0, builder_util_1.isEmptyOrSpaces)(metadata.description)) {
        builder_util_1.log.warn({ appPackageFile }, `description is missed in the package.json`);
    }
    if (metadata.author == null) {
        builder_util_1.log.warn({ appPackageFile }, `author is missed in the package.json`);
    }
    checkNotEmpty("version", metadata.version);
    checkDependencies(metadata.dependencies, errors);
    if (metadata !== devMetadata) {
        if (metadata.build != null) {
            errors.push(`'build' in the application package.json (${appPackageFile}) is not supported since 3.0 anymore. Please move 'build' into the development package.json (${devAppPackageFile})`);
        }
    }
    const devDependencies = metadata.devDependencies;
    if (devDependencies != null && ("electron-rebuild" in devDependencies || "@electron/rebuild" in devDependencies)) {
        builder_util_1.log.info('@electron/rebuild already used by electron-builder, please consider to remove excess dependency from devDependencies\n\nTo ensure your native dependencies are always matched electron version, simply add script `"postinstall": "electron-builder install-app-deps" to your `package.json`');
    }
    if (errors.length > 0) {
        throw new builder_util_1.InvalidConfigurationError(errors.join("\n"));
    }
}
function versionSatisfies(version, range, loose) {
    if (version == null) {
        return false;
    }
    const coerced = semver.coerce(version);
    if (coerced == null) {
        return false;
    }
    return semver.satisfies(coerced, range, loose);
}
function checkDependencies(dependencies, errors) {
    if (dependencies == null) {
        return;
    }
    let updaterVersion = dependencies["electron-updater"];
    if (updaterVersion != null) {
        // Pick the version out of yarn berry patch syntax
        // "patch:electron-updater@npm%3A6.4.1#~/.yarn/patches/electron-updater-npm-6.4.1-ef33e6cc39.patch"
        if (updaterVersion.startsWith("patch:")) {
            // codeql[js/polynomial-redos] - [^#]+ is a possessive character-class match; linear time, no catastrophic backtracking
            const match = updaterVersion.match(/@npm%3A([^#]+)#/);
            if (match) {
                updaterVersion = match[1];
            }
        }
        // for testing auto-update using workspace electron-updater
        const prefixes = ["link:", "file:"];
        for (const prefix of prefixes) {
            if (updaterVersion.startsWith(prefix)) {
                const normalized = path.normalize(updaterVersion.substring(prefix.length));
                const packageJsonPath = path.isAbsolute(normalized) ? normalized : path.resolve(__dirname, normalized);
                const json = (0, fs_extra_1.readJsonSync)(path.join(packageJsonPath, "package.json"));
                updaterVersion = json.version;
                break;
            }
        }
        const requiredElectronUpdaterVersion = "4.0.0";
        if (!versionSatisfies(updaterVersion, `>=${requiredElectronUpdaterVersion}`)) {
            errors.push(`At least electron-updater ${requiredElectronUpdaterVersion} is recommended by current electron-builder version. Please set electron-updater version to "^${requiredElectronUpdaterVersion}". Received "${updaterVersion}"`);
        }
    }
    const swVersion = dependencies["electron-builder-squirrel-windows"];
    if (swVersion != null && !versionSatisfies(swVersion, ">=20.32.0")) {
        errors.push(`At least electron-builder-squirrel-windows 20.32.0 is required by current electron-builder version. Please set electron-builder-squirrel-windows to "^20.32.0"`);
    }
    const deps = ["electron", "electron-prebuilt", "electron-rebuild"];
    if (process.env.ALLOW_ELECTRON_BUILDER_AS_PRODUCTION_DEPENDENCY !== "true") {
        deps.push("electron-builder");
    }
    for (const name of deps) {
        if (name in dependencies) {
            errors.push(`Package "${name}" is only allowed in "devDependencies". ` + `Please remove it from the "dependencies" section in your package.json.`);
        }
    }
}
//# sourceMappingURL=packageMetadata.js.map
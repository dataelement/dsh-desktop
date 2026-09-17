"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NODE_MODULES_PATTERN = void 0;
exports.isElectronCompileUsed = isElectronCompileUsed;
exports.hasDep = hasDep;
exports.createTransformer = createTransformer;
exports.createElectronCompilerHost = createElectronCompilerHost;
const builder_util_1 = require("builder-util");
const promises_1 = require("fs/promises");
const path = require("path");
const builder_util_runtime_1 = require("builder-util-runtime");
/** @internal */
exports.NODE_MODULES_PATTERN = `${path.sep}node_modules${path.sep}`;
/** @internal */
function isElectronCompileUsed(info) {
    if (info.config.electronCompile != null) {
        return info.config.electronCompile;
    }
    // if in devDependencies - it means that babel is used for precompilation or for some reason user decided to not use electron-compile for production
    return hasDep("electron-compile", info);
}
/** @internal */
function hasDep(name, info) {
    const deps = info.metadata.dependencies;
    return deps != null && name in deps;
}
/** @internal */
function createTransformer(srcDir, configuration, extraMetadata, extraTransformer) {
    const mainPackageJson = path.join(srcDir, "package.json");
    const isRemovePackageScripts = configuration.removePackageScripts !== false;
    const isRemovePackageKeywords = configuration.removePackageKeywords !== false;
    const packageJson = path.sep + "package.json";
    return file => {
        if (file === mainPackageJson) {
            return modifyMainPackageJson(file, extraMetadata, isRemovePackageScripts, isRemovePackageKeywords);
        }
        if (file.endsWith(packageJson) && file.includes(exports.NODE_MODULES_PATTERN)) {
            return (0, promises_1.readFile)(file, "utf-8")
                .then(it => cleanupPackageJson(JSON.parse(it), {
                isMain: false,
                isRemovePackageScripts,
                isRemovePackageKeywords,
            }))
                .catch((e) => builder_util_1.log.warn(e));
        }
        else if (extraTransformer != null) {
            return extraTransformer(file);
        }
        else {
            return null;
        }
    };
}
/** @internal */
function createElectronCompilerHost(projectDir, cacheDir) {
    const electronCompilePath = path.join(projectDir, "node_modules", "electron-compile", "lib");
    return require(path.join(electronCompilePath, "config-parser")).createCompilerHostFromProjectRoot(projectDir, cacheDir);
}
const ignoredPackageMetadataProperties = new Set(["dist", "gitHead", "build", "jspm", "ava", "xo", "nyc", "eslintConfig", "contributors", "bundleDependencies", "tags"]);
function cleanupPackageJson(data, options) {
    const deps = data.dependencies;
    // https://github.com/electron-userland/electron-builder/issues/507#issuecomment-312772099
    const isRemoveBabel = deps != null && typeof deps === "object" && !Object.getOwnPropertyNames(deps).some(it => it.startsWith("babel"));
    try {
        let changed = false;
        for (const prop of Object.getOwnPropertyNames(data)) {
            // removing devDependencies from package.json breaks levelup in electron, so, remove it only from main package.json
            if (prop[0] === "_" ||
                ignoredPackageMetadataProperties.has(prop) ||
                (options.isRemovePackageScripts && prop === "scripts") ||
                (options.isRemovePackageKeywords && prop === "keywords") ||
                (options.isMain && prop === "devDependencies") ||
                (!options.isMain && prop === "bugs") ||
                (isRemoveBabel && prop === "babel")) {
                delete data[prop];
                changed = true;
            }
        }
        if (changed) {
            return JSON.stringify(data, null, 2);
        }
    }
    catch (e) {
        (0, builder_util_1.debug)(e);
    }
    return null;
}
async function modifyMainPackageJson(file, extraMetadata, isRemovePackageScripts, isRemovePackageKeywords) {
    const mainPackageData = JSON.parse(await (0, promises_1.readFile)(file, "utf-8"));
    if (extraMetadata != null) {
        (0, builder_util_runtime_1.deepAssign)(mainPackageData, extraMetadata);
    }
    // https://github.com/electron-userland/electron-builder/issues/1212
    const serializedDataIfChanged = cleanupPackageJson(mainPackageData, {
        isMain: true,
        isRemovePackageScripts,
        isRemovePackageKeywords,
    });
    if (serializedDataIfChanged != null) {
        return serializedDataIfChanged;
    }
    else if (extraMetadata != null) {
        return JSON.stringify(mainPackageData, null, 2);
    }
    return null;
}
//# sourceMappingURL=fileTransformer.js.map
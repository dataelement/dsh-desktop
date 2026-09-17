"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.doMergeConfigs = doMergeConfigs;
exports.validateConfiguration = validateConfiguration;
exports.computeDefaultAppDirectory = computeDefaultAppDirectory;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const fs_extra_1 = require("fs-extra");
const lazy_val_1 = require("lazy-val");
const path = require("path");
const rectCra_1 = require("../../presets/rectCra");
const version_1 = require("../../version");
const load_1 = require("./load");
const schemaValidator_1 = require("./schemaValidator");
// https://github.com/electron-userland/electron-builder/issues/1847
function mergePublish(config, configFromOptions) {
    // if config from disk doesn't have publish (or object), no need to handle, it will be simply merged by deepAssign
    const publish = Array.isArray(config.publish) ? configFromOptions.publish : null;
    if (publish != null) {
        delete configFromOptions.publish;
    }
    (0, builder_util_runtime_1.deepAssign)(config, configFromOptions);
    if (publish == null) {
        return;
    }
    const listOnDisk = config.publish;
    if (listOnDisk.length === 0) {
        config.publish = publish;
    }
    else {
        // apply to first
        (0, builder_util_runtime_1.deepAssign)(listOnDisk[0], publish);
    }
}
async function getConfig(projectDir, configPath, configFromOptions, packageMetadata = new lazy_val_1.Lazy(() => (0, load_1.orNullIfFileNotExist)((0, fs_extra_1.readJson)(path.join(projectDir, "package.json"))))) {
    const configRequest = { packageKey: "build", configFilename: "electron-builder", projectDir, packageMetadata };
    const configAndEffectiveFile = await (0, load_1.getConfig)(configRequest, configPath);
    const config = configAndEffectiveFile == null ? {} : configAndEffectiveFile.result;
    if (configFromOptions != null) {
        mergePublish(config, configFromOptions);
    }
    if (configAndEffectiveFile != null) {
        builder_util_1.log.info({ file: configAndEffectiveFile.configFile == null ? 'package.json ("build" field)' : configAndEffectiveFile.configFile }, "loaded configuration");
    }
    if (config.extends == null && config.extends !== null) {
        const metadata = (await packageMetadata.value) || {};
        const devDependencies = metadata.devDependencies;
        const dependencies = metadata.dependencies;
        if ((dependencies != null && "react-scripts" in dependencies) || (devDependencies != null && "react-scripts" in devDependencies)) {
            config.extends = "react-cra";
        }
        else if (devDependencies != null && "electron-webpack" in devDependencies) {
            let file = "electron-webpack/out/electron-builder.js";
            try {
                file = require.resolve(file);
            }
            catch (_ignore) {
                file = require.resolve("electron-webpack/electron-builder.yml");
            }
            config.extends = `file:${file}`;
        }
    }
    const parentConfigs = await loadParentConfigsRecursively(config.extends, async (configExtend) => {
        if (configExtend === "react-cra") {
            const result = await (0, rectCra_1.reactCra)(projectDir);
            builder_util_1.log.info({ preset: configExtend }, "loaded parent configuration");
            return result;
        }
        else {
            const { configFile, result } = await (0, load_1.loadParentConfig)(configRequest, configExtend);
            builder_util_1.log.info({ file: configFile }, "loaded parent configuration");
            return result;
        }
    });
    return doMergeConfigs([...parentConfigs, config]);
}
function asArray(value) {
    return Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
}
async function loadParentConfigsRecursively(configExtends, loader) {
    const configs = [];
    for (const configExtend of asArray(configExtends)) {
        const result = await loader(configExtend);
        const parentConfigs = await loadParentConfigsRecursively(result.extends, loader);
        configs.push(...parentConfigs, result);
    }
    return configs;
}
// normalize for easy merge
function normalizeFiles(configuration, name) {
    let value = configuration[name];
    if (value == null) {
        return;
    }
    if (!Array.isArray(value)) {
        value = [value];
    }
    itemLoop: for (let i = 0; i < value.length; i++) {
        let item = value[i];
        if (typeof item === "string") {
            // merge with previous if possible
            if (i !== 0) {
                let prevItemIndex = i - 1;
                let prevItem;
                do {
                    prevItem = value[prevItemIndex--];
                } while (prevItem == null);
                if (prevItem.from == null && prevItem.to == null) {
                    if (prevItem.filter == null) {
                        prevItem.filter = [item];
                    }
                    else {
                        ;
                        prevItem.filter.push(item);
                    }
                    value[i] = null;
                    continue itemLoop;
                }
            }
            item = {
                filter: [item],
            };
            value[i] = item;
        }
        else if (Array.isArray(item)) {
            throw new Error(`${name} configuration is invalid, nested array not expected for index ${i}: ${item}`);
        }
        // make sure that merge logic is not complex - unify different presentations
        if (item.from === ".") {
            item.from = undefined;
        }
        if (item.to === ".") {
            item.to = undefined;
        }
        if (item.filter != null && typeof item.filter === "string") {
            item.filter = [item.filter];
        }
    }
    configuration[name] = value.filter(it => it != null);
}
function isSimilarFileSet(value, other) {
    return value.from === other.from && value.to === other.to;
}
function mergeFilters(value, other) {
    return asArray(value).concat(asArray(other));
}
function mergeFileSets(lists) {
    const result = [];
    for (const list of lists) {
        for (const item of list) {
            const existingItem = result.find(i => isSimilarFileSet(i, item));
            if (existingItem) {
                existingItem.filter = mergeFilters(item.filter, existingItem.filter);
            }
            else {
                result.push(item);
            }
        }
    }
    return result;
}
/**
 * `doMergeConfigs` takes configs in the order you would pass them to
 * Object.assign as sources.
 */
function doMergeConfigs(configs) {
    for (const config of configs) {
        normalizeFiles(config, "files");
        normalizeFiles(config, "extraFiles");
        normalizeFiles(config, "extraResources");
    }
    const result = (0, builder_util_runtime_1.deepAssign)(getDefaultConfig(), ...configs);
    // `deepAssign` prioritises latter configs, while `mergeFilesSets` prioritises
    // former configs, so we have to reverse the order, because latter configs
    // must have higher priority.
    configs = configs.slice().reverse();
    result.files = mergeFileSets(configs.map(config => { var _a; return ((_a = config.files) !== null && _a !== void 0 ? _a : []); }));
    return result;
}
function getDefaultConfig() {
    return {
        directories: {
            output: "dist",
            buildResources: "build",
        },
    };
}
const schemeDataPromise = new lazy_val_1.Lazy(() => (0, fs_extra_1.readJson)(path.join(__dirname, "..", "..", "..", "scheme.json")));
async function validateConfiguration(config, debugLogger) {
    const extraMetadata = config.extraMetadata;
    if (extraMetadata != null) {
        if (extraMetadata.build != null) {
            throw new builder_util_1.InvalidConfigurationError(`--em.build is deprecated, please specify as -c"`);
        }
        if (extraMetadata.directories != null) {
            throw new builder_util_1.InvalidConfigurationError(`--em.directories is deprecated, please specify as -c.directories"`);
        }
    }
    const oldConfig = config;
    if (oldConfig.npmSkipBuildFromSource === false) {
        throw new builder_util_1.InvalidConfigurationError(`npmSkipBuildFromSource is deprecated, please use buildDependenciesFromSource"`);
    }
    if (oldConfig.appImage != null && oldConfig.appImage.systemIntegration != null) {
        throw new builder_util_1.InvalidConfigurationError(`appImage.systemIntegration is deprecated, https://github.com/TheAssassin/AppImageLauncher is used for desktop integration"`);
    }
    (0, schemaValidator_1.validateSchema)(await schemeDataPromise.value, config, {
        name: `electron-builder ${version_1.PACKAGE_VERSION}`,
        postFormatter: (formattedError, error) => {
            var _a, _b;
            if (debugLogger.isEnabled) {
                debugLogger.add("invalidConfig", (0, builder_util_1.safeStringifyJson)(error));
            }
            const site = "https://www.electron.build";
            let url = `${site}/configuration`;
            const targets = new Set(["mac", "dmg", "pkg", "mas", "win", "nsis", "appx", "linux", "appimage", "snap"]);
            const firstSegment = (_b = ((_a = error.instancePath) !== null && _a !== void 0 ? _a : "").split("/").filter(Boolean)[0]) === null || _b === void 0 ? void 0 : _b.toLowerCase();
            if (firstSegment != null && targets.has(firstSegment)) {
                url = `${site}/${firstSegment}`;
            }
            return `${formattedError}\n  How to fix:
  1. Open ${url}
  2. Search the option name on the page (or type in into Search to find across the docs).
    * Not found? The option was deprecated or not exists (check spelling).
    * Found? Check that the option in the appropriate place. e.g. "title" only in the "dmg", not in the root.
`;
        },
    });
}
const DEFAULT_APP_DIR_NAMES = ["app", "www"];
async function computeDefaultAppDirectory(projectDir, userAppDir) {
    if (userAppDir != null) {
        const absolutePath = path.resolve(projectDir, userAppDir);
        const stat = await (0, builder_util_1.statOrNull)(absolutePath);
        if (stat == null) {
            throw new builder_util_1.InvalidConfigurationError(`Application directory ${userAppDir} doesn't exist`);
        }
        else if (!stat.isDirectory()) {
            throw new builder_util_1.InvalidConfigurationError(`Application directory ${userAppDir} is not a directory`);
        }
        else if (projectDir === absolutePath) {
            builder_util_1.log.warn({ appDirectory: userAppDir }, `Specified application directory equals to project dir — superfluous or wrong configuration`);
        }
        return absolutePath;
    }
    for (const dir of DEFAULT_APP_DIR_NAMES) {
        const absolutePath = path.join(projectDir, dir);
        const packageJson = path.join(absolutePath, "package.json");
        const stat = await (0, builder_util_1.statOrNull)(packageJson);
        if (stat != null && stat.isFile()) {
            return absolutePath;
        }
    }
    return projectDir;
}
//# sourceMappingURL=config.js.map
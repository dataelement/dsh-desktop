"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAndReadConfig = findAndReadConfig;
exports.orNullIfFileNotExist = orNullIfFileNotExist;
exports.orIfFileNotExist = orIfFileNotExist;
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
exports.loadParentConfig = loadParentConfig;
exports.loadEnv = loadEnv;
const builder_util_1 = require("builder-util");
const dotenv_1 = require("dotenv");
const dotenv_expand_1 = require("dotenv-expand");
const fs_1 = require("fs");
const jiti_1 = require("jiti");
const js_yaml_1 = require("js-yaml");
const path = require("path");
const resolve_1 = require("../resolve");
const jiti = (0, jiti_1.createJiti)(__filename);
async function readConfig(configFile, request) {
    const data = await fs_1.promises.readFile(configFile, "utf8");
    let result;
    if (configFile.endsWith(".json5") || configFile.endsWith(".json")) {
        result = require("json5").parse(data);
    }
    else if (configFile.endsWith(".js") || configFile.endsWith(".cjs") || configFile.endsWith(".mjs")) {
        const json = await orNullIfFileNotExist(fs_1.promises.readFile(path.join(process.cwd(), "package.json"), "utf8"));
        const moduleType = json === null ? null : JSON.parse(json).type;
        result = await (0, resolve_1.resolveModule)(moduleType, configFile);
        if (result.default != null) {
            result = result.default;
        }
        if (typeof result === "function") {
            result = result(request);
        }
        result = await Promise.resolve(result);
    }
    else if (configFile.endsWith(".ts")) {
        result = await jiti.import(configFile, { default: true });
        if (typeof result === "function") {
            result = result(request);
        }
        result = await Promise.resolve(result);
    }
    else if (configFile.endsWith(".toml")) {
        result = require("toml").parse(data);
    }
    else {
        result = (0, js_yaml_1.load)(data);
    }
    return { result, configFile };
}
async function findAndReadConfig(request) {
    const prefix = request.configFilename;
    for (const configFile of [`${prefix}.yml`, `${prefix}.yaml`, `${prefix}.json`, `${prefix}.json5`, `${prefix}.toml`, `${prefix}.js`, `${prefix}.cjs`, `${prefix}.ts`]) {
        const data = await orNullIfFileNotExist(readConfig(path.join(request.projectDir, configFile), request));
        if (data != null) {
            return data;
        }
    }
    return null;
}
function orNullIfFileNotExist(promise) {
    return orIfFileNotExist(promise, null);
}
function orIfFileNotExist(promise, fallbackValue) {
    return promise.catch(e => {
        if (e.code === "ENOENT" || e.code === "ENOTDIR") {
            return fallbackValue;
        }
        throw e;
    });
}
async function loadConfig(request) {
    let packageMetadata = request.packageMetadata == null ? null : await request.packageMetadata.value;
    if (packageMetadata == null) {
        const json = await orNullIfFileNotExist(fs_1.promises.readFile(path.join(request.projectDir, "package.json"), "utf8"));
        packageMetadata = json == null ? null : JSON.parse(json);
    }
    const data = packageMetadata == null ? null : packageMetadata[request.packageKey];
    return data == null ? findAndReadConfig(request) : { result: data, configFile: null };
}
function getConfig(request, configPath) {
    if (configPath == null) {
        return loadConfig(request);
    }
    else {
        return readConfig(path.resolve(request.projectDir, configPath), request);
    }
}
async function loadParentConfig(request, spec) {
    let isFileSpec;
    if (spec.startsWith("file:")) {
        spec = spec.substring("file:".length);
        isFileSpec = true;
    }
    let parentConfig = await orNullIfFileNotExist(readConfig(path.resolve(request.projectDir, spec), request));
    if (parentConfig == null && isFileSpec !== true) {
        let resolved = null;
        try {
            resolved = require.resolve(spec);
        }
        catch (_e) {
            // ignore
        }
        if (resolved != null) {
            parentConfig = await readConfig(resolved, request);
        }
    }
    if (parentConfig == null) {
        throw new Error(`Cannot find parent config file: ${spec}`);
    }
    return parentConfig;
}
async function loadEnv(envFile) {
    const data = await orNullIfFileNotExist(fs_1.promises.readFile(envFile, "utf8"));
    if (data == null) {
        return null;
    }
    const parsed = (0, dotenv_1.parse)(data);
    builder_util_1.log.info({ envFile }, "injecting environment");
    Object.entries(parsed).forEach(([key, value]) => {
        if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
            process.env[key] = value;
        }
    });
    (0, dotenv_expand_1.expand)({ parsed });
    return parsed;
}
//# sourceMappingURL=load.js.map
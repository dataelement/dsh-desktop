"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidConfigurationError = exports.ExecError = exports.debug7z = exports.resolveCscLinkPath = exports.decodeCscLinkBase64 = exports.loadCscLink = exports.generateKsuid = exports.isValidKey = exports.deepAssign = exports.asArray = exports.parseValidEnvVarUrl = exports.NodeHttpExecutor = exports.httpExecutor = exports.buildGotProxyAgent = exports.DebugLogger = exports.AsyncTaskManager = exports.toLinuxArchString = exports.getArchSuffix = exports.getArchCliNames = exports.defaultArchFromString = exports.archFromString = exports.Arch = exports.TmpDir = exports.retry = exports.safeStringifyJson = exports.isEmptyOrSpaces = void 0;
exports.serializeToYaml = serializeToYaml;
exports.removePassword = removePassword;
exports.stripSensitiveEnvVars = stripSensitiveEnvVars;
exports.filterSensitiveEnv = filterSensitiveEnv;
exports.exec = exec;
exports.doSpawn = doSpawn;
exports.spawnAndWrite = spawnAndWrite;
exports.spawnAndWriteWithOutput = spawnAndWriteWithOutput;
exports.spawn = spawn;
exports.use = use;
exports.isTokenCharValid = isTokenCharValid;
exports.getUserDefinedCacheDir = getUserDefinedCacheDir;
exports.addValue = addValue;
exports.isArrayEqualRegardlessOfSort = isArrayEqualRegardlessOfSort;
exports.removeNullish = removeNullish;
exports.replaceDefault = replaceDefault;
exports.getPlatformIconFileName = getPlatformIconFileName;
exports.isPullRequest = isPullRequest;
exports.isEnvTrue = isEnvTrue;
exports.sanitizeDirPath = sanitizeDirPath;
exports.to7zaOutputSwitch = to7zaOutputSwitch;
const builder_util_runtime_1 = require("builder-util-runtime");
const chalk = require("chalk");
const child_process_1 = require("child_process");
const cross_spawn_1 = require("cross-spawn");
const debug_1 = require("debug");
const js_yaml_1 = require("js-yaml");
const path = require("path");
const source_map_support_1 = require("source-map-support");
const log_1 = require("./log");
const fs_1 = require("./fs");
const fs_extra_1 = require("fs-extra");
const stringUtil_1 = require("./stringUtil");
if (process.env.JEST_WORKER_ID == null) {
    (0, source_map_support_1.install)();
}
var stringUtil_2 = require("./stringUtil");
Object.defineProperty(exports, "isEmptyOrSpaces", { enumerable: true, get: function () { return stringUtil_2.isEmptyOrSpaces; } });
var builder_util_runtime_2 = require("builder-util-runtime");
Object.defineProperty(exports, "safeStringifyJson", { enumerable: true, get: function () { return builder_util_runtime_2.safeStringifyJson; } });
Object.defineProperty(exports, "retry", { enumerable: true, get: function () { return builder_util_runtime_2.retry; } });
var temp_file_1 = require("temp-file");
Object.defineProperty(exports, "TmpDir", { enumerable: true, get: function () { return temp_file_1.TmpDir; } });
__exportStar(require("./arch"), exports);
var arch_1 = require("./arch");
Object.defineProperty(exports, "Arch", { enumerable: true, get: function () { return arch_1.Arch; } });
Object.defineProperty(exports, "archFromString", { enumerable: true, get: function () { return arch_1.archFromString; } });
Object.defineProperty(exports, "defaultArchFromString", { enumerable: true, get: function () { return arch_1.defaultArchFromString; } });
Object.defineProperty(exports, "getArchCliNames", { enumerable: true, get: function () { return arch_1.getArchCliNames; } });
Object.defineProperty(exports, "getArchSuffix", { enumerable: true, get: function () { return arch_1.getArchSuffix; } });
Object.defineProperty(exports, "toLinuxArchString", { enumerable: true, get: function () { return arch_1.toLinuxArchString; } });
var asyncTaskManager_1 = require("./asyncTaskManager");
Object.defineProperty(exports, "AsyncTaskManager", { enumerable: true, get: function () { return asyncTaskManager_1.AsyncTaskManager; } });
var DebugLogger_1 = require("./DebugLogger");
Object.defineProperty(exports, "DebugLogger", { enumerable: true, get: function () { return DebugLogger_1.DebugLogger; } });
__exportStar(require("./log"), exports);
var nodeHttpExecutor_1 = require("./nodeHttpExecutor");
Object.defineProperty(exports, "buildGotProxyAgent", { enumerable: true, get: function () { return nodeHttpExecutor_1.buildGotProxyAgent; } });
Object.defineProperty(exports, "httpExecutor", { enumerable: true, get: function () { return nodeHttpExecutor_1.httpExecutor; } });
Object.defineProperty(exports, "NodeHttpExecutor", { enumerable: true, get: function () { return nodeHttpExecutor_1.NodeHttpExecutor; } });
__exportStar(require("./promise"), exports);
__exportStar(require("./envUtil"), exports);
var envUtil_1 = require("./envUtil");
Object.defineProperty(exports, "parseValidEnvVarUrl", { enumerable: true, get: function () { return envUtil_1.parseValidEnvVarUrl; } });
var builder_util_runtime_3 = require("builder-util-runtime");
Object.defineProperty(exports, "asArray", { enumerable: true, get: function () { return builder_util_runtime_3.asArray; } });
Object.defineProperty(exports, "deepAssign", { enumerable: true, get: function () { return builder_util_runtime_3.deepAssign; } });
Object.defineProperty(exports, "isValidKey", { enumerable: true, get: function () { return builder_util_runtime_3.isValidKey; } });
__exportStar(require("./fs"), exports);
var ksuid_1 = require("./ksuid");
Object.defineProperty(exports, "generateKsuid", { enumerable: true, get: function () { return ksuid_1.generateKsuid; } });
var cscLink_1 = require("./cscLink");
Object.defineProperty(exports, "loadCscLink", { enumerable: true, get: function () { return cscLink_1.loadCscLink; } });
Object.defineProperty(exports, "decodeCscLinkBase64", { enumerable: true, get: function () { return cscLink_1.decodeCscLinkBase64; } });
Object.defineProperty(exports, "resolveCscLinkPath", { enumerable: true, get: function () { return cscLink_1.resolveCscLinkPath; } });
exports.debug7z = (0, debug_1.default)("electron-builder:7z");
function serializeToYaml(object, skipInvalid = false, noRefs = false) {
    return (0, js_yaml_1.dump)(object, {
        lineWidth: 8000,
        skipInvalid,
        noRefs,
    });
}
function removePassword(input) {
    // Sensitive parameter stems — any of `-`, `--`, or `/` prefix is accepted for all stems.
    // `pass:` is intentionally absent; the dedicated pass: handler below covers it without double-processing.
    const sensitiveStems = ["accessKey", "secretKey", "privateToken", "apiKey", "passphrase", "password", "secret", "token", "String", "pass", "p"];
    const stemAlt = sensitiveStems.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    // (?:--?|/) matches -, --, or / prefix. Longest stems listed first to minimise backtracking.
    // (?<!\S) / (?=[\s"']|$) word-boundary guards prevent matching -path, -StringLength, etc.
    const flagPattern = new RegExp(`(?<!\\S)((?:--?|/)(?:${stemAlt}))(?=[\\s"']|$)\\s*(?:(["'])(.*?)\\2|([^\\s]+))`, "gi");
    input = input.replace(flagPattern, (_match, prefix, quote, quotedVal, unquotedVal) => {
        const value = quotedVal !== null && quotedVal !== void 0 ? quotedVal : unquotedVal;
        if (prefix.trim().toLowerCase() === "/p" && value.startsWith("\\\\Mac\\Host\\")) {
            return `${prefix} ${quote !== null && quote !== void 0 ? quote : ""}${value}${quote !== null && quote !== void 0 ? quote : ""}`;
        }
        return `${prefix} ${quote !== null && quote !== void 0 ? quote : ""}${(0, builder_util_runtime_1.hashSensitiveValue)(value)}${quote !== null && quote !== void 0 ? quote : ""}`;
    });
    // pass:value — colon acts as separator; handles both pass:secret (no space) and pass: secret (space)
    // Quoted phrases (pass:'a b c' or pass:"a b c") are captured in full so the whole phrase is hashed.
    input = input.replace(/(?<!\S)pass:\s*(?:(["'])(.*?)\1|([^\s]+))/gi, (_match, quote, quotedVal, unquotedVal) => {
        const value = quotedVal !== null && quotedVal !== void 0 ? quotedVal : unquotedVal;
        return quote ? `pass:${quote}${(0, builder_util_runtime_1.hashSensitiveValue)(value)}${quote}` : `pass:${(0, builder_util_runtime_1.hashSensitiveValue)(value)}`;
    });
    // /b … /c block format
    return input.replace(/(\/b\s+)(.*?)(\s+\/c)/g, (_match, p1, p2, p3) => {
        return `${p1}${(0, builder_util_runtime_1.hashSensitiveValue)(p2)}${p3}`;
    });
}
const SENSITIVE_ENV_KEY_RE = /KEY|TOKEN|SECRET|PASSWORD|PASS|CREDENTIAL|CSC/i;
/**
 * Returns a copy of the environment with sensitive keys removed.
 * Use this when building the environment for child processes that do not
 * need signing credentials, tokens, or passwords (e.g. package managers).
 */
function stripSensitiveEnvVars(env) {
    const out = {};
    for (const [k, v] of Object.entries(env)) {
        if ((0, builder_util_runtime_1.isValidKey)(k) && !(0, builder_util_runtime_1.isSensitiveFieldName)(k) && !SENSITIVE_ENV_KEY_RE.test(k)) {
            out[k] = v;
        }
    }
    return out;
}
function filterSensitiveEnv(env) {
    const out = {};
    for (const [k, v] of Object.entries(env)) {
        out[k] = ((0, builder_util_runtime_1.isSensitiveFieldName)(k) || SENSITIVE_ENV_KEY_RE.test(k)) && v != null ? (0, builder_util_runtime_1.hashSensitiveValue)(v) : v;
    }
    return out;
}
function getProcessEnv(env) {
    // Windows: passing a filtered env to execFile drops critical system vars (PATH, SYSTEMROOT, TEMP)
    // that many tools require. Credential stripping is therefore not applied on Windows.
    if (process.platform === "win32") {
        return env == null ? undefined : env;
    }
    // When no explicit env is provided, strip credential env vars so child processes
    // (package managers, signing tools, etc.) don't inherit secrets they don't need.
    const finalEnv = {
        ...(env == null ? stripSensitiveEnvVars(process.env) : env),
    };
    // without LC_CTYPE dpkg can returns encoded unicode symbols
    // set LC_CTYPE to avoid crash https://github.com/electron-userland/electron-builder/issues/503 Even "en_DE.UTF-8" leads to error.
    const locale = process.platform === "linux" ? process.env.LANG || "C.UTF-8" : "en_US.UTF-8";
    finalEnv.LANG = locale;
    finalEnv.LC_CTYPE = locale;
    finalEnv.LC_ALL = locale;
    return finalEnv;
}
function exec(file, args, options, isLogOutIfDebug = true) {
    if (log_1.log.isDebugEnabled) {
        const logFields = {
            file,
            args: args == null ? "" : removePassword(args.join(" ")),
        };
        if (options != null) {
            if (options.cwd != null) {
                logFields.cwd = options.cwd;
            }
            if (options.env != null) {
                const diffEnv = { ...options.env };
                for (const name of Object.keys(process.env)) {
                    if (process.env[name] === options.env[name]) {
                        delete diffEnv[name];
                    }
                }
                logFields.env = (0, builder_util_runtime_1.safeStringifyJson)(filterSensitiveEnv(diffEnv));
            }
        }
        log_1.log.debug(logFields, "executing");
    }
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(file, args, {
            ...options,
            maxBuffer: 1000 * 1024 * 1024,
            env: getProcessEnv(options == null ? null : options.env), // codeql[js/shell-command-injection-from-environment] - env filtered via getProcessEnv/stripSensitiveEnvVars; execFile array args (no shell)
        }, (error, stdout, stderr) => {
            if (error == null) {
                if (isLogOutIfDebug && log_1.log.isDebugEnabled) {
                    const logFields = {
                        file,
                    };
                    if (stdout.length > 0) {
                        logFields.stdout = stdout;
                    }
                    if (stderr.length > 0) {
                        logFields.stderr = stderr;
                    }
                    log_1.log.debug(logFields, "executed");
                }
                resolve(stdout.toString());
            }
            else {
                let message = chalk.red(removePassword(`Exit code: ${error.code}. ${error.message}`));
                if (stdout.length !== 0) {
                    if (file.endsWith("wine")) {
                        stdout = stdout.toString();
                    }
                    message += `\n${chalk.yellow(removePassword(stdout.toString()))}`;
                }
                if (stderr.length !== 0) {
                    if (file.endsWith("wine")) {
                        stderr = stderr.toString();
                    }
                    message += `\n${chalk.red(removePassword(stderr.toString()))}`;
                }
                // TODO: switch to ECMA Script 2026 Error class with `cause` property to return stack trace
                reject(new ExecError(file, error.code, message, "", `${error.code || ExecError.code}`));
            }
        });
    });
}
function logSpawn(command, args, options) {
    // use general debug.enabled to log spawn, because it doesn't produce a lot of output (the only line), but important in any case
    if (!log_1.log.isDebugEnabled) {
        return;
    }
    const argsString = removePassword(args.join(" "));
    const logFields = {
        command: command + " " + (command === "docker" ? argsString : removePassword(argsString)),
    };
    if (options != null && options.cwd != null) {
        logFields.cwd = options.cwd;
    }
    log_1.log.debug(logFields, "spawning");
}
function doSpawn(command, args, options, extraOptions) {
    if (options == null) {
        options = {};
    }
    options.env = getProcessEnv(options.env);
    if (options.stdio == null) {
        const isDebugEnabled = log_1.debug.enabled;
        // do not ignore stdout/stderr if not debug, because in this case we will read into buffer and print on error
        options.stdio = [extraOptions != null && extraOptions.isPipeInput ? "pipe" : "ignore", isDebugEnabled ? "inherit" : "pipe", isDebugEnabled ? "inherit" : "pipe"];
    }
    logSpawn(command, args, options);
    try {
        return (0, cross_spawn_1.spawn)(command, args, options);
    }
    catch (e) {
        throw new Error(`Cannot spawn ${command}: ${e.stack || e}`);
    }
}
function spawnAndWrite(command, args, data, options) {
    const childProcess = doSpawn(command, args, options, { isPipeInput: true });
    const timeout = setTimeout(() => childProcess.kill(), 4 * 60 * 1000);
    return new Promise((resolve, reject) => {
        handleProcess("close", childProcess, command, () => {
            try {
                clearTimeout(timeout);
            }
            finally {
                resolve(undefined);
            }
        }, error => {
            try {
                clearTimeout(timeout);
            }
            finally {
                reject(error);
            }
        });
        childProcess.stdin.end(data);
    });
}
function spawnAndWriteWithOutput(command, args, data, options) {
    const childProcess = doSpawn(command, args, { ...options, stdio: ["pipe", "pipe", "pipe"] });
    const isDebugEnabled = log_1.debug.enabled;
    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            childProcess.kill();
        }, 4 * 60 * 1000);
        childProcess.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
        });
        childProcess.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
            if (isDebugEnabled) {
                process.stdout.write(chunk);
            }
        });
        childProcess.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
            if (isDebugEnabled) {
                process.stderr.write(chunk);
            }
        });
        childProcess.stdin.end(data);
        childProcess.once("close", (code) => {
            clearTimeout(timeout);
            if (timedOut) {
                reject(new Error(`${command} timed out after 4 minutes`));
            }
            else if (code === 0) {
                resolve({ stdout, stderr });
            }
            else {
                reject(new ExecError(command, code !== null && code !== void 0 ? code : -1, stdout, stderr));
            }
        });
    });
}
function spawn(command, args, options, extraOptions) {
    return new Promise((resolve, reject) => {
        handleProcess("close", doSpawn(command, args || [], options, extraOptions), command, resolve, reject);
    });
}
function handleProcess(event, childProcess, command, resolve, reject) {
    childProcess.on("error", reject);
    let out = "";
    if (childProcess.stdout != null) {
        childProcess.stdout.on("data", (data) => {
            out += data;
        });
    }
    let errorOut = "";
    if (childProcess.stderr != null) {
        childProcess.stderr.on("data", (data) => {
            errorOut += data;
        });
    }
    childProcess.once(event, (code) => {
        if (log_1.log.isDebugEnabled) {
            const fields = {
                command: path.basename(command),
                code,
                pid: childProcess.pid,
            };
            if (out.length > 0) {
                fields.out = out;
            }
            log_1.log.debug(fields, "exited");
        }
        if (code === 0) {
            if (resolve != null) {
                resolve(out);
            }
        }
        else {
            reject(new ExecError(command, code, out, errorOut));
        }
    });
}
function formatOut(text, title) {
    return text.length === 0 ? "" : `\n${title}:\n${text}`;
}
class ExecError extends Error {
    constructor(command, exitCode, out, errorOut, code = ExecError.code) {
        super(`${command} process failed ${code}${formatOut(String(exitCode), "Exit code")}${formatOut(out, "Output")}${formatOut(errorOut, "Error output")}`);
        this.exitCode = exitCode;
        this.alreadyLogged = false;
        this.code = code;
    }
}
exports.ExecError = ExecError;
ExecError.code = "ERR_ELECTRON_BUILDER_CANNOT_EXECUTE";
function use(value, task) {
    return value == null ? null : task(value);
}
function isTokenCharValid(token) {
    return /^[.\w/=+-]+$/.test(token);
}
async function getUserDefinedCacheDir() {
    let cacheEnv = process.env.ELECTRON_BUILDER_CACHE;
    if (!(0, stringUtil_1.isEmptyOrSpaces)(cacheEnv)) {
        cacheEnv = path.resolve(cacheEnv);
        if (!(await (0, fs_1.exists)(cacheEnv))) {
            await (0, fs_extra_1.mkdir)(cacheEnv);
        }
        return cacheEnv;
    }
    return undefined;
}
function addValue(map, key, value) {
    const list = map.get(key);
    if (list == null) {
        map.set(key, [value]);
    }
    else if (!list.includes(value)) {
        list.push(value);
    }
}
function isArrayEqualRegardlessOfSort(a, b) {
    a = a.slice();
    b = b.slice();
    a.sort();
    b.sort();
    return a.length === b.length && a.every((value, index) => value === b[index]);
}
/**
 * Recursively removes all undefined and null values from an object
 */
function removeNullish(obj) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(removeNullish);
    }
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value != null) {
            result[key] = removeNullish(value);
        }
    }
    return result;
}
function replaceDefault(inList, defaultList) {
    if (inList == null || (inList.length === 1 && inList[0] === "default")) {
        return defaultList;
    }
    const index = inList.indexOf("default");
    if (index >= 0) {
        const list = inList.slice(0, index);
        list.push(...defaultList);
        if (index !== inList.length - 1) {
            list.push(...inList.slice(index + 1));
        }
        inList = list;
    }
    return inList;
}
function getPlatformIconFileName(value, isMac) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (!value.includes(".")) {
        return `${value}.${isMac ? "icns" : "ico"}`;
    }
    return value.replace(isMac ? ".ico" : ".icns", isMac ? ".icns" : ".ico");
}
function isPullRequest() {
    // TRAVIS_PULL_REQUEST is set to the pull request number if the current job is a pull request build, or false if it’s not.
    function isSet(value) {
        // value can be or null, or empty string
        return value && value !== "false";
    }
    return (isSet(process.env.TRAVIS_PULL_REQUEST) ||
        isSet(process.env.CIRCLE_PULL_REQUEST) ||
        isSet(process.env.BITRISE_PULL_REQUEST) ||
        isSet(process.env.APPVEYOR_PULL_REQUEST_NUMBER) ||
        isSet(process.env.GITHUB_BASE_REF));
}
function isEnvTrue(value) {
    if (value != null) {
        value = value.trim();
    }
    return value === "true" || value === "" || value === "1";
}
class InvalidConfigurationError extends Error {
    constructor(message, code = "ERR_ELECTRON_BUILDER_INVALID_CONFIGURATION") {
        super(message);
        this.code = code;
    }
}
exports.InvalidConfigurationError = InvalidConfigurationError;
/**
 * Resolves a user-supplied path to an absolute form and validates it.
 *
 * Always rejects paths containing null bytes or newlines (C-level argument
 * injection risk even with array-form execFile).
 *
 * When `base` is provided, also enforces containment: the resolved path must
 * start with the resolved `base` directory.  This `startsWith`-based check is
 * the pattern that CodeQL's path-injection analysis recognises as a sanitizer,
 * clearing the taint on the returned value for interprocedural analysis.
 */
function sanitizeDirPath(p, base) {
    if ((0, stringUtil_1.isEmptyOrSpaces)(p)) {
        throw new InvalidConfigurationError("Directory path must be a non-empty string");
    }
    if (p.includes("\0") || p.includes("\n") || p.includes("\r")) {
        throw new InvalidConfigurationError(`Directory path contains illegal characters: "${p}"`);
    }
    const resolved = path.resolve(p);
    if (base != null) {
        const resolvedBase = path.resolve(base);
        if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
            throw new InvalidConfigurationError(`Path "${p}" must be within "${base}"`);
        }
    }
    return resolved;
}
/**
 * Validates a path and returns the complete 7-Zip `-o<dir>` switch token.
 *
 * Input is first normalized via `sanitizeDirPath` (absolute resolution + null/newline
 * rejection), then validated for 7za switch-token safety.
 *
 * Allowlist rejects:
 *   - empty string (7za would receive bare `-o`, which fails)
 *   - leading `-`  (7za would misparse the token as a new switch)
 *   - control chars 0x00–0x1F and DEL 0x7F (C-level truncation/control risk)
 */
function to7zaOutputSwitch(p) {
    const safePath = sanitizeDirPath(p);
    // eslint-disable-next-line no-control-regex
    if (!/^[^\x00-\x1F\x7F-][^\x00-\x1F\x7F]*$/.test(safePath)) {
        throw new InvalidConfigurationError(`7za output path is empty, starts with "-", or contains control characters: "${p}"`);
    }
    return "-o" + safePath;
}
//# sourceMappingURL=util.js.map
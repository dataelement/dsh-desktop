"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeModulesCollector = void 0;
exports.buildPowerShellEncodedArgs = buildPowerShellEncodedArgs;
const builder_util_1 = require("builder-util");
const childProcess = require("child_process");
const fs = require("fs-extra");
const fs_extra_1 = require("fs-extra");
const lazy_val_1 = require("lazy-val");
const path = require("path");
const hoist_1 = require("./hoist");
const moduleManager_1 = require("./moduleManager");
const packageManager_1 = require("./packageManager");
class NodeModulesCollector {
    constructor(rootDir, tempDirManager) {
        this.rootDir = rootDir;
        this.tempDirManager = tempDirManager;
        this.nodeModules = [];
        this.allDependencies = new Map();
        this.productionGraph = {};
        this.cache = new moduleManager_1.ModuleManager();
        this.isHoisted = new lazy_val_1.Lazy(async () => {
            const { manager } = this.installOptions;
            const command = (0, packageManager_1.getPackageManagerCommand)(manager);
            const config = (await this.asyncExec(command, ["config", "list"])).stdout;
            if (config == null) {
                builder_util_1.log.debug({ manager }, "unable to determine node-linker setting; assuming non-hoisted (virtual store) layout");
                return false;
            }
            const lines = Object.fromEntries(config.split("\n").map(line => line.split("=").map(s => s.trim())));
            if (lines["node-linker"] === "hoisted") {
                builder_util_1.log.debug({ manager }, "node_modules are hoisted");
                return true;
            }
            return false;
        });
    }
    /**
     * Retrieves and collects all Node.js modules for a given package.
     *
     * This method orchestrates the entire module collection process by:
     * 1. Fetching the dependency tree from the package manager
     * 2. Collecting all dependencies recursively
     * 3. Extracting workspace references if applicable
     * 4. Building a production dependency graph
     * 5. Hoisting the dependencies to their final locations
     * 6. Resolving and returning module information
     */
    async getNodeModules({ packageName }) {
        const tree = await this.getDependenciesTree(this.installOptions.manager);
        await this.collectAllDependencies(tree, packageName);
        const realTree = this.getTreeFromWorkspaces(tree, packageName);
        await this.extractProductionDependencyGraph(realTree, packageName);
        const hoisterResult = (0, hoist_1.hoist)(this.transformToHoisterTree(this.productionGraph, packageName), {
            check: builder_util_1.log.isDebugEnabled,
        });
        await this._getNodeModules(hoisterResult.dependencies, this.nodeModules);
        builder_util_1.log.debug({ packageName, depCount: this.nodeModules.length }, "node modules collection complete");
        return { nodeModules: this.nodeModules, logSummary: this.cache.logSummary };
    }
    /**
     * Retrieves the dependency tree from the package manager.
     *
     * Executes the appropriate package manager command to fetch the dependency tree and writes
     * the output to a temporary file. Includes retry logic to handle transient failures such as
     * incomplete JSON output or missing files. Will retry up to 1 time with exponential backoff.
     */
    async getDependenciesTree(pm) {
        const command = (0, packageManager_1.getPackageManagerCommand)(pm);
        const args = this.getArgs();
        const tempOutputFile = await this.tempDirManager.getTempFile({
            prefix: path.basename(command, path.extname(command)),
            suffix: "output.json",
        });
        return (0, builder_util_1.retry)(async () => {
            await this.streamCollectorCommandToFile(command, args, this.rootDir, tempOutputFile);
            const shellOutput = await fs.readFile(tempOutputFile, { encoding: "utf8" });
            const result = await Promise.resolve(this.parseDependenciesTree(shellOutput));
            return result;
        }, {
            retries: 1,
            interval: 2000,
            backoff: 2000,
            shouldRetry: async (error) => {
                var _a, _b;
                const fields = { error: error.message, tempOutputFile, cwd: this.rootDir, packageManager: pm };
                if (!(await (0, builder_util_1.exists)(tempOutputFile))) {
                    builder_util_1.log.debug(fields, "dependency tree output file missing, retrying");
                    return true;
                }
                const fileContent = await fs.readFile(tempOutputFile, { encoding: "utf8" });
                fields.fileContentLength = fileContent.length.toString();
                if (fileContent.trim().length === 0) {
                    builder_util_1.log.debug(fields, "dependency tree output file empty, retrying");
                    return true;
                }
                // extract small start/end sample for debugging purposes (e.g. polluted console output)
                const lines = fileContent.split("\n");
                const lineSampleSize = Math.min(5, lines.length / 2);
                if (2 * lineSampleSize > 5) {
                    fields.sampleStart = lines.slice(0, lineSampleSize).join("\n");
                    fields.sampleEnd = lines.slice(-lineSampleSize).join("\n");
                }
                else {
                    fields.content = fileContent;
                }
                // Both indicate truncated/polluted PM output (a transient that re-running the command clears).
                if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("Unexpected end of JSON input")) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("No JSON content found in output"))) {
                    builder_util_1.log.debug(fields, "JSON parse error in dependency tree, retrying");
                    return true;
                }
                builder_util_1.log.error(fields, "error parsing dependencies tree");
                return false;
            },
        });
    }
    /**
     * Parses the dependencies tree from shell command output.
     *
     **/
    parseDependenciesTree(shellOutput) {
        return this.extractJsonFromPollutedOutput(shellOutput);
    }
    extractJsonFromPollutedOutput(shellOutput) {
        const consoleOutput = shellOutput.trim();
        try {
            // Please for the love of all that is holy, this should cover 99% of cases where npm/pnpm/yarn output is clean JSON
            return JSON.parse(consoleOutput);
        }
        catch {
            // ignore
        }
        // DEDICATED FALLBACK FOR POLLUTED OUTPUT, non-trivial to implement correctly, not needed in most cases, and highly inefficient
        // Find the first index that starts with { or [
        const bracketOpen = Math.max(consoleOutput.indexOf("{"), 0);
        const bracketOpenSquare = Math.max(consoleOutput.indexOf("["), 0);
        const start = Math.min(bracketOpen, bracketOpenSquare); // always non-negative due to Math.max above
        for (let i = start; i < consoleOutput.length; i++) {
            const slice = consoleOutput.slice(start, i + 1);
            try {
                return JSON.parse(slice);
            }
            catch {
                // ignore, try next
            }
        }
        throw new Error("No JSON content found in output");
    }
    cacheKey(pkg) {
        const rel = path.relative(this.rootDir, pkg.path);
        return `${pkg.name}::${pkg.version}::${rel !== null && rel !== void 0 ? rel : "."}`;
    }
    // We use the key (alias name) instead of value.name for npm aliased packages
    // e.g., { "foo": { name: "@scope/bar", ... } } should be stored as "foo@version"
    normalizePackageVersion(key, pkg) {
        return { id: `${key}@${pkg.version}`, pkgOverride: { ...pkg, name: key } };
    }
    /**
     * Determines if a given dependency is a production dependency of a package.
     *
     * Checks both the dependencies and optionalDependencies of a package to see if
     * the specified dependency name is listed.
     *
     * @param depName - The name of the dependency to check
     * @param pkg - The package to search for the dependency in
     * @returns True if the dependency is found in either dependencies or optionalDependencies, false otherwise
     */
    isProdDependency(depName, pkg) {
        const prodDeps = { ...pkg.dependencies, ...pkg.optionalDependencies };
        return prodDeps[depName] != null;
    }
    async locatePackageWithVersion(depTree) {
        const result = await this.cache.locatePackageVersion({
            parentDir: depTree.path,
            pkgName: depTree.name,
            requiredRange: depTree.version,
        });
        return result;
    }
    /**
     * Parses a dependency identifier string into name and version components.
     *
     * Handles both scoped packages (e.g., "@scope/pkg@1.2.3") and regular packages (e.g., "pkg@1.2.3").
     * If the identifier is malformed or cannot be parsed, defaults to treating the entire string as
     * the package name with an "unknown" version.
     */
    parseNameVersion(identifier) {
        let at;
        if (identifier.startsWith("@")) {
            // Scoped package: find the version separator after the scope (e.g. "@scope/pkg@1.2.3")
            const slashIndex = identifier.indexOf("/");
            if (slashIndex === -1) {
                return { name: identifier, version: "unknown" };
            }
            at = identifier.indexOf("@", slashIndex + 1);
        }
        else {
            at = identifier.indexOf("@");
        }
        if (at <= 0) {
            return { name: identifier, version: "unknown" };
        }
        return { name: identifier.slice(0, at), version: identifier.slice(at + 1) };
    }
    /**
     * Retrieves the dependency tree and handles workspace package self-references.
     *
     * If the project is a workspace project, this method removes the root package's self-reference
     * from the dependency tree to avoid circular dependencies. It promotes the root package's
     * direct dependencies to the top level of the tree.
     *
     * @param tree - The original dependency tree
     * @param packageName - The name of the package to check for and remove from the tree
     * @returns The extracted dependency subtree
     */
    getTreeFromWorkspaces(tree, packageName) {
        if (tree.workspaces && tree.dependencies) {
            for (const [key, value] of Object.entries(tree.dependencies)) {
                if (key === packageName) {
                    return value;
                }
            }
        }
        return tree;
    }
    transformToHoisterTree(obj, key, nodes = new Map()) {
        let node = nodes.get(key);
        const { name, version } = this.parseNameVersion(key);
        if (!node) {
            node = {
                name,
                identName: name,
                reference: version,
                dependencies: new Set(),
                peerNames: new Set(),
            };
            nodes.set(key, node);
            const deps = (obj[key] || {}).dependencies || [];
            for (const dep of deps) {
                const child = this.transformToHoisterTree(obj, dep, nodes);
                node.dependencies.add(child);
            }
        }
        return node;
    }
    async _getNodeModules(dependencies, result) {
        var _a;
        if (dependencies.size === 0) {
            return;
        }
        for (const d of dependencies.values()) {
            const reference = [...d.references][0];
            const key = `${d.name}@${reference}`;
            // Normalize the path to handle mixed separators from pnpm JSON output on Windows
            const rawPath = (_a = this.allDependencies.get(key)) === null || _a === void 0 ? void 0 : _a.path;
            const p = rawPath != null ? path.normalize(rawPath) : undefined;
            if (p === undefined) {
                this.cache.logSummary[moduleManager_1.LogMessageByKey.PKG_NOT_FOUND].push(key);
                continue;
            }
            // fix npm list issue
            // https://github.com/npm/cli/issues/8535
            if (!(await this.cache.exists[p])) {
                this.logMissingDependency(key);
                continue;
            }
            const node = {
                name: d.name,
                version: reference,
                dir: await this.cache.realPath[p],
            };
            result.push(node);
            if (d.dependencies.size > 0) {
                node.dependencies = [];
                await this._getNodeModules(d.dependencies, node.dependencies);
            }
        }
        result.sort((a, b) => a.name.localeCompare(b.name));
    }
    logMissingDependency(pkgName) {
        const PLATFORM_PACKAGE_RE = /(linux|win32|darwin|freebsd|android)[-_](x64|arm64|ia32|arm|ppc64|s390x|loong64|riscv64|universal)/;
        const diskLogKey = PLATFORM_PACKAGE_RE.test(pkgName) ? moduleManager_1.LogMessageByKey.PKG_OPTIONAL_PLATFORM_NOT_INSTALLED : moduleManager_1.LogMessageByKey.PKG_NOT_ON_DISK;
        this.cache.logSummary[diskLogKey].push(pkgName);
    }
    async asyncExec(command, args, cwd = this.rootDir) {
        const file = await this.tempDirManager.getTempFile({ prefix: "exec-", suffix: ".txt" });
        try {
            await this.streamCollectorCommandToFile(command, args, cwd, file);
            const result = await fs.readFile(file, { encoding: "utf8" });
            return { stdout: result === null || result === void 0 ? void 0 : result.trim(), stderr: undefined };
        }
        catch (error) {
            builder_util_1.log.debug({ error: error.message }, "failed to execute command");
            return { stdout: undefined, stderr: error.message };
        }
    }
    /**
     * Executes a command and streams its output to a file.
     *
     * Spawns a child process to execute the specified command with arguments, capturing stdout
     * to a file. On Windows, wraps the invocation in `powershell.exe -EncodedCommand` (UTF-16LE
     * base64) to avoid spawning `.cmd` shims directly and to eliminate shell-injection surface area.
     * Enables corepack strict mode by default but allows process.env overrides.
     *
     * Special handling for `npm list` exit code 1, which is expected in certain scenarios.
     *
     * @param command - The command to execute
     * @param args - Array of command-line arguments
     * @param cwd - The working directory to execute the command in
     * @param tempOutputFile - The path to the temporary file where stdout will be written
     * @returns Promise that resolves when the command completes successfully or rejects if it fails
     * @throws {Error} If the child process spawn fails or exits with a non-zero code
     */
    async streamCollectorCommandToFile(command, args, cwd, tempOutputFile) {
        // Derive execName from the original command so the npm-list shouldIgnore check below keys off the
        // real invocation (e.g. "npm"), not the "powershell" wrapper we spawn on Windows.
        const execName = path.basename(command, path.extname(command));
        // On Windows the package-manager command is typically a `.cmd` shim (npm.cmd/pnpm.cmd/yarn.cmd),
        // which Node can no longer spawn directly (CVE-2024-27980). Rather than spawn with `shell: true` —
        // which emits the DEP0190 "args with shell" deprecation warning and forces manual metacharacter
        // escaping — wrap the invocation in a single PowerShell `-EncodedCommand`. The base64 (UTF-16LE)
        // payload sidesteps every shell-quoting layer, and `powershell.exe` is a real executable we spawn
        // directly with no shell. See buildPowerShellEncodedArgs for the UTF-8 / exit-code handling.
        const [spawnCommand, spawnArgs] = process.platform === "win32" ? ["powershell.exe", buildPowerShellEncodedArgs(command, args)] : [command, args];
        await new Promise((resolve, reject) => {
            const outStream = (0, fs_extra_1.createWriteStream)(tempOutputFile);
            const child = childProcess.spawn(spawnCommand, spawnArgs, {
                cwd,
                // Package manager invocations do not need signing/publishing credentials.
                env: { COREPACK_ENABLE_STRICT: "0", ...(0, builder_util_1.stripSensitiveEnvVars)(process.env) },
            });
            let stderr = "";
            // The process can close before all piped stdout has been flushed to disk. Resolving on the
            // child's "close" alone races the write stream and lets the caller read a TRUNCATED file
            // (manifesting as "No JSON content found in output"). Gate the settle on BOTH the child exit
            // (for the code/stderr) and the write stream's "finish" (all bytes flushed).
            let exitCode = null;
            let childClosed = false;
            let streamFinished = false;
            let settled = false;
            // `pipe` ends `outStream` when stdout EOFs, which triggers its "finish" once flushed.
            child.stdout.pipe(outStream);
            child.stderr.on("data", chunk => {
                stderr += chunk.toString();
            });
            const fail = (err) => {
                if (settled) {
                    return;
                }
                settled = true;
                // Best-effort cleanup: stop the child and close the stream so we don't
                // waste CPU writing to a broken fd after rejection.
                try {
                    child.kill();
                }
                catch {
                    // ignore
                }
                try {
                    outStream.destroy();
                }
                catch {
                    // ignore
                }
                reject(err);
            };
            const settle = () => {
                if (settled || !childClosed || !streamFinished) {
                    return;
                }
                const code = exitCode;
                // https://github.com/npm/npm/issues/17624
                const shouldIgnore = code === 1 && "npm" === execName.toLowerCase() && args.includes("list");
                if (shouldIgnore) {
                    builder_util_1.log.debug(null, "`npm list` returned non-zero exit code, but it MIGHT be expected (https://github.com/npm/npm/issues/17624). Check stderr for details.");
                }
                if (stderr.length > 0) {
                    builder_util_1.log.debug({ stderr }, "note: there was node module collector output on stderr");
                    // Only surface stderr as a user-visible warning when the exit code itself is unexpected.
                    // When shouldIgnore is true (npm list exit code 1) the stderr is an anticipated side
                    // effect of package-manager features like yarn resolutions or npm overrides that cause
                    // npm to report ELSPROBLEMS for aliased packages it considers "invalid".
                    if (!shouldIgnore) {
                        this.cache.logSummary[moduleManager_1.LogMessageByKey.PKG_COLLECTOR_OUTPUT].push(stderr);
                    }
                }
                settled = true;
                const shouldResolve = code === 0 || shouldIgnore;
                return shouldResolve ? resolve() : reject(new Error(`Node module collector process exited with code ${code}:\n${stderr}`));
            };
            outStream.on("error", err => fail(new Error(`Node module collector failed writing output (${command}): ${err.message}`)));
            outStream.on("finish", () => {
                streamFinished = true;
                settle();
            });
            child.on("error", err => {
                fail(new Error(`Node module collector spawn (${command} ${JSON.stringify(args)}) failed: ${err.message}`));
            });
            child.on("close", code => {
                exitCode = code;
                childClosed = true;
                settle();
            });
        });
    }
}
exports.NodeModulesCollector = NodeModulesCollector;
/**
 * Build the argv for invoking a Windows command through `powershell.exe -EncodedCommand`.
 *
 * Each token is wrapped in a PowerShell single-quoted string (with embedded single quotes doubled),
 * so no character is interpreted by a shell. The script:
 *   - pins `[Console]::OutputEncoding` to UTF-8 *without* a BOM so the JSON dependency tree is not
 *     corrupted by the console's OEM code page (and no BOM is prepended to break `JSON.parse`),
 *   - invokes the command via the call operator `&`,
 *   - re-emits the command's own exit code via `exit $LASTEXITCODE` (e.g. `npm list` returns 1 in
 *     expected scenarios, which the caller's shouldIgnore logic relies on).
 *
 * The whole script is base64-encoded as UTF-16LE per PowerShell's `-EncodedCommand` contract.
 */
function buildPowerShellEncodedArgs(command, args) {
    const psQuote = (value) => `'${value.replace(/'/g, "''")}'`;
    const invocation = ["&", psQuote(command), ...args.map(psQuote)].join(" ");
    const script = `[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); ${invocation}; exit $LASTEXITCODE`;
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    return ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded];
}
//# sourceMappingURL=nodeModulesCollector.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeModuleCopyHelper = void 0;
const builder_util_1 = require("builder-util");
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const tiny_async_pool_1 = require("tiny-async-pool");
const fileMatcher_1 = require("../fileMatcher");
const AppFileWalker_1 = require("./AppFileWalker");
const resolve_1 = require("./resolve");
const excludedFiles = new Set([
    ".DS_Store",
    "node_modules" /* already in the queue */,
    "CHANGELOG.md",
    "ChangeLog",
    "changelog.md",
    "Changelog.md",
    "Changelog",
    "binding.gyp",
    ".npmignore",
    "node_gyp_bins",
].concat(fileMatcher_1.excludedNames.split(",")));
const topLevelExcludedFiles = new Set([
    "karma.conf.js",
    ".coveralls.yml",
    "README.md",
    "readme.markdown",
    "README",
    "readme.md",
    "Readme.md",
    "Readme",
    "readme",
    "test",
    "tests",
    "__tests__",
    "powered-test",
    "example",
    "examples",
    ".bin",
]);
/** @internal */
class NodeModuleCopyHelper extends AppFileWalker_1.FileCopyHelper {
    constructor(matcher, packager) {
        super(matcher, matcher.isEmpty() ? null : matcher.createFilter(), packager);
    }
    async collectNodeModules(moduleInfo, nodeModuleExcludedExts, destination) {
        var _a;
        const filter = this.filter;
        const metadata = this.metadata;
        const onNodeModuleFile = await (0, resolve_1.resolveFunction)(this.packager.appInfo.type, this.packager.config.onNodeModuleFile, "onNodeModuleFile", await this.packager.getWorkspaceRoot());
        const result = [];
        const queue = [];
        const emptyDirs = new Set();
        const symlinkFiles = new Map();
        const tmpPath = moduleInfo.dir;
        const moduleName = moduleInfo.name;
        queue.length = 1;
        // The path should be corrected in Windows that when the moduleName is Scoped packages named.
        const depPath = path.normalize(tmpPath);
        queue[0] = depPath;
        while (queue.length > 0) {
            const dirPath = queue.pop();
            const childNames = await (0, fs_extra_1.readdir)(dirPath);
            childNames.sort();
            const isTopLevel = dirPath === depPath;
            const dirs = [];
            // our handler is async, but we should add sorted files, so, we add file to result not in the mapper, but after map
            const sortedFilePaths = await (0, tiny_async_pool_1.default)(builder_util_1.MAX_FILE_REQUESTS, childNames, async (name) => {
                const filePath = path.join(dirPath, name);
                const forceIncluded = onNodeModuleFile != null && !!onNodeModuleFile(filePath);
                if (excludedFiles.has(name) || name.startsWith("._")) {
                    return null;
                }
                // check if filematcher matches the files array as more important than the default excluded files.
                const fileMatched = filter != null && filter(dirPath, (0, fs_extra_1.lstatSync)(dirPath));
                if (!fileMatched || !forceIncluded || !!this.packager.config.disableDefaultIgnoredFiles) {
                    for (const ext of nodeModuleExcludedExts) {
                        if (name.endsWith(ext)) {
                            return null;
                        }
                    }
                    // noinspection SpellCheckingInspection
                    if (isTopLevel && (topLevelExcludedFiles.has(name) || (moduleName === "libui-node" && (name === "build" || name === "docs" || name === "src")))) {
                        return null;
                    }
                    if (dirPath.endsWith("build")) {
                        if (name === "gyp-mac-tool" || name === "Makefile" || name.endsWith(".mk") || name.endsWith(".gypi") || name.endsWith(".Makefile")) {
                            return null;
                        }
                    }
                    else if (dirPath.endsWith("Release") && (name === ".deps" || name === "obj.target")) {
                        return null;
                    }
                    else if (name === "src" && (dirPath.endsWith("keytar") || dirPath.endsWith("keytar-prebuild"))) {
                        return null;
                    }
                    else if (dirPath.endsWith("lzma-native") && (name === "build" || name === "deps")) {
                        return null;
                    }
                }
                return (0, fs_extra_1.lstat)(filePath).then((stat) => {
                    stat.moduleName = moduleName;
                    stat.moduleRootPath = destination;
                    stat.moduleFullFilePath = path.join(destination, path.relative(depPath, filePath));
                    if (filter != null && !filter(filePath, stat)) {
                        return null;
                    }
                    if (!stat.isDirectory()) {
                        metadata.set(filePath, stat);
                    }
                    const consumerResult = this.handleFile(filePath, dirPath, stat);
                    if (consumerResult == null) {
                        if (stat.isDirectory()) {
                            dirs.push(name);
                            return null;
                        }
                        else {
                            return filePath;
                        }
                    }
                    else {
                        return consumerResult.then(it => {
                            // asarUtil can return modified stat (symlink handling)
                            if ((it == null ? stat : it).isDirectory()) {
                                dirs.push(name);
                                return null;
                            }
                            else {
                                return filePath;
                            }
                        });
                    }
                });
            });
            let isEmpty = true;
            for (const child of sortedFilePaths) {
                if (child != null) {
                    result.push(child);
                    if ((_a = this.metadata.get(child)) === null || _a === void 0 ? void 0 : _a.isSymbolicLink()) {
                        symlinkFiles.set(child, result.length - 1);
                    }
                    isEmpty = false;
                }
            }
            if (isEmpty) {
                emptyDirs.add(dirPath);
            }
            dirs.sort();
            for (const child of dirs) {
                queue.push(dirPath + path.sep + child);
            }
        }
        for (const [file, index] of symlinkFiles) {
            const resolvedPath = (0, fs_1.realpathSync)(file);
            if (emptyDirs.has(resolvedPath)) {
                // delete symlink file if target is a empty dir
                result[index] = undefined;
            }
        }
        return result.filter((it) => it !== undefined);
    }
}
exports.NodeModuleCopyHelper = NodeModuleCopyHelper;
//# sourceMappingURL=NodeModuleCopyHelper.js.map
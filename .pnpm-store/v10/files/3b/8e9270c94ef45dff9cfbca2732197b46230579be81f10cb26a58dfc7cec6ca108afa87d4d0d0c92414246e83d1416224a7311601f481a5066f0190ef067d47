"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USE_HARD_LINKS = exports.DO_NOT_USE_HARD_LINKS = exports.FileCopier = exports.CopyFileTransformer = exports.MAX_FILE_REQUESTS = void 0;
exports.unlinkIfExists = unlinkIfExists;
exports.statOrNull = statOrNull;
exports.exists = exists;
exports.walk = walk;
exports.copyFile = copyFile;
exports.copyOrLinkFile = copyOrLinkFile;
exports.copyDir = copyDir;
exports.dirSize = dirSize;
const fs_extra_1 = require("fs-extra");
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path = require("path");
const stat_mode_1 = require("stat-mode");
const tiny_async_pool_1 = require("tiny-async-pool");
const log_1 = require("./log");
const promise_1 = require("./promise");
exports.MAX_FILE_REQUESTS = 8;
class CopyFileTransformer {
    constructor(afterCopyTransformer) {
        this.afterCopyTransformer = afterCopyTransformer;
    }
}
exports.CopyFileTransformer = CopyFileTransformer;
function unlinkIfExists(file) {
    return (0, promises_1.unlink)(file).catch(() => {
        /* ignore */
    });
}
async function statOrNull(file) {
    return (0, promise_1.orNullIfFileNotExist)((0, promises_1.stat)(file));
}
async function exists(file) {
    try {
        await (0, promises_1.access)(file);
        return true;
    }
    catch (_e) {
        return false;
    }
}
/**
 * Returns list of file paths (system-dependent file separator)
 */
async function walk(initialDirPath, filter, consumer) {
    let result = [];
    const queue = [initialDirPath];
    let addDirToResult = false;
    const isIncludeDir = consumer == null ? false : consumer.isIncludeDir === true;
    while (queue.length > 0) {
        const dirPath = queue.pop();
        if (isIncludeDir) {
            if (addDirToResult) {
                result.push(dirPath);
            }
            else {
                addDirToResult = true;
            }
        }
        const childNames = await (0, promise_1.orIfFileNotExist)((0, promises_1.readdir)(dirPath), []);
        childNames.sort();
        let nodeModuleContent = null;
        const dirs = [];
        // our handler is async, but we should add sorted files, so, we add file to result not in the mapper, but after map
        const sortedFilePaths = await (0, tiny_async_pool_1.default)(exports.MAX_FILE_REQUESTS, childNames, async (name) => {
            if (name === ".DS_Store" || name === ".gitkeep") {
                return null;
            }
            const filePath = dirPath + path.sep + name;
            return (0, promises_1.lstat)(filePath).then(stat => {
                if (filter != null && !filter(filePath, stat)) {
                    return null;
                }
                const consumerResult = consumer == null ? null : consumer.consume(filePath, stat, dirPath, childNames);
                if (consumerResult === true) {
                    return null;
                }
                else if (consumerResult === false || consumerResult == null || !("then" in consumerResult)) {
                    if (stat.isDirectory()) {
                        dirs.push(name);
                        return null;
                    }
                    else {
                        return filePath;
                    }
                }
                else {
                    return consumerResult.then((it) => {
                        if (it != null && Array.isArray(it)) {
                            nodeModuleContent = it;
                            return null;
                        }
                        // asarUtil can return modified stat (symlink handling)
                        if ((it != null && "isDirectory" in it ? it : stat).isDirectory()) {
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
        for (const child of sortedFilePaths) {
            if (child != null) {
                result.push(child);
            }
        }
        dirs.sort();
        for (const child of dirs) {
            queue.push(dirPath + path.sep + child);
        }
        if (nodeModuleContent != null) {
            result = result.concat(nodeModuleContent);
        }
    }
    return result;
}
// performance optimization. only enable hard links during unit tests on non-Windows platforms by default
// This is to optimize disk space and speed during tests, while avoiding potential issues with hard links in distribution builds
// https://github.com/electron-userland/electron-builder/issues/5721
const _isUseHardLink = process.platform !== "win32" && (process.env.USE_HARD_LINKS === "true" || process.env.VITEST != null);
function copyFile(src, dest, isEnsureDir = true) {
    return (isEnsureDir ? (0, promises_1.mkdir)(path.dirname(dest), { recursive: true }) : Promise.resolve()).then(() => copyOrLinkFile(src, dest, null, false));
}
/**
 * Hard links is used if supported and allowed.
 * File permission is fixed — allow execute for all if owner can, allow read for all if owner can.
 *
 * ensureDir is not called, dest parent dir must exists
 */
function copyOrLinkFile(src, dest, stats, isUseHardLink, exDevErrorHandler) {
    if (isUseHardLink === undefined) {
        isUseHardLink = _isUseHardLink;
    }
    if (stats != null) {
        const originalModeNumber = stats.mode;
        const mode = new stat_mode_1.Mode(stats);
        if (mode.owner.execute) {
            mode.group.execute = true;
            mode.others.execute = true;
        }
        mode.group.read = true;
        mode.others.read = true;
        mode.setuid = false;
        mode.setgid = false;
        if (originalModeNumber !== stats.mode) {
            if (log_1.log.isDebugEnabled) {
                const oldMode = new stat_mode_1.Mode({ mode: originalModeNumber });
                log_1.log.debug({ file: dest, oldMode, mode }, "permissions fixed from");
            }
            // https://helgeklein.com/blog/2009/05/hard-links-and-permissions-acls/
            // Permissions on all hard links to the same data on disk are always identical. The same applies to attributes.
            // That means if you change the permissions/owner/attributes on one hard link, you will immediately see the changes on all other hard links.
            if (isUseHardLink) {
                isUseHardLink = false;
                log_1.log.debug({ dest }, "copied, but not linked, because file permissions need to be fixed");
            }
        }
    }
    if (isUseHardLink) {
        return (0, promises_1.link)(src, dest).catch((e) => {
            if (e.code === "EXDEV") {
                const isLog = exDevErrorHandler == null ? true : exDevErrorHandler();
                if (isLog && log_1.log.isDebugEnabled) {
                    log_1.log.debug({ error: e.message }, "cannot copy using hard link");
                }
                return doCopyFile(src, dest, stats);
            }
            else {
                throw e;
            }
        });
    }
    return doCopyFile(src, dest, stats);
}
function doCopyFile(src, dest, stats) {
    const promise = (0, fs_extra_1.copyFile)(src, dest);
    if (stats == null) {
        return promise;
    }
    return promise.then(() => (0, promises_1.chmod)(dest, stats.mode));
}
class FileCopier {
    constructor(isUseHardLinkFunction, transformer) {
        this.isUseHardLinkFunction = isUseHardLinkFunction;
        this.transformer = transformer;
        if (isUseHardLinkFunction === exports.USE_HARD_LINKS) {
            this.isUseHardLink = true;
        }
        else {
            this.isUseHardLink = _isUseHardLink && isUseHardLinkFunction !== exports.DO_NOT_USE_HARD_LINKS;
        }
    }
    async copy(src, dest, stat) {
        let afterCopyTransformer = null;
        if (this.transformer != null && stat != null && stat.isFile()) {
            let data = this.transformer(src);
            if (data != null) {
                if (typeof data === "object" && "then" in data) {
                    data = await data;
                }
                if (data != null) {
                    if (data instanceof CopyFileTransformer) {
                        afterCopyTransformer = data.afterCopyTransformer;
                    }
                    else {
                        await (0, promises_1.writeFile)(dest, data);
                        return;
                    }
                }
            }
        }
        const isUseHardLink = afterCopyTransformer == null && (!this.isUseHardLink || this.isUseHardLinkFunction == null ? this.isUseHardLink : this.isUseHardLinkFunction(dest));
        await copyOrLinkFile(src, dest, stat, isUseHardLink, isUseHardLink
            ? () => {
                // files are copied concurrently, so, we must not check here currentIsUseHardLink — our code can be executed after that other handler will set currentIsUseHardLink to false
                if (this.isUseHardLink) {
                    this.isUseHardLink = false;
                    return true;
                }
                else {
                    return false;
                }
            }
            : null);
        if (afterCopyTransformer != null) {
            await afterCopyTransformer(dest);
        }
    }
}
exports.FileCopier = FileCopier;
/**
 * Empty directories is never created.
 * Hard links is used if supported and allowed.
 */
async function copyDir(src, destination, options = {}) {
    const fileCopier = new FileCopier(options.isUseHardLink, options.transformer);
    log_1.log.debug({ src, destination }, `copying${fileCopier.isUseHardLink ? " using hard links" : ""}`);
    const createdSourceDirs = new Set();
    const links = [];
    const symlinkType = (0, os_1.platform)() === "win32" ? "junction" : "file";
    return await walk(src, options.filter, {
        consume: async (file, stat, parent) => {
            if (!stat.isFile() && !stat.isSymbolicLink()) {
                return;
            }
            if (!createdSourceDirs.has(parent)) {
                await (0, promises_1.mkdir)(parent.replace(src, destination), { recursive: true });
                createdSourceDirs.add(parent);
            }
            const destFile = file.replace(src, destination);
            if (stat.isFile()) {
                await fileCopier.copy(file, destFile, stat);
            }
            else {
                links.push({ file: destFile, link: await (0, promises_1.readlink)(file) });
            }
        },
    }).then(() => (0, tiny_async_pool_1.default)(exports.MAX_FILE_REQUESTS, links, it => (0, promises_1.symlink)(it.link, it.file, symlinkType)));
}
async function dirSize(dirPath) {
    const entries = await (0, promises_1.readdir)(dirPath, { withFileTypes: true });
    const entrySizes = entries.map(async (entry) => {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            return await dirSize(entryPath);
        }
        if (entry.isFile()) {
            const { size } = await (0, promises_1.stat)(entryPath);
            return size;
        }
        return 0;
    });
    return (await Promise.all(entrySizes)).reduce((entrySize, totalSize) => entrySize + totalSize, 0);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DO_NOT_USE_HARD_LINKS = (file) => false;
exports.DO_NOT_USE_HARD_LINKS = DO_NOT_USE_HARD_LINKS;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const USE_HARD_LINKS = (file) => true;
exports.USE_HARD_LINKS = USE_HARD_LINKS;
//# sourceMappingURL=fs.js.map
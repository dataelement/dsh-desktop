"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TmpDir = exports.getTempName = void 0;
const fs_extra_1 = require("fs-extra");
const os_1 = require("os");
const path = require("path");
let tmpFileCounter = 0;
const tmpDirManagers = new Set();
// add date to avoid use stale temp dir
const tempDirPrefix = `${process.pid.toString(36)}-${Date.now().toString(36)}`;
function getTempName(prefix) {
    return `${prefix == null ? "" : `${prefix}-`}${tempDirPrefix}-${(tmpFileCounter++).toString(36)}`;
}
exports.getTempName = getTempName;
let tempDirPromise;
let tempBaseDir;
function getBaseTempDir() {
    if (tempDirPromise != null) {
        return tempDirPromise;
    }
    if (tempBaseDir != null) {
        return Promise.resolve(tempBaseDir);
    }
    const systemTmpDir = process.env.APP_BUILDER_TMP_DIR || os_1.tmpdir();
    const isEnsureRemovedOnExit = process.env.TMP_DIR_MANAGER_ENSURE_REMOVED_ON_EXIT !== "false";
    tempDirPromise = fs_extra_1.mkdtemp(path.join(systemTmpDir, "t-"))
        .then(it => fs_extra_1.realpath(it))
        .then(dir => {
        if (isEnsureRemovedOnExit) {
            addExitHook(dir);
        }
        tempBaseDir = dir;
        return dir;
    });
    return tempDirPromise;
}
function addExitHook(dir) {
    require("async-exit-hook")((callback) => {
        const managers = Array.from(tmpDirManagers);
        tmpDirManagers.clear();
        if (callback == null) {
            for (const manager of managers) {
                manager.cleanupSync();
            }
            try {
                fs_extra_1.removeSync(dir);
            }
            catch (e) {
                handleError(e, dir);
            }
            return;
        }
        Promise.all(managers.map(it => it.cleanup()))
            .then(() => fs_extra_1.remove(dir))
            .then(() => callback())
            .catch(e => {
            try {
                handleError(e, dir);
            }
            finally {
                callback();
            }
        });
    });
}
function handleError(e, file) {
    if (e.code !== "EPERM" && e.code !== "ENOENT") {
        // use only console.* instead of our warn on exit (otherwise nodeEmoji can be required on request)
        console.warn(`Cannot delete temporary "${file}": ${(e.stack || e).toString()}`);
    }
}
class TmpDir {
    constructor(debugName = "") {
        this.debugName = debugName;
        this.tempFiles = [];
        this.registered = false;
    }
    // noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    get rootTempDir() {
        return getBaseTempDir();
    }
    getTempDir(options) {
        return this.getTempFile(options, true);
    }
    createTempDir(options) {
        return this.getTempFile(options, true)
            .then(it => fs_extra_1.ensureDir(it).then(() => it));
    }
    getTempFile(options, isDir = false) {
        return getBaseTempDir()
            .then(baseTempDir => {
            if (!this.registered) {
                this.registered = true;
                tmpDirManagers.add(this);
            }
            const prefix = nullize(options == null ? null : options.prefix);
            const suffix = nullize(options == null ? null : options.suffix);
            const namePrefix = prefix == null ? "" : `${prefix}-`;
            const nameSuffix = suffix == null ? "" : (suffix.startsWith(".") ? suffix : `-${suffix}`);
            const result = `${baseTempDir}${path.sep}${namePrefix}${(tmpFileCounter++).toString(36)}${nameSuffix}`;
            this.tempFiles.push({
                path: result,
                isDir,
                disposer: options == null ? null : options.disposer,
            });
            return result;
        });
    }
    cleanupSync() {
        const tempFiles = this.tempFiles;
        tmpDirManagers.delete(this);
        this.registered = false;
        if (tempFiles.length === 0) {
            return;
        }
        this.tempFiles = [];
        for (const file of tempFiles) {
            if (file.disposer != null) {
                // noinspection JSIgnoredPromiseFromCall
                file.disposer(file.path);
                continue;
            }
            try {
                if (file.isDir) {
                    fs_extra_1.removeSync(file.path);
                }
                else {
                    fs_extra_1.unlinkSync(file.path);
                }
            }
            catch (e) {
                handleError(e, file.path);
            }
        }
    }
    cleanup() {
        const tempFiles = this.tempFiles;
        tmpDirManagers.delete(this);
        this.registered = false;
        if (tempFiles.length === 0) {
            return Promise.resolve();
        }
        this.tempFiles = [];
        if (tmpDirManagers.size === 0) {
            const dir = tempBaseDir;
            if (dir == null) {
                return Promise.resolve();
            }
            tempBaseDir = null;
            tempDirPromise = null;
            return fs_extra_1.remove(dir);
        }
        return Promise.all(tempFiles.map(it => {
            if (it.disposer != null) {
                return it.disposer(it.path);
            }
            return (it.isDir ? fs_extra_1.remove(it.path) : fs_extra_1.unlink(it.path))
                .catch(e => {
                handleError(e, it.path);
            });
        }));
    }
    toString() {
        return this.debugName;
    }
}
exports.TmpDir = TmpDir;
function nullize(s) {
    return s == null || s.length === 0 ? null : s;
}
//# sourceMappingURL=main.js.map
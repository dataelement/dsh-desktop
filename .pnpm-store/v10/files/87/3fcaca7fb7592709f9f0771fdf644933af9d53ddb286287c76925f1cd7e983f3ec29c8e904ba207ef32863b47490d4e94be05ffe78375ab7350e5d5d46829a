"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIR_TARGET = exports.DEFAULT_TARGET = exports.Target = exports.Platform = void 0;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
class Platform {
    constructor(name, buildConfigurationKey, nodeName) {
        this.name = name;
        this.buildConfigurationKey = buildConfigurationKey;
        this.nodeName = nodeName;
    }
    toString() {
        return this.name;
    }
    createTarget(type, ...archs) {
        if (type == null && (archs == null || archs.length === 0)) {
            return new Map([[this, new Map()]]);
        }
        const archToType = new Map();
        for (const arch of archs == null || archs.length === 0 ? [(0, builder_util_1.archFromString)(process.arch)] : archs) {
            archToType.set(arch, type == null ? [] : Array.isArray(type) ? type : [type]);
        }
        return new Map([[this, archToType]]);
    }
    static current() {
        return Platform.fromString(process.platform);
    }
    static fromString(name) {
        name = name.toLowerCase();
        switch (name) {
            case Platform.MAC.nodeName:
            case Platform.MAC.name:
                return Platform.MAC;
            case Platform.WINDOWS.nodeName:
            case Platform.WINDOWS.name:
            case Platform.WINDOWS.buildConfigurationKey:
                return Platform.WINDOWS;
            case Platform.LINUX.nodeName:
                return Platform.LINUX;
            default:
                throw new Error(`Unknown platform: ${name}`);
        }
    }
}
exports.Platform = Platform;
Platform.MAC = new Platform("mac", "mac", "darwin");
Platform.LINUX = new Platform("linux", "linux", "linux");
Platform.WINDOWS = new Platform("windows", "win", "win32");
class Target {
    constructor(name, isAsyncSupported = true) {
        this.name = name;
        this.isAsyncSupported = isAsyncSupported;
        // use only for tasks that cannot be executed in parallel (such as signing on windows and hdiutil on macOS due to file locking)
        this.buildQueueManager = new builder_util_1.AsyncTaskManager(new builder_util_runtime_1.CancellationToken());
    }
    async checkOptions() {
        // ignore
    }
    async finishBuild() {
        await this.buildQueueManager.awaitTasks();
    }
}
exports.Target = Target;
exports.DEFAULT_TARGET = "default";
exports.DIR_TARGET = "dir";
//# sourceMappingURL=core.js.map
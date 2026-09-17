"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebuild = void 0;
const builder_util_1 = require("builder-util");
const cp = require("child_process");
const path = require("path");
const rebuild = async (options) => {
    var _a, _b;
    const { arch } = options;
    builder_util_1.log.info({ arch }, `installing native dependencies`);
    const child = cp.fork(path.resolve(__dirname, "../../helpers/remote-rebuild.js"), [JSON.stringify(options)], {
        stdio: ["pipe", "pipe", "pipe", "ipc"],
    });
    let pendingError;
    (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on("data", chunk => {
        builder_util_1.log.info(chunk.toString());
    });
    (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on("data", chunk => {
        builder_util_1.log.error(chunk.toString());
    });
    child.on("message", (message) => {
        var _a;
        const { moduleName, msg } = message;
        switch (msg) {
            case "module-found": {
                builder_util_1.log.info({ moduleName, arch }, "preparing");
                break;
            }
            case "module-done": {
                builder_util_1.log.info({ moduleName, arch }, "finished");
                break;
            }
            case "module-skip": {
                (_a = builder_util_1.log.debug) === null || _a === void 0 ? void 0 : _a.call(builder_util_1.log, { moduleName, arch }, "skipped. set ENV=electron-rebuild to determine why");
                break;
            }
            case "rebuild-error": {
                pendingError = new Error(message.err.message);
                pendingError.stack = message.err.stack;
                break;
            }
            case "rebuild-done": {
                builder_util_1.log.info("completed installing native dependencies");
                break;
            }
        }
    });
    await new Promise((resolve, reject) => {
        child.on("exit", code => {
            if (code === 0 && !pendingError) {
                resolve();
            }
            else {
                reject(pendingError || new Error(`Rebuilder failed with exit code: ${code}`));
            }
        });
    });
};
exports.rebuild = rebuild;
//# sourceMappingURL=rebuild.js.map
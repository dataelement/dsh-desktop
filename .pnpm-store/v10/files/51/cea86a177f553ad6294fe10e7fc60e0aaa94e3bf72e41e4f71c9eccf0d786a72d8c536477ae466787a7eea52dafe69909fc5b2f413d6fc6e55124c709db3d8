"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withToolsetLock = withToolsetLock;
const builder_util_1 = require("builder-util");
const promises_1 = require("fs/promises");
const lockfile = require("proper-lockfile");
const os = require("os");
const path = require("path");
const LOCK_FILE = path.join(os.tmpdir(), ".electron-builder-toolset.lock");
async function withToolsetLock(task) {
    await (0, promises_1.writeFile)(LOCK_FILE, "", { flag: "a" });
    const release = await lockfile.lock(LOCK_FILE, {
        retries: { retries: 100, minTimeout: 1000, maxTimeout: 5000 },
        stale: 120000,
    });
    try {
        return await task();
    }
    finally {
        await release().catch((err) => builder_util_1.log.warn({ err }, "failed to release toolset lock"));
    }
}
//# sourceMappingURL=toolsetLock.js.map
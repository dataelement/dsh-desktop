"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugLogger = void 0;
const fs_extra_1 = require("fs-extra");
const util_1 = require("./util");
const builder_util_runtime_1 = require("builder-util-runtime");
class DebugLogger {
    constructor(isEnabled = true) {
        this.isEnabled = isEnabled;
        this.data = new Map();
    }
    add(key, value) {
        if (!this.isEnabled) {
            return;
        }
        const dataPath = key.split(".");
        let o = this.data;
        let lastName = null;
        for (const p of dataPath) {
            if (p === dataPath[dataPath.length - 1]) {
                lastName = p;
                break;
            }
            else {
                if (!o.has(p)) {
                    o.set(p, new Map());
                }
                else if (typeof o.get(p) === "string") {
                    o.set(p, [o.get(p)]);
                }
                o = o.get(p);
            }
        }
        if (Array.isArray(o.get(lastName))) {
            o.set(lastName, [...o.get(lastName), value]);
        }
        else {
            o.set(lastName, value);
        }
    }
    save(file) {
        const data = (0, builder_util_runtime_1.mapToObject)(this.data);
        // toml and json doesn't correctly output multiline string as multiline
        if (this.isEnabled && Object.keys(data).length > 0) {
            return (0, fs_extra_1.outputFile)(file, (0, util_1.serializeToYaml)(data));
        }
        else {
            return Promise.resolve();
        }
    }
}
exports.DebugLogger = DebugLogger;
//# sourceMappingURL=DebugLogger.js.map
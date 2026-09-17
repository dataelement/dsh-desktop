"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdaterSignal = exports.UPDATE_DOWNLOADED = exports.DOWNLOAD_PROGRESS = exports.CancellationToken = void 0;
exports.addHandler = addHandler;
const builder_util_runtime_1 = require("builder-util-runtime");
Object.defineProperty(exports, "CancellationToken", { enumerable: true, get: function () { return builder_util_runtime_1.CancellationToken; } });
exports.DOWNLOAD_PROGRESS = "download-progress";
exports.UPDATE_DOWNLOADED = "update-downloaded";
class UpdaterSignal {
    constructor(emitter) {
        this.emitter = emitter;
    }
    /**
     * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
     */
    login(handler) {
        addHandler(this.emitter, "login", handler);
    }
    progress(handler) {
        addHandler(this.emitter, exports.DOWNLOAD_PROGRESS, handler);
    }
    updateDownloaded(handler) {
        addHandler(this.emitter, exports.UPDATE_DOWNLOADED, handler);
    }
    updateCancelled(handler) {
        addHandler(this.emitter, "update-cancelled", handler);
    }
}
exports.UpdaterSignal = UpdaterSignal;
const isLogEvent = false;
function addHandler(emitter, event, handler) {
    if (isLogEvent) {
        emitter.on(event, (...args) => {
            console.log("%s %s", event, args);
            handler(...args);
        });
    }
    else {
        emitter.on(event, handler);
    }
}
//# sourceMappingURL=types.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signWindows = signWindows;
const builder_util_1 = require("builder-util");
async function signWindows(options, packager) {
    if (options.options.azureSignOptions) {
        if (options.options.signtoolOptions) {
            builder_util_1.log.warn(null, "ignoring signtool options, using Azure Trusted Signing; please only configure one");
        }
        builder_util_1.log.info({ path: builder_util_1.log.filePath(options.path) }, "signing with Azure Trusted Signing");
    }
    else {
        builder_util_1.log.info({ path: builder_util_1.log.filePath(options.path) }, "signing with signtool.exe");
    }
    const packageManager = await packager.signingManager.value;
    return signWithRetry(async () => packageManager.signFile(options));
}
function signWithRetry(signer) {
    return (0, builder_util_1.retry)(signer, {
        retries: 3,
        interval: 1000,
        backoff: 1000,
        shouldRetry: (e) => {
            const message = e.message;
            if (
            // https://github.com/electron-userland/electron-builder/issues/1414
            (message === null || message === void 0 ? void 0 : message.includes("Couldn't resolve host name")) ||
                (
                // https://github.com/electron-userland/electron-builder/issues/8615
                message === null || message === void 0 ? void 0 : message.includes("being used by another process."))) {
                builder_util_1.log.warn({ error: message }, "attempt to sign failed, another attempt will be made");
                return true;
            }
            return false;
        },
    });
}
//# sourceMappingURL=windowsCodeSign.js.map
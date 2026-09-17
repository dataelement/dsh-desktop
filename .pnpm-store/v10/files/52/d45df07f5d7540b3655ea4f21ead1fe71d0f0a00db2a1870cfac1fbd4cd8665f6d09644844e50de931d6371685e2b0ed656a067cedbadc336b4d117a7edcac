"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hdiutilTransientExitCodes = void 0;
exports.explainHdiutilError = explainHdiutilError;
exports.hdiUtil = hdiUtil;
exports.hdiUtilWithStdin = hdiUtilWithStdin;
const builder_util_1 = require("builder-util");
/**
 * Table of hdiutil error codes that are transient and can be retried.
 * These codes are typically related to resource availability or temporary issues.
 *
| Code    | Meaning                          | Why Retry?                                           |
| ------- | -------------------------------- | ---------------------------------------------------- |
| `1`     | Generic error                    | Can occur from brief race conditions or temp issues. |
| `16`    | **Resource busy**                | Volume is in use — wait and retry often works.       |
| `35`    | **Operation timed out**          | System delay or timeout — retry after a short delay. |
| `256`   | Volume in use or unmount failure | Same as 16 — usually resolves after retry.           |
| `49153` | Volume not mounted yet           | Attach may be too fast — retry after delay.          |
| `-5341` | Disk image too small             | Retry *after fixing* with a larger `-size`.          |
| `-5342` | Specified size too small         | Same as above — retry if size is corrected.          |
 *
 */
exports.hdiutilTransientExitCodes = new Set([1, 16, 35, 256, 49153]);
function explainHdiutilError(errorCode) {
    var _a;
    const code = errorCode.toString();
    const messages = {
        "0": "Success: The hdiutil command completed without error.",
        "1": "Generic error: The operation failed, but the reason is not specific. Check command syntax or permissions.",
        "2": "No such file or directory: Check if the specified path exists.",
        "6": "Disk image to resize is not currently attached or not recognized as a valid block device by macOS.",
        "8": "Exec format error: The file might not be a valid disk image.",
        "16": "Resource busy: The volume is in use. Try closing files or processes and retry.",
        "22": "Invalid argument: One or more arguments passed to hdiutil are incorrect.",
        "35": "Operation timed out: The system was too slow or unresponsive. Try again.",
        "36": "I/O error: There was a problem reading or writing to disk. Check disk health.",
        "100": "Image-related error: The disk image may be corrupted or invalid.",
        "256": "Volume is busy or could not be unmounted. Try again after closing files.",
        "49153": "Volume not mounted yet: The image may not have been fully attached.",
        "-5341": "Disk image too small: hdiutil could not fit the contents. Increase the image size.",
        "-5342": "Specified size too small: Disk image creation failed due to insufficient size.",
    };
    return (_a = messages[code]) !== null && _a !== void 0 ? _a : `Unknown error (code ${code}): Refer to hdiutil documentation or run with -verbose for details by rerunning with env var DEBUG_DEMB=true.`;
}
const shouldRetry = (args) => (error) => {
    var _a, _b, _c;
    const code = (_a = error.code) !== null && _a !== void 0 ? _a : -1;
    const stderr = ((_b = error.stderr) === null || _b === void 0 ? void 0 : _b.toString()) || "";
    const stdout = ((_c = error.stdout) === null || _c === void 0 ? void 0 : _c.toString()) || "";
    const output = `${stdout} ${stderr}`.trim();
    const willRetry = exports.hdiutilTransientExitCodes.has(code.toString());
    builder_util_1.log.warn({ willRetry, args, code, output }, `hdiutil error: ${explainHdiutilError(code)}`);
    return willRetry;
};
async function hdiUtil(args) {
    return (0, builder_util_1.retry)(() => (0, builder_util_1.exec)("hdiutil", args), {
        retries: 5,
        interval: 5000,
        backoff: 2000,
        shouldRetry: shouldRetry(args),
    });
}
// Like hdiUtil but pipes `stdin` to the process — used for `hdiutil attach` on
// DMGs that have an embedded SLA so the prompt is auto-accepted without blocking.
async function hdiUtilWithStdin(args, stdin) {
    return (0, builder_util_1.retry)(() => (0, builder_util_1.spawnAndWriteWithOutput)("hdiutil", args, stdin).then(({ stdout }) => stdout || null), {
        retries: 5,
        interval: 5000,
        backoff: 2000,
        shouldRetry: shouldRetry(args),
    });
}
//# sourceMappingURL=hdiuil.js.map
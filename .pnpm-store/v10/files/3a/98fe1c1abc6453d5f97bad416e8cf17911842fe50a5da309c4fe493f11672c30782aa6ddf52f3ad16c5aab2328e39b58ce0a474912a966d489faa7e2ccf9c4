"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedError = void 0;
exports.printErrorAndExit = printErrorAndExit;
exports.executeFinally = executeFinally;
exports.orNullIfFileNotExist = orNullIfFileNotExist;
exports.orIfFileNotExist = orIfFileNotExist;
const chalk = require("chalk");
function printErrorAndExit(error) {
    console.error(chalk.red((error.stack || error).toString()));
    process.exit(1);
}
// you don't need to handle error in your task - it is passed only indicate status of promise
async function executeFinally(promise, task) {
    let result = null;
    try {
        result = await promise;
    }
    catch (originalError) {
        try {
            await task(true);
        }
        catch (taskError) {
            throw new NestedError([originalError, taskError]);
        }
        throw originalError;
    }
    await task(false);
    return result;
}
class NestedError extends Error {
    constructor(errors, message = "Compound error: ") {
        let m = message;
        let i = 1;
        for (const error of errors) {
            const prefix = `Error #${i++} `;
            m += `\n\n${prefix}${"-".repeat(80)}\n${error.stack}`;
        }
        super(m);
    }
}
exports.NestedError = NestedError;
function orNullIfFileNotExist(promise) {
    return orIfFileNotExist(promise, null);
}
function orIfFileNotExist(promise, fallbackValue) {
    return promise.catch((e) => {
        if (e.code === "ENOENT" || e.code === "ENOTDIR") {
            return fallbackValue;
        }
        throw e;
    });
}
//# sourceMappingURL=promise.js.map
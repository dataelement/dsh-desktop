"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFileInArchive = checkFileInArchive;
const dynamicImport_1 = require("../util/dynamicImport");
async function checkFileInArchive(asarFile, relativeFile, messagePrefix) {
    const asar = await (0, dynamicImport_1.dynamicImport)("@electron/asar");
    function error(text) {
        return new Error(`${messagePrefix} "${relativeFile}" in the "${asarFile}" ${text}`);
    }
    let stat;
    try {
        stat = asar.statFile(asarFile, relativeFile, false);
    }
    catch (e) {
        if (e.message.includes("Cannot read properties of undefined (reading 'link')")) {
            throw error("does not exist. Seems like a wrong configuration.");
        }
        throw error(`is corrupted: ${e}`);
    }
    if (stat.size === 0) {
        throw error(`is corrupted: size 0`);
    }
    return stat;
}
//# sourceMappingURL=asarFileChecker.js.map
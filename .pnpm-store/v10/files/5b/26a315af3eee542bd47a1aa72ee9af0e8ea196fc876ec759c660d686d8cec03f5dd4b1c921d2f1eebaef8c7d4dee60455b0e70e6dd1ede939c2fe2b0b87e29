"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addWinAsarIntegrity = addWinAsarIntegrity;
const builder_util_1 = require("builder-util");
const promises_1 = require("fs/promises");
const path = require("path");
const resedit_1 = require("resedit");
/** @internal */
async function addWinAsarIntegrity(executablePath, asarIntegrity) {
    const buffer = await (0, promises_1.readFile)(executablePath);
    const executable = resedit_1.NtExecutable.from(buffer);
    const resource = resedit_1.NtExecutableResource.from(executable);
    const versionInfo = resedit_1.Resource.VersionInfo.fromEntries(resource.entries);
    if (versionInfo.length !== 1) {
        throw new Error(`Failed to parse version info in ${executablePath}`);
    }
    const languages = versionInfo[0].getAllLanguagesForStringValues();
    if (languages.length !== 1) {
        throw new Error(`Failed to locate languages in ${executablePath}`);
    }
    // See: https://github.com/electron/packager/blob/00d20b99cf4aa4621103dbbd09ff7de7d2f7f539/src/resedit.ts#L124
    const integrityList = Array.from(Object.entries(asarIntegrity)).map(([file, { algorithm: alg, hash: value }]) => ({
        file: path.win32.normalize(file),
        alg,
        value,
    }));
    resource.entries.push({
        type: "INTEGRITY",
        id: "ELECTRONASAR",
        bin: Buffer.from(JSON.stringify(integrityList)),
        lang: languages[0].lang,
        codepage: languages[0].codepage,
    });
    resource.outputResource(executable);
    await (0, promises_1.writeFile)(executablePath, Buffer.from(executable.generate()));
    builder_util_1.log.info({ executablePath: builder_util_1.log.filePath(executablePath) }, "updating asar integrity executable resource");
}
//# sourceMappingURL=electronWin.js.map
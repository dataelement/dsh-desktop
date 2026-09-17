"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCertificate = importCertificate;
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const binDownload_1 = require("../binDownload");
/** @private */
async function importCertificate(cscLink, tmpDir, currentDir) {
    cscLink = cscLink.trim();
    if (cscLink.startsWith("https://")) {
        const tempFile = await tmpDir.getTempFile({ suffix: ".p12" });
        await (0, binDownload_1.download)(cscLink, tempFile);
        return tempFile;
    }
    const decoded = (0, builder_util_1.decodeCscLinkBase64)(cscLink);
    if (decoded) {
        const tempFile = await tmpDir.getTempFile({ suffix: ".p12" });
        await (0, fs_extra_1.outputFile)(tempFile, decoded);
        return tempFile;
    }
    const file = (0, builder_util_1.resolveCscLinkPath)(cscLink, currentDir);
    const stat = await (0, builder_util_1.statOrNull)(file);
    if (stat == null) {
        throw new builder_util_1.InvalidConfigurationError(`${file} doesn't exist`);
    }
    else if (!stat.isFile()) {
        throw new builder_util_1.InvalidConfigurationError(`${file} not a file`);
    }
    else {
        return file;
    }
}
//# sourceMappingURL=codesign.js.map
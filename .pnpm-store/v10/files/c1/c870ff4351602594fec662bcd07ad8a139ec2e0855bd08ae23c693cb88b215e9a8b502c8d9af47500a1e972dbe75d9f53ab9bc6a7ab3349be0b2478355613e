"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeLicensePage = computeLicensePage;
const builder_util_1 = require("builder-util");
const fs = require("fs");
const path = require("path");
const langs_1 = require("../../util/langs");
const license_1 = require("../../util/license");
const nsisUtil_1 = require("./nsisUtil");
function convertFileToUtf8WithBOMSync(filePath) {
    var _a;
    try {
        const UTF8_BOM_HEADER = Buffer.from([0xef, 0xbb, 0xbf]);
        const data = fs.readFileSync(filePath);
        // Check if the file already starts with a UTF-8 BOM
        builder_util_1.log.debug({ file: builder_util_1.log.filePath(filePath) }, "checking file for BOM header");
        if (data.length >= UTF8_BOM_HEADER.length && data.subarray(0, UTF8_BOM_HEADER.length).equals(UTF8_BOM_HEADER)) {
            builder_util_1.log.debug({ file: builder_util_1.log.filePath(filePath) }, "file is already in BOM format, skipping conversion.");
            return true;
        }
        // If not, add the BOM
        const dataWithBOM = Buffer.concat([UTF8_BOM_HEADER, data]);
        fs.writeFileSync(filePath, dataWithBOM);
        builder_util_1.log.debug({ file: builder_util_1.log.filePath(filePath) }, "file successfully converted to UTF-8 with BOM");
        return true;
    }
    catch (err) {
        builder_util_1.log.error({ file: builder_util_1.log.filePath(filePath), message: (_a = err.message) !== null && _a !== void 0 ? _a : err.stack }, "unable to convert file to UTF-8 with BOM");
        return false;
    }
}
async function computeLicensePage(packager, options, scriptGenerator, languages) {
    const license = await (0, license_1.getNotLocalizedLicenseFile)(options.license, packager);
    if (license != null) {
        let licensePage;
        if (license.endsWith(".html")) {
            licensePage = [
                "!define MUI_PAGE_CUSTOMFUNCTION_SHOW LicenseShow",
                "Function LicenseShow",
                "  FindWindow $R0 `#32770` `` $HWNDPARENT",
                "  GetDlgItem $R0 $R0 1000",
                "EmbedHTML::Load /replace $R0 file://$PLUGINSDIR\\license.html",
                "FunctionEnd",
                `!insertmacro MUI_PAGE_LICENSE "${path.join(nsisUtil_1.nsisTemplatesDir, "empty-license.txt")}"`,
            ];
        }
        else {
            licensePage = [`!insertmacro MUI_PAGE_LICENSE "${license}"`];
        }
        scriptGenerator.macro("licensePage", licensePage);
        if (license.endsWith(".html")) {
            scriptGenerator.macro("addLicenseFiles", [`File /oname=$PLUGINSDIR\\license.html "${license}"`]);
        }
        return;
    }
    const licenseFiles = await (0, license_1.getLicenseFiles)(packager);
    if (licenseFiles.length === 0) {
        return;
    }
    const licensePage = [];
    const unspecifiedLangs = new Set(languages);
    let defaultFile = null;
    for (const item of licenseFiles) {
        unspecifiedLangs.delete(item.langWithRegion);
        convertFileToUtf8WithBOMSync(item.file);
        if (defaultFile == null) {
            defaultFile = item.file;
        }
        licensePage.push(`LicenseLangString MUILicense ${langs_1.lcid[item.langWithRegion] || item.lang} "${item.file}"`);
    }
    for (const l of unspecifiedLangs) {
        licensePage.push(`LicenseLangString MUILicense ${langs_1.lcid[l]} "${defaultFile}"`);
    }
    licensePage.push('!insertmacro MUI_PAGE_LICENSE "$(MUILicense)"');
    scriptGenerator.macro("licensePage", licensePage);
}
//# sourceMappingURL=nsisLicense.js.map
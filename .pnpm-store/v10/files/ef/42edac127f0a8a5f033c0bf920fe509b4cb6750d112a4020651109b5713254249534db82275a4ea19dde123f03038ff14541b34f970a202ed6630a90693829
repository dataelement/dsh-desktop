"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editWindowsResources = editWindowsResources;
const builder_util_1 = require("builder-util");
const promises_1 = require("fs/promises");
const resedit_1 = require("resedit");
async function editWindowsResources(opts) {
    const buffer = await (0, promises_1.readFile)(opts.file);
    const executable = resedit_1.NtExecutable.from(buffer);
    const res = resedit_1.NtExecutableResource.from(executable);
    const viList = resedit_1.Resource.VersionInfo.fromEntries(res.entries);
    // Mirror rcedit: create version info from scratch if none exists; use first if multiple
    const vi = viList.length > 0 ? viList[0] : resedit_1.Resource.VersionInfo.createEmpty();
    // Mirror rcedit: default to en-US (1033) if no languages present; use first if multiple
    const languages = vi.getAllLanguagesForStringValues();
    const lang = languages.length > 0 ? languages[0] : { lang: 0x0409, codepage: 1200 };
    vi.setStringValues(lang, opts.versionStrings);
    vi.setFileVersion(opts.fileVersion);
    vi.setProductVersion(opts.productVersion);
    // resedit normalizes the string to 4-part numeric; restore the original (e.g. "1.1.0" or "3.0.0-beta.2")
    vi.setStringValues(lang, { FileVersion: opts.fileVersion });
    vi.outputToResourceEntries(res.entries);
    if (opts.iconPath) {
        const iconBuf = await (0, promises_1.readFile)(opts.iconPath);
        const iconFile = resedit_1.Data.IconFile.from(iconBuf);
        resedit_1.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, lang.lang, iconFile.icons.map(i => i.data));
    }
    if (opts.requestedExecutionLevel && opts.requestedExecutionLevel !== "asInvoker") {
        patchManifestExecutionLevel(res, opts.requestedExecutionLevel, opts.file);
    }
    res.outputResource(executable);
    await (0, promises_1.writeFile)(opts.file, Buffer.from(executable.generate()));
}
function patchManifestExecutionLevel(res, level, file) {
    const manifestEntry = res.entries.find(e => e.type === 24 && e.id === 1);
    if (!manifestEntry) {
        builder_util_1.log.warn({ file }, "no RT_MANIFEST resource found; requestedExecutionLevel will not be applied");
        return;
    }
    const originalXml = Buffer.from(manifestEntry.bin).toString("utf-8");
    const updatedXml = originalXml.replace(/(<requestedExecutionLevel[^>]*\blevel=")[^"]*(")/i, `$1${level}$2`);
    if (updatedXml === originalXml) {
        builder_util_1.log.warn({ file, requestedExecutionLevel: level }, "requestedExecutionLevel node not found in manifest; execution level not updated");
        return;
    }
    const newBuf = Buffer.from(updatedXml, "utf-8");
    manifestEntry.bin = newBuf.buffer.slice(newBuf.byteOffset, newBuf.byteOffset + newBuf.byteLength);
}
//# sourceMappingURL=resEdit.js.map
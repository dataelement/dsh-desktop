"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeCscLinkBase64 = decodeCscLinkBase64;
exports.resolveCscLinkPath = resolveCscLinkPath;
exports.loadCscLink = loadCscLink;
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path = require("path");
const fs_1 = require("./fs");
/** Decodes a base64 CSC link to a Buffer, or returns null if the value is not base64. */
function decodeCscLinkBase64(link) {
    var _a;
    const mimeMatch = /^data:.*;base64,/.exec(link);
    if (mimeMatch || link.length > 2048 || link.endsWith("=")) {
        return Buffer.from(link.substring((_a = mimeMatch === null || mimeMatch === void 0 ? void 0 : mimeMatch[0].length) !== null && _a !== void 0 ? _a : 0), "base64");
    }
    return null;
}
/** Resolves a CSC link file path, expanding `~/`, `file://`, and relative paths against `cwd`. */
function resolveCscLinkPath(cscLink, resourcesDir) {
    let link = cscLink;
    let baseDir = resourcesDir;
    const filePrefix = "file://";
    if (link.startsWith("~/")) {
        baseDir = (0, os_1.homedir)();
        link = link.slice(2);
    }
    else if (cscLink.startsWith(filePrefix)) {
        link = cscLink.slice(filePrefix.length);
    }
    if (path.isAbsolute(link)) {
        return link;
    }
    if (baseDir == null) {
        // No base directory to resolve relative path against
        throw new Error(`CSC link is a relative path but no resourcesDir provided: ${cscLink}`);
    }
    return path.resolve(baseDir, link);
}
/**
 * Resolves a CSC link to its text content.
 *
 * Formats accepted:
 * - Base64: detected by `data:…;base64,` prefix, length > 2048, or trailing `=`
 * - File path: `~/…`, `file://…`, absolute, or relative to `cwd`
 */
async function loadCscLink(link, resourcesDir) {
    const trimmed = link.trim();
    const decoded = decodeCscLinkBase64(trimmed);
    if (decoded) {
        return decoded.toString("utf8");
    }
    const filePath = resolveCscLinkPath(trimmed, resourcesDir);
    const stat = await (0, fs_1.statOrNull)(filePath);
    if (stat == null) {
        throw new Error(`${filePath} doesn't exist`);
    }
    else if (!stat.isFile()) {
        throw new Error(`${filePath} not a file`);
    }
    return (0, promises_1.readFile)(filePath, "utf8");
}
//# sourceMappingURL=cscLink.js.map
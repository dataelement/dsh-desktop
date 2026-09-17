"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUrl = void 0;
exports.getTemplatePath = getTemplatePath;
exports.getVendorPath = getVendorPath;
const path = require("path");
const root = path.join(__dirname, "..", "..");
function getTemplatePath(file) {
    return path.join(root, "templates", file);
}
function getVendorPath(file) {
    return file == null ? path.join(root, "vendor") : path.join(root, "vendor", file);
}
const parseUrl = (url) => {
    try {
        return new URL(url);
    }
    catch {
        return undefined;
    }
};
exports.parseUrl = parseUrl;
//# sourceMappingURL=pathManager.js.map
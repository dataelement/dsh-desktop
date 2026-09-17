"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePlistFile = savePlistFile;
exports.parsePlistFile = parsePlistFile;
const plist_1 = require("plist");
const fs = require("fs/promises");
function sortObjectKeys(obj) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }
    const result = {};
    Object.keys(obj)
        .sort()
        .forEach(key => {
        result[key] = sortObjectKeys(obj[key]);
    });
    return result;
}
async function savePlistFile(path, data) {
    const sortedData = sortObjectKeys(data);
    const plist = (0, plist_1.build)(sortedData);
    await fs.writeFile(path, plist);
}
async function parsePlistFile(file) {
    const data = await fs.readFile(file, "utf8");
    return (0, plist_1.parse)(data);
}
//# sourceMappingURL=plist.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashFile = hashFile;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
function hashFile(file, algorithm = "sha512", encoding = "base64", options) {
    return new Promise((resolve, reject) => {
        const hash = (0, crypto_1.createHash)(algorithm);
        hash.on("error", reject).setEncoding(encoding);
        (0, fs_1.createReadStream)(file, { ...options, highWaterMark: 1024 * 1024 /* better to use more memory but hash faster */ })
            .on("error", reject)
            .on("end", () => {
            hash.end();
            resolve(hash.read());
        })
            .pipe(hash, { end: false });
    });
}
//# sourceMappingURL=hash.js.map
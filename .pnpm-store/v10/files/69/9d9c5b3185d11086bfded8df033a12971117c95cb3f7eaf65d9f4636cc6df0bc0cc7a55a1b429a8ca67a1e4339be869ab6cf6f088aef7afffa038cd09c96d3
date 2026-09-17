"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var derUtil_js_1 = require("./derUtil.js");
var DigestInfo = /** @class */ (function () {
    function DigestInfo(digestAlgorithm, digest) {
        this.digestAlgorithm = digestAlgorithm;
        this.digest = digest;
    }
    DigestInfo.prototype.toDER = function () {
        var digest = this.digest;
        var digestArray;
        if ('buffer' in digest) {
            digestArray = new Uint8Array(digest.buffer, digest.byteOffset, digest.byteLength);
        }
        else {
            digestArray = new Uint8Array(digest);
        }
        var derData = this.digestAlgorithm
            .toDER()
            .concat(derUtil_js_1.makeDEROctetString(digestArray));
        return derUtil_js_1.makeDERSequence(derData);
    };
    return DigestInfo;
}());
exports.default = DigestInfo;

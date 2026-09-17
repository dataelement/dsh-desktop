"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var derUtil_js_1 = require("./derUtil.js");
var SignerInfo = /** @class */ (function () {
    function SignerInfo(version, issuerAndSerialNumber, digestAlgorithm, digestEncryptionAlgorithm, encryptedDigest, authenticatedAttributes, unauthenticatedAttributes) {
        this.version = version;
        this.issuerAndSerialNumber = issuerAndSerialNumber;
        this.digestAlgorithm = digestAlgorithm;
        this.digestEncryptionAlgorithm = digestEncryptionAlgorithm;
        this.encryptedDigest = encryptedDigest;
        this.authenticatedAttributes = authenticatedAttributes;
        this.unauthenticatedAttributes = unauthenticatedAttributes;
    }
    SignerInfo.prototype.toDER = function () {
        var r = [0x02, 0x01, this.version & 0xff]
            .concat(this.issuerAndSerialNumber.toDER())
            .concat(this.digestAlgorithm.toDER());
        if (this.authenticatedAttributes &&
            this.authenticatedAttributes.length > 0) {
            var a = derUtil_js_1.arrayToDERSet(this.authenticatedAttributes);
            // [0] IMPLICIT
            a[0] = 0xa0;
            r = r.concat(a);
        }
        r = r
            .concat(this.digestEncryptionAlgorithm.toDER())
            .concat(derUtil_js_1.makeDEROctetString(this.encryptedDigest));
        if (this.unauthenticatedAttributes &&
            this.unauthenticatedAttributes.length > 0) {
            var u = derUtil_js_1.arrayToDERSet(this.unauthenticatedAttributes);
            // [1] IMPLICIT
            u[0] = 0xa1;
            r = r.concat(u);
        }
        return derUtil_js_1.makeDERSequence(r);
    };
    return SignerInfo;
}());
exports.default = SignerInfo;

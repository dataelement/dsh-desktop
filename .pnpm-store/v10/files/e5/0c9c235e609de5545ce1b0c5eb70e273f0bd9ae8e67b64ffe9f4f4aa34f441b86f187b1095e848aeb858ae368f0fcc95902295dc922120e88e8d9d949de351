"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var derUtil_js_1 = require("./derUtil.js");
var SignedData = /** @class */ (function () {
    function SignedData(version, digestAlgorithms, contentInfo, signerInfos, certificates, crls) {
        this.version = version;
        this.digestAlgorithms = digestAlgorithms;
        this.contentInfo = contentInfo;
        this.signerInfos = signerInfos;
        this.certificates = certificates;
        this.crls = crls;
    }
    SignedData.prototype.toDER = function () {
        var r = [0x02, 0x01, this.version & 0xff]
            .concat(derUtil_js_1.arrayToDERSet(this.digestAlgorithms))
            .concat(this.contentInfo.toDER());
        if (this.certificates && this.certificates.length > 0) {
            var allCertsDER = derUtil_js_1.arrayToDERSet(this.certificates);
            // IMPLICIT SET
            allCertsDER[0] = 0xa0;
            r = r.concat(allCertsDER);
        }
        if (this.crls) {
            r = r.concat(derUtil_js_1.makeDERTaggedData(1, derUtil_js_1.arrayToDERSet(this.crls)));
        }
        r = r.concat(derUtil_js_1.arrayToDERSet(this.signerInfos));
        return derUtil_js_1.makeDERSequence(r);
    };
    return SignedData;
}());
exports.default = SignedData;

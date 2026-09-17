import { arrayToDERSet, makeDERSequence, makeDERTaggedData, } from './derUtil.js';
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
            .concat(arrayToDERSet(this.digestAlgorithms))
            .concat(this.contentInfo.toDER());
        if (this.certificates && this.certificates.length > 0) {
            var allCertsDER = arrayToDERSet(this.certificates);
            // IMPLICIT SET
            allCertsDER[0] = 0xa0;
            r = r.concat(allCertsDER);
        }
        if (this.crls) {
            r = r.concat(makeDERTaggedData(1, arrayToDERSet(this.crls)));
        }
        r = r.concat(arrayToDERSet(this.signerInfos));
        return makeDERSequence(r);
    };
    return SignedData;
}());
export default SignedData;

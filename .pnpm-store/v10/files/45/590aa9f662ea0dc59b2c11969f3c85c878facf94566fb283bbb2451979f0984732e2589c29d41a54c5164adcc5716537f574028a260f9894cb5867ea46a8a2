import { makeDERSequence, makeDEROctetString } from './derUtil.js';
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
            .concat(makeDEROctetString(digestArray));
        return makeDERSequence(derData);
    };
    return DigestInfo;
}());
export default DigestInfo;

import { makeDERSequence } from './derUtil.js';
var IssuerAndSerialNumber = /** @class */ (function () {
    function IssuerAndSerialNumber(issuer, serialNumber) {
        this.issuer = issuer;
        this.serialNumber = serialNumber;
    }
    IssuerAndSerialNumber.prototype.toDER = function () {
        return makeDERSequence(this.issuer.toDER().concat(this.serialNumber.toDER()));
    };
    return IssuerAndSerialNumber;
}());
export default IssuerAndSerialNumber;

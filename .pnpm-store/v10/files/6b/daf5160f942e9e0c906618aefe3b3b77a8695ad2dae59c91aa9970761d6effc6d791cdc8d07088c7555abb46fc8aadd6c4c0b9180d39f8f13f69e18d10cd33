"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var derUtil_js_1 = require("./derUtil.js");
var IssuerAndSerialNumber = /** @class */ (function () {
    function IssuerAndSerialNumber(issuer, serialNumber) {
        this.issuer = issuer;
        this.serialNumber = serialNumber;
    }
    IssuerAndSerialNumber.prototype.toDER = function () {
        return derUtil_js_1.makeDERSequence(this.issuer.toDER().concat(this.serialNumber.toDER()));
    };
    return IssuerAndSerialNumber;
}());
exports.default = IssuerAndSerialNumber;

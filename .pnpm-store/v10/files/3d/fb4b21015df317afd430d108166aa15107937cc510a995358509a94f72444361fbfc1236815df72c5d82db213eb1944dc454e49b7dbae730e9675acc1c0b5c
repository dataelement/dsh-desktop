"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var derUtil_js_1 = require("./derUtil.js");
var AlgorithmIdentifier = /** @class */ (function () {
    function AlgorithmIdentifier(algorithm) {
        this.algorithm = algorithm;
    }
    AlgorithmIdentifier.prototype.toDER = function () {
        var r = this.algorithm.toDER();
        return derUtil_js_1.makeDERSequence(r.concat(
        // parameters is not used now
        [0x05, 0x00]));
    };
    return AlgorithmIdentifier;
}());
exports.default = AlgorithmIdentifier;

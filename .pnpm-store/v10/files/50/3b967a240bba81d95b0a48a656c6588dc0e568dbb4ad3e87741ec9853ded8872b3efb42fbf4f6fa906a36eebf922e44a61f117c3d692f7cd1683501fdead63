import { makeDERSequence } from './derUtil.js';
var AlgorithmIdentifier = /** @class */ (function () {
    function AlgorithmIdentifier(algorithm) {
        this.algorithm = algorithm;
    }
    AlgorithmIdentifier.prototype.toDER = function () {
        var r = this.algorithm.toDER();
        return makeDERSequence(r.concat(
        // parameters is not used now
        [0x05, 0x00]));
    };
    return AlgorithmIdentifier;
}());
export default AlgorithmIdentifier;

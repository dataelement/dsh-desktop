import { makeDERSequence, arrayToDERSet } from './derUtil.js';
var Attribute = /** @class */ (function () {
    function Attribute(attrType, attrValues) {
        this.attrType = attrType;
        this.attrValues = attrValues;
    }
    Attribute.prototype.toDER = function () {
        return makeDERSequence(this.attrType.toDER().concat(arrayToDERSet(this.attrValues)));
    };
    return Attribute;
}());
export default Attribute;

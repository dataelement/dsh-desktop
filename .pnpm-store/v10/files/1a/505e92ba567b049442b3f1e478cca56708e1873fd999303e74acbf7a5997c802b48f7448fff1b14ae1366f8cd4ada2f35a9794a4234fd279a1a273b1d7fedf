"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var derUtil_js_1 = require("./derUtil.js");
var Attribute = /** @class */ (function () {
    function Attribute(attrType, attrValues) {
        this.attrType = attrType;
        this.attrValues = attrValues;
    }
    Attribute.prototype.toDER = function () {
        return derUtil_js_1.makeDERSequence(this.attrType.toDER().concat(derUtil_js_1.arrayToDERSet(this.attrValues)));
    };
    return Attribute;
}());
exports.default = Attribute;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var derUtil_js_1 = require("./derUtil.js");
var ObjectIdentifier = /** @class */ (function () {
    function ObjectIdentifier(value) {
        if (typeof value === 'string') {
            this.value = value.split(/\./g).map(function (s) { return Number(s); });
        }
        else {
            this.value = value;
        }
    }
    ObjectIdentifier.prototype.toDER = function () {
        var id = this.value;
        var r = [];
        if (id.length < 2) {
            throw new Error("Unexpected 'value' field");
        }
        // first byte will be (x * 40 + y) for 'x.y.****'
        r.push(id[0] * 40 + id[1]);
        for (var i = 2; i < id.length; ++i) {
            // store as variable-length value
            var val = id[i];
            var isFirst = true;
            var insertPos = r.length;
            while (true) {
                var v = val & 0x7f;
                if (!isFirst) {
                    v += 0x80;
                }
                r.splice(insertPos, 0, v);
                if (val < 0x80) {
                    break;
                }
                isFirst = false;
                val = Math.floor(val / 0x80);
            }
        }
        return [0x06].concat(derUtil_js_1.makeDERLength(r.length)).concat(r);
    };
    return ObjectIdentifier;
}());
exports.default = ObjectIdentifier;

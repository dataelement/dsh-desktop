"use strict";
// StringTable entry:
//   16-times of {<WORD length> [<UTF-16 string>]}
Object.defineProperty(exports, "__esModule", { value: true });
var StringTableItem = /** @class */ (function () {
    function StringTableItem() {
        this.length = 16;
        this._a = [];
        this._a.length = 16;
        for (var i = 0; i < 16; ++i) {
            this._a[i] = '';
        }
    }
    StringTableItem.fromEntry = function (bin, offset, byteLength) {
        var view = new DataView(bin, offset, byteLength);
        var ret = new StringTableItem();
        var o = 0;
        for (var i = 0; i < 16; ++i) {
            var len = view.getUint16(o, true);
            o += 2;
            var s = '';
            for (var j = 0; j < len; ++j) {
                s += String.fromCharCode(view.getUint16(o, true));
                o += 2;
            }
            ret._a[i] = s;
        }
        return ret;
    };
    StringTableItem.prototype.get = function (index) {
        var value = this._a[index];
        return value != null && value !== '' ? value : null;
    };
    StringTableItem.prototype.getAll = function () {
        return this._a.map(function (s) { return s || null; });
    };
    StringTableItem.prototype.set = function (index, val) {
        this._a[index] = ("" + (val !== null && val !== void 0 ? val : '')).substr(0, 4097); // length must be no longer than 4097
    };
    StringTableItem.prototype.calcByteLength = function () {
        var len = 0;
        for (var i = 0; i < 16; ++i) {
            var item = this._a[i];
            len += 2;
            if (item != null) {
                len += 2 * item.length; // UTF-16 length
            }
        }
        // 16 alignment
        return Math.floor((len + 15) / 16) * 16;
    };
    StringTableItem.prototype.generate = function (bin, offset) {
        var out = new DataView(bin, offset);
        var len = 0;
        for (var i = 0; i < 16; ++i) {
            var s = this._a[i];
            var l = s == null ? 0 : s.length > 4097 ? 4097 : s.length;
            out.setUint16(len, l, true);
            len += 2;
            if (s != null) {
                for (var j = 0; j < l; ++j) {
                    // output as UTF-16
                    out.setUint16(len, s.charCodeAt(j), true);
                    len += 2;
                }
            }
        }
        // 16 alignment
        return Math.floor((len + 15) / 16) * 16;
    };
    return StringTableItem;
}());
exports.default = StringTableItem;

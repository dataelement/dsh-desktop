import { allocatePartialBinary } from '../util/functions.js';
/**
 * Represents the raw-graphic icon item, such as PNG data.
 */
var RawIconItem = /** @class */ (function () {
    function RawIconItem(bin, width, height, bitCount, byteOffset, byteLength) {
        this.width = width;
        this.height = height;
        this.bitCount = bitCount;
        if (typeof byteOffset !== 'number') {
            byteOffset = 0;
            byteLength = bin.byteLength;
        }
        else if (typeof byteLength !== 'number') {
            byteLength = bin.byteLength - byteOffset;
        }
        this.bin = allocatePartialBinary(bin, byteOffset, byteLength);
    }
    RawIconItem.from = function (bin, width, height, bitCount, byteOffset, byteLength) {
        return new RawIconItem(bin, width, height, bitCount, byteOffset, byteLength);
    };
    RawIconItem.prototype.isIcon = function () {
        return false;
    };
    RawIconItem.prototype.isRaw = function () {
        return true;
    };
    return RawIconItem;
}());
export default RawIconItem;

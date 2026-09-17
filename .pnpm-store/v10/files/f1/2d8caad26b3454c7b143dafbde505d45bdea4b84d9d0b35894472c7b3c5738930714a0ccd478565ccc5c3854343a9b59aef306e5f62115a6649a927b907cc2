import { allocatePartialBinary, copyBuffer, createDataView, readInt32WithLastOffset, readUint8WithLastOffset, readUint16WithLastOffset, readUint32WithLastOffset, roundUp, } from '../util/functions.js';
function calcMaskSize(width, height) {
    // round up to 4 bytes (32 bit)
    // (mask pixels is 1-bit bitmap)
    var actualWidthBytes = roundUp(Math.abs(width), 32) / 8;
    return actualWidthBytes * Math.abs(height);
}
var IconItem = /** @class */ (function () {
    function IconItem(width, height, bin, byteOffset, byteLength) {
        var view = createDataView(bin, byteOffset, byteLength);
        var totalSize = view.byteLength;
        var headerSize = view.getUint32(0, true);
        if (headerSize > totalSize) {
            headerSize = totalSize;
        }
        var sizeImage = readUint32WithLastOffset(view, 20, headerSize);
        var bi = {
            width: readInt32WithLastOffset(view, 4, headerSize),
            height: readInt32WithLastOffset(view, 8, headerSize),
            planes: readUint16WithLastOffset(view, 12, headerSize),
            bitCount: readUint16WithLastOffset(view, 14, headerSize),
            compression: readUint32WithLastOffset(view, 16, headerSize),
            sizeImage: sizeImage,
            xPelsPerMeter: readInt32WithLastOffset(view, 24, headerSize),
            yPelsPerMeter: readInt32WithLastOffset(view, 28, headerSize),
            colorUsed: readUint32WithLastOffset(view, 32, headerSize),
            colorImportant: readUint32WithLastOffset(view, 36, headerSize),
            colors: [],
        };
        var offset = 40;
        var colors = bi.colorUsed;
        if (!colors) {
            switch (bi.bitCount) {
                case 1:
                    colors = 2;
                    break;
                case 4:
                    colors = 16;
                    break;
                case 8:
                    colors = 256;
                    break;
            }
        }
        for (var i = 0; i < colors; ++i) {
            bi.colors.push({
                b: readUint8WithLastOffset(view, offset, totalSize),
                g: readUint8WithLastOffset(view, offset + 1, totalSize),
                r: readUint8WithLastOffset(view, offset + 2, totalSize),
            });
            offset += 4;
        }
        this.width = width;
        this.height = height;
        this.bitmapInfo = bi;
        // round up to 4 bytes (32 bit)
        var widthBytes = roundUp(bi.bitCount * Math.abs(bi.width), 32) / 8;
        var absActualHeight = Math.abs(bi.height) / 2;
        // sizeImage may be weird if compression is 0 (BI_RGB), so
        // we calculate actual bitmap size from width and height
        var size = bi.compression !== 0 && sizeImage !== 0
            ? sizeImage
            : widthBytes * absActualHeight;
        if (size + offset > totalSize) {
            throw new Error("Unexpected bitmap data in icon: bitmap size " + size + " is larger than " + totalSize + " - " + offset);
        }
        this._pixels = allocatePartialBinary(view, offset, size);
        offset += size;
        var maskSize = calcMaskSize(bi.width, absActualHeight);
        if (maskSize + offset <= totalSize) {
            this.masks = allocatePartialBinary(view, offset, maskSize);
        }
        else {
            // create a zero buffer (no mask is not allowed)
            this.masks = new ArrayBuffer(maskSize);
        }
    }
    Object.defineProperty(IconItem.prototype, "pixels", {
        /**
         * Bitmap pixel data.
         * @note
         * On set, if `bitmapInfo.sizeImage` is non-zero, `bitmapInfo.sizeImage` will be updated.
         */
        get: function () {
            return this._pixels;
        },
        /**
         * Bitmap pixel data.
         * @note
         * On set, if `bitmapInfo.sizeImage` is non-zero, `bitmapInfo.sizeImage` will be updated.
         */
        set: function (newValue) {
            this._pixels = newValue;
            if (this.bitmapInfo.sizeImage !== 0) {
                this.bitmapInfo.sizeImage = newValue.byteLength;
            }
        },
        enumerable: false,
        configurable: true
    });
    IconItem.from = function (arg1, arg2, arg3, byteOffset, byteLength) {
        var width;
        var height;
        var bin;
        if (typeof arg3 === 'object') {
            // second overload
            width = arg1;
            height = arg2;
            bin = arg3;
        }
        else {
            // first overload
            width = null;
            height = null;
            bin = arg1;
            byteOffset = arg2;
            byteLength = arg3;
        }
        return new IconItem(width, height, bin, byteOffset, byteLength);
    };
    IconItem.prototype.isIcon = function () {
        return true;
    };
    IconItem.prototype.isRaw = function () {
        return false;
    };
    IconItem.prototype.generate = function () {
        var bi = this.bitmapInfo;
        var absWidth = Math.abs(bi.width);
        // round up to 4 bytes (32 bit)
        var absWidthBytes = roundUp(bi.bitCount * absWidth, 32) / 8;
        var absActualHeight = Math.abs(bi.height) / 2;
        var actualSizeImage = absWidthBytes * absActualHeight;
        var sizeMask = calcMaskSize(bi.width, absActualHeight);
        var colorCount = bi.colors.length;
        var totalSize = 40 + 4 * colorCount + actualSizeImage + sizeMask;
        var bin = new ArrayBuffer(totalSize);
        var view = new DataView(bin);
        view.setUint32(0, 40, true);
        view.setInt32(4, bi.width, true);
        view.setInt32(8, bi.height, true);
        view.setUint16(12, bi.planes, true);
        view.setUint16(14, bi.bitCount, true);
        view.setUint32(16, bi.compression, true);
        // image size
        view.setUint32(20, bi.sizeImage, true);
        view.setInt32(24, bi.xPelsPerMeter, true);
        view.setInt32(28, bi.yPelsPerMeter, true);
        view.setUint32(32, bi.colorUsed, true);
        view.setUint32(36, bi.colorImportant > colorCount ? colorCount : bi.colorImportant, true);
        var offset = 40;
        bi.colors.forEach(function (c) {
            view.setUint8(offset, c.b);
            view.setUint8(offset + 1, c.g);
            view.setUint8(offset + 2, c.r);
            offset += 4;
        });
        copyBuffer(bin, offset, this.pixels, 0, actualSizeImage);
        copyBuffer(bin, offset + actualSizeImage, this.masks, 0, sizeMask);
        return bin;
    };
    return IconItem;
}());
export default IconItem;

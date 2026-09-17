import IconItem from './IconItem.js';
import RawIconItem from './RawIconItem.js';
import { readUint8WithLastOffset, readUint16WithLastOffset, readUint32WithLastOffset, copyBuffer, createDataView, } from '../util/functions.js';
function generateEntryBinary(icons) {
    var count = icons.length;
    /* istanbul ignore if */
    if (count > 65535) {
        count = 65535;
    }
    var tmpIcons = icons.map(function (item) {
        if (item.data.isIcon()) {
            return {
                item: item,
                bin: item.data.generate(),
                offset: 0,
            };
        }
        else {
            return {
                item: item,
                bin: item.data.bin,
                offset: 0,
            };
        }
    });
    var size = tmpIcons.reduce(function (p, icon) {
        icon.offset = p;
        return p + icon.bin.byteLength;
    }, 6 + 16 * count);
    var bin = new ArrayBuffer(size);
    var view = new DataView(bin);
    view.setUint16(0, 0, true); // reserved
    view.setUint16(2, 1, true); // icon type
    view.setUint16(4, count, true);
    var offset = 6;
    tmpIcons.forEach(function (icon) {
        var item = icon.item;
        var width;
        var height;
        var colors;
        var planes;
        var bitCount;
        if (item.data.isIcon()) {
            var bi = item.data.bitmapInfo;
            width =
                typeof item.width !== 'undefined'
                    ? item.width
                    : Math.abs(bi.width);
            height =
                typeof item.height !== 'undefined'
                    ? item.height
                    : Math.abs(bi.height / 2);
            colors =
                typeof item.colors !== 'undefined'
                    ? item.colors
                    : bi.colorUsed || bi.colors.length;
            planes =
                typeof item.planes !== 'undefined' ? item.planes : bi.planes;
            bitCount =
                typeof item.bitCount !== 'undefined'
                    ? item.bitCount
                    : bi.bitCount;
        }
        else {
            width =
                typeof item.width !== 'undefined'
                    ? item.width
                    : Math.abs(item.data.width);
            height =
                typeof item.height !== 'undefined'
                    ? item.height
                    : Math.abs(item.data.height);
            colors = typeof item.colors !== 'undefined' ? item.colors : 0;
            planes = typeof item.planes !== 'undefined' ? item.planes : 1;
            bitCount =
                typeof item.bitCount !== 'undefined'
                    ? item.bitCount
                    : item.data.bitCount;
        }
        var dataSize = icon.bin.byteLength;
        view.setUint8(offset, width >= 256 ? 0 : width);
        view.setUint8(offset + 1, height >= 256 ? 0 : height);
        view.setUint8(offset + 2, colors >= 256 ? 0 : colors);
        view.setUint8(offset + 3, 0);
        view.setUint16(offset + 4, planes, true);
        view.setUint16(offset + 6, bitCount, true);
        view.setUint32(offset + 8, dataSize, true);
        view.setUint32(offset + 12, icon.offset, true);
        offset += 16;
        copyBuffer(bin, icon.offset, icon.bin, 0, dataSize);
    });
    return bin;
}
var IconFile = /** @class */ (function () {
    function IconFile(bin) {
        if (!bin) {
            this.icons = [];
            return;
        }
        var view = createDataView(bin);
        var totalSize = view.byteLength;
        var icons = [];
        /* istanbul ignore else */
        if (view.getUint16(2, true) === 1) {
            var count = view.getUint16(4, true);
            var offset = 6;
            for (var i = 0; i < count; ++i) {
                var dataSize = readUint32WithLastOffset(view, offset + 8, totalSize);
                var dataOffset = readUint32WithLastOffset(view, offset + 12, totalSize);
                var width = readUint8WithLastOffset(view, offset, totalSize);
                var height = readUint8WithLastOffset(view, offset + 1, totalSize);
                var bitCount = readUint8WithLastOffset(view, offset + 6, totalSize);
                var data = void 0;
                if (view.getUint32(dataOffset, true) === 0x28) {
                    data = IconItem.from(width, height, bin, dataOffset, dataSize);
                }
                else {
                    data = RawIconItem.from(bin, width || 256, height || 256, bitCount, dataOffset, dataSize);
                }
                icons.push({
                    width: width,
                    height: height,
                    colors: readUint8WithLastOffset(view, offset + 2, totalSize),
                    planes: readUint16WithLastOffset(view, offset + 4, totalSize),
                    bitCount: bitCount,
                    data: data,
                });
                offset += 16;
            }
        }
        this.icons = icons;
    }
    IconFile.from = function (bin) {
        return new IconFile(bin);
    };
    IconFile.prototype.generate = function () {
        return generateEntryBinary(this.icons);
    };
    return IconFile;
}());
export default IconFile;

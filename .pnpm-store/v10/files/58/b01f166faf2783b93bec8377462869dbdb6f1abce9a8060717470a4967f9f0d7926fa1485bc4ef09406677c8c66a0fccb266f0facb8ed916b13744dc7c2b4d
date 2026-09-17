// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference lib='dom' />
export function cloneObject(object) {
    var r = {};
    Object.keys(object).forEach(function (key) {
        r[key] = object[key];
    });
    return r;
}
/* eslint-enable @typescript-eslint/ban-types */
export function createDataView(bin, byteOffset, byteLength) {
    if ('buffer' in bin) {
        var newOffset = bin.byteOffset;
        var newLength = bin.byteLength;
        if (typeof byteOffset !== 'undefined') {
            newOffset += byteOffset;
            newLength -= byteOffset;
        }
        if (typeof byteLength !== 'undefined') {
            newLength = byteLength;
        }
        return new DataView(bin.buffer, newOffset, newLength);
    }
    else {
        return new DataView(bin, byteOffset, byteLength);
    }
}
export function roundUp(val, align) {
    return Math.floor((val + align - 1) / align) * align;
}
export function copyBuffer(dest, destOffset, src, srcOffset, length) {
    var ua8Dest = 'buffer' in dest
        ? new Uint8Array(dest.buffer, dest.byteOffset + (destOffset || 0), length)
        : new Uint8Array(dest, destOffset, length);
    var ua8Src = 'buffer' in src
        ? new Uint8Array(src.buffer, src.byteOffset + (srcOffset || 0), length)
        : new Uint8Array(src, srcOffset, length);
    ua8Dest.set(ua8Src);
}
export function allocatePartialBinary(binBase, offset, length) {
    var b = new ArrayBuffer(length);
    copyBuffer(b, 0, binBase, offset, length);
    return b;
}
export function cloneToArrayBuffer(binBase) {
    if ('buffer' in binBase) {
        var b = new ArrayBuffer(binBase.byteLength);
        new Uint8Array(b).set(new Uint8Array(binBase.buffer, binBase.byteOffset, binBase.byteLength));
        return b;
    }
    else {
        var b = new ArrayBuffer(binBase.byteLength);
        new Uint8Array(b).set(new Uint8Array(binBase));
        return b;
    }
}
export function readInt32WithLastOffset(view, offset, last) {
    return offset + 4 <= last ? view.getInt32(offset, true) : 0;
}
export function readUint8WithLastOffset(view, offset, last) {
    return offset < last ? view.getUint8(offset) : 0;
}
export function readUint16WithLastOffset(view, offset, last) {
    return offset + 2 <= last ? view.getUint16(offset, true) : 0;
}
export function readUint32WithLastOffset(view, offset, last) {
    return offset + 4 <= last ? view.getUint32(offset, true) : 0;
}
export function binaryToString(bin) {
    if (typeof TextDecoder !== 'undefined') {
        var dec = new TextDecoder();
        return dec.decode(bin);
    }
    else if (typeof Buffer !== 'undefined') {
        var b = void 0;
        if ('buffer' in bin) {
            b = Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength);
        }
        else {
            b = Buffer.from(bin);
        }
        return b.toString('utf8');
    }
    else {
        var view = void 0;
        if ('buffer' in bin) {
            view = new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
        }
        else {
            view = new Uint8Array(bin);
        }
        if (typeof decodeURIComponent !== 'undefined') {
            var s = '';
            for (var i = 0; i < view.length; ++i) {
                var c = view[i];
                if (c < 16) {
                    s += '%0' + c.toString(16);
                }
                else {
                    s += '%' + c.toString(16);
                }
            }
            return decodeURIComponent(s);
        }
        else {
            var s = '';
            for (var i = 0; i < view.length; ++i) {
                var c = view[i];
                s += String.fromCharCode(c);
            }
            return s;
        }
    }
}
export function stringToBinary(string) {
    if (typeof TextEncoder !== 'undefined') {
        var enc = new TextEncoder();
        return cloneToArrayBuffer(enc.encode(string));
    }
    else if (typeof Buffer !== 'undefined') {
        return cloneToArrayBuffer(Buffer.from(string, 'utf8'));
    }
    else if (typeof encodeURIComponent !== 'undefined') {
        var data = encodeURIComponent(string);
        var len = 0;
        for (var i = 0; i < data.length; ++len) {
            var c = data.charCodeAt(i);
            if (c === 37) {
                i += 3;
            }
            else {
                ++i;
            }
        }
        var bin = new ArrayBuffer(len);
        var view = new Uint8Array(bin);
        for (var i = 0, j = 0; i < data.length; ++j) {
            var c = data.charCodeAt(i);
            if (c === 37) {
                var n = parseInt(data.substring(i + 1, i + 3), 16);
                view[j] = n;
                i += 3;
            }
            else {
                view[j] = c;
                ++i;
            }
        }
        return bin;
    }
    else {
        var bin = new ArrayBuffer(string.length);
        new Uint8Array(bin).set([].map.call(string, function (c) {
            return c.charCodeAt(0);
        }));
        return bin;
    }
}
export function getFixedString(view, offset, length) {
    var actualLen = 0;
    for (var i = 0; i < length; ++i) {
        if (view.getUint8(offset + i) === 0) {
            break;
        }
        ++actualLen;
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(view.buffer, view.byteOffset + offset, actualLen).toString('utf8');
    }
    else if (typeof decodeURIComponent !== 'undefined') {
        var s = '';
        for (var i = 0; i < actualLen; ++i) {
            var c = view.getUint8(offset + i);
            if (c < 16) {
                s += '%0' + c.toString(16);
            }
            else {
                s += '%' + c.toString(16);
            }
        }
        return decodeURIComponent(s);
    }
    else {
        var s = '';
        for (var i = 0; i < actualLen; ++i) {
            var c = view.getUint8(offset + i);
            s += String.fromCharCode(c);
        }
        return s;
    }
}
export function setFixedString(view, offset, length, text) {
    if (typeof Buffer !== 'undefined') {
        var u = new Uint8Array(view.buffer, view.byteOffset + offset, length);
        // fill by zero
        u.set(new Uint8Array(length));
        u.set(Buffer.from(text, 'utf8').subarray(0, length));
    }
    else if (typeof encodeURIComponent !== 'undefined') {
        var s = encodeURIComponent(text);
        for (var i = 0, j = 0; i < length; ++i) {
            if (j >= s.length) {
                view.setUint8(i + offset, 0);
            }
            else {
                var c = s.charCodeAt(j);
                if (c === 37) {
                    // '%'
                    var n = parseInt(s.substr(j + 1, 2), 16);
                    if (typeof n === 'number' && !isNaN(n)) {
                        view.setUint8(i + offset, n);
                    }
                    else {
                        view.setUint8(i + offset, 0);
                    }
                    j += 3;
                }
                else {
                    view.setUint8(i + offset, c);
                }
            }
        }
    }
    else {
        for (var i = 0, j = 0; i < length; ++i) {
            if (j >= text.length) {
                view.setUint8(i + offset, 0);
            }
            else {
                var c = text.charCodeAt(j);
                view.setUint8(i + offset, c & 0xff);
            }
        }
    }
}

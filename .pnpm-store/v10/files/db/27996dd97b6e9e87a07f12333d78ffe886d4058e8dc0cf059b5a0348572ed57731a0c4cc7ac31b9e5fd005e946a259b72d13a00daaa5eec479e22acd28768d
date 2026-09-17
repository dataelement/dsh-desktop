"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayToDERSet = exports.makeDERSequence = exports.makeDERTaggedData = exports.makeDEROctetString = exports.makeDERBMPString = exports.makeDERIA5String = exports.makeDERLength = void 0;
function makeDERLength(length) {
    if (length < 0x80) {
        return [length];
    }
    var r = [];
    while (true) {
        r.push(length & 0xff);
        if (length < 0x100) {
            break;
        }
        length >>= 8;
    }
    r.push(0x80 + r.length);
    return r.reverse();
}
exports.makeDERLength = makeDERLength;
function makeDERIA5String(text) {
    // convert to char-code array and filter to [0-127]
    var r = [].map
        .call(text, function (c) { return c.charCodeAt(0); })
        .filter(function (n) { return n < 128; });
    return [0x16].concat(makeDERLength(r.length)).concat(r);
}
exports.makeDERIA5String = makeDERIA5String;
function makeDERBMPString(text) {
    // convert to char-code array
    // NOTE: In ECMAScript `charCodeAt` returns surrogate pair for >=0x10000 codes,
    //   and surrogate pair is valid for BMPString data
    var r = [].map.call(text, function (c) { return c.charCodeAt(0); });
    var ua = new Uint8Array(r.length * 2);
    var dv = new DataView(ua.buffer);
    // store codes as big-endian
    r.forEach(function (v, i) {
        dv.setUint16(i * 2, v, false);
    });
    return [0x1e].concat(makeDERLength(ua.length)).concat(
    // convert Uint8Array to number[] (not using spread operator)
    [].slice.call(ua));
}
exports.makeDERBMPString = makeDERBMPString;
function makeDEROctetString(bin) {
    if (!(bin instanceof Array)) {
        // convert Uint8Array to number[] (not using spread operator)
        bin = [].slice.call(bin);
    }
    return [0x04].concat(makeDERLength(bin.length)).concat(bin);
}
exports.makeDEROctetString = makeDEROctetString;
function makeDERTaggedData(tag, body) {
    return [0xa0 + tag].concat(makeDERLength(body.length)).concat(body);
}
exports.makeDERTaggedData = makeDERTaggedData;
function makeDERSequence(body) {
    return [0x30].concat(makeDERLength(body.length)).concat(body);
}
exports.makeDERSequence = makeDERSequence;
function arrayToDERSet(items) {
    var r = items.reduce(function (prev, item) {
        return prev.concat(item instanceof Array ? item : item.toDER());
    }, []);
    return [0x31].concat(makeDERLength(r.length)).concat(r);
}
exports.arrayToDERSet = arrayToDERSet;

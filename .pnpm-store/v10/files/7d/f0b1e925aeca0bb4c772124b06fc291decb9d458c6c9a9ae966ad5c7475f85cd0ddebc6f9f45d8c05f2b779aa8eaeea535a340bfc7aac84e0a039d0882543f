"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certBinToCertificatesDER = exports.pickIssuerAndSerialNumberDERFromCert = exports.calculateDERLength = exports.toUint8Array = void 0;
var DERObject_js_1 = require("./data/DERObject.js");
var KnownOids_js_1 = require("./data/KnownOids.js");
function toUint8Array(bin) {
    if ('buffer' in bin) {
        return new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
    }
    else {
        return new Uint8Array(bin);
    }
}
exports.toUint8Array = toUint8Array;
/** @return [length, afterOffset] */
function calculateDERLength(data, offset) {
    var actualLength = 0;
    var value = data[offset];
    if (value == null) {
        throw new Error('Invalid "offset" value');
    }
    else if (value < 0x80) {
        actualLength = value;
        ++offset;
    }
    else if (value === 0x80) {
        throw new Error('Not supported certificate data (variable length)');
    }
    else {
        var c = value & 0x7f;
        ++offset;
        while (c--) {
            if (offset >= data.length) {
                throw new Error('Invalid certificate data (invalid sequence length)');
            }
            actualLength <<= 8;
            actualLength |= data[offset];
            ++offset;
        }
    }
    return [actualLength, offset];
}
exports.calculateDERLength = calculateDERLength;
function skipField(data, offsetOfDataHead) {
    var _a = calculateDERLength(data, offsetOfDataHead + 1), len = _a[0], off = _a[1];
    return off + len;
}
function pickCertificatesIfDERHasSignedData(ub, offset) {
    var _a, _b, _c, _d, _e;
    if (ub.length < offset + 2) {
        return null;
    }
    if (ub[offset] !== 0x30) {
        return null;
    }
    var tempLength;
    _a = calculateDERLength(ub, offset + 1), tempLength = _a[0], offset = _a[1];
    if (tempLength > ub.length - offset) {
        throw new Error('Invalid certificate data (insufficient data length)');
    }
    // if the first item is not contentType, then return
    if (ub[offset] !== 0x6) {
        return null;
    }
    var signedDataOid = KnownOids_js_1.OID_SIGNED_DATA.toDER();
    for (var i = 0; i < signedDataOid.length; ++i) {
        if (ub[offset + i] !== signedDataOid[i]) {
            return null;
        }
    }
    // if contentType is OID_SIGNED_DATA, then check sequence format
    // ContentInfo.content
    offset += signedDataOid.length;
    // [0] IMPLICIT
    if (ub[offset] !== 0xa0) {
        throw new Error('Invalid certificate data (no content in contentInfo)');
    }
    _b = calculateDERLength(ub, offset + 1), tempLength = _b[0], offset = _b[1];
    if (offset + tempLength > ub.length) {
        throw new Error('Invalid certificate data (invalid length for content)');
    }
    // sequence
    if (ub[offset] !== 0x30) {
        throw new Error('Invalid certificate data (unexpected signedData)');
    }
    _c = calculateDERLength(ub, offset + 1), tempLength = _c[0], offset = _c[1];
    if (offset + tempLength > ub.length) {
        throw new Error('Invalid certificate data (invalid length for signedData)');
    }
    // version
    if (ub[offset] !== 0x2 ||
        ub[offset + 1] !== 0x1 ||
        ub[offset + 2] !== 0x1) {
        throw new Error('Invalid certificate data (unexpected signedData.version)');
    }
    offset += 3;
    // digestAlgorithms (skip)
    if (ub[offset] !== 0x31) {
        throw new Error('Invalid certificate data (no signedData.digestAlgorithms)');
    }
    _d = calculateDERLength(ub, offset + 1), tempLength = _d[0], offset = _d[1];
    if (offset + tempLength > ub.length) {
        throw new Error('Invalid certificate data (invalid length for signedData.digestAlgorithms)');
    }
    offset += tempLength;
    // contentInfo (skip)
    if (ub[offset] !== 0x30) {
        throw new Error('Invalid certificate data (no signedData.contentInfo)');
    }
    _e = calculateDERLength(ub, offset + 1), tempLength = _e[0], offset = _e[1];
    if (offset + tempLength > ub.length) {
        throw new Error('Invalid certificate data (invalid length for signedData.contentInfo)');
    }
    offset += tempLength;
    // certificates
    if (ub[offset] !== 0xa0) {
        throw new Error('Invalid certificate data (no signedData.certificates)');
    }
    var _f = calculateDERLength(ub, offset + 1), certsLength = _f[0], newOffset = _f[1];
    if (newOffset + certsLength > ub.length) {
        throw new Error('Invalid certificate data (invalid length for signedData.certificates)');
    }
    return ub.subarray(offset, newOffset + certsLength);
}
/** @return [issuer, serialNumber] */
function pickIssuerAndSerialNumberDERFromCert(bin) {
    var _a, _b;
    if (Array.isArray(bin)) {
        // use first one and call again
        if (bin.length === 0) {
            throw new Error('No data is specified.');
        }
        return pickIssuerAndSerialNumberDERFromCert(bin[0]);
    }
    var ub = toUint8Array(bin);
    if (ub.length < 2) {
        throw new Error('Invalid certificate data');
    }
    if (ub[0] !== 0x30) {
        throw new Error('Not supported certificate data (non-`Certificate`-format data)');
    }
    var certsBin = pickCertificatesIfDERHasSignedData(ub, 0);
    if (certsBin) {
        // certificates
        var _c = calculateDERLength(certsBin, 1), tempLength_1 = _c[0], eaten_1 = _c[1];
        if (eaten_1 + tempLength_1 > certsBin.length) {
            throw new Error('Invalid certificate data (invalid length for signedData.certificates)');
        }
        // pick first certificate and call again
        if (certsBin[eaten_1] !== 0x30) {
            throw new Error('Invalid certificate data (no signedData.certificates[0])');
        }
        var _d = calculateDERLength(certsBin, eaten_1 + 1), certLength = _d[0], tempOffset = _d[1];
        if (tempOffset + certLength > certsBin.length) {
            throw new Error('Invalid certificate data (invalid length for signedData.certificates[0])');
        }
        return pickIssuerAndSerialNumberDERFromCert(certsBin.subarray(eaten_1, tempOffset + certLength));
    }
    var tempLength;
    var eaten;
    _a = calculateDERLength(ub, 1), tempLength = _a[0], eaten = _a[1];
    if (tempLength > ub.length - eaten) {
        throw new Error('Invalid certificate data (insufficient data length)');
    }
    if (ub[eaten] !== 0x30) {
        throw new Error('Invalid certificate data (missing tbsCertificate)');
    }
    // Certificate
    var tbsCertificateLen;
    _b = calculateDERLength(ub, eaten + 1), tbsCertificateLen = _b[0], eaten = _b[1];
    if (tbsCertificateLen > ub.length - eaten) {
        throw new Error('Invalid certificate data (invalid tbsCertificate length)');
    }
    var tbsOffsetLast = eaten + tbsCertificateLen;
    // TBSCertificate
    // :skip version
    if (ub[eaten] === 0xa0) {
        eaten = skipField(ub, eaten);
        if (eaten >= tbsOffsetLast) {
            throw new Error('Invalid certificate data (insufficient tbsCertificate data: after version)');
        }
    }
    // pick serialNumber
    if (ub[eaten] !== 2) {
        throw new Error('Invalid certificate data (invalid serialNumber)');
    }
    var offsetAfterSerialNumber = skipField(ub, eaten);
    if (eaten >= tbsOffsetLast) {
        throw new Error('Invalid certificate data (insufficient tbsCertificate data: after serialNumber)');
    }
    var serialNumberDER = [].slice.call(ub, eaten, offsetAfterSerialNumber);
    eaten = offsetAfterSerialNumber;
    // :skip algorithmIdentifier
    if (ub[eaten] !== 0x30) {
        throw new Error('Invalid certificate data (invalid algorithmIdentifier)');
    }
    eaten = skipField(ub, eaten);
    if (eaten >= tbsOffsetLast) {
        throw new Error('Invalid certificate data (insufficient tbsCertificate data: after serialNumber)');
    }
    // pick issuer
    // Name ::= CHOICE { RDNSequence }
    // RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
    if (ub[eaten] !== 0x30) {
        throw new Error('Invalid certificate data (invalid issuer)');
    }
    var offsetAfterIssuer = skipField(ub, eaten);
    if (offsetAfterIssuer > tbsOffsetLast) {
        throw new Error('Invalid certificate data (insufficient tbsCertificate data: issuer)');
    }
    return [
        // return entire issuer sequence
        [].slice.call(ub, eaten, offsetAfterIssuer),
        serialNumberDER,
    ];
}
exports.pickIssuerAndSerialNumberDERFromCert = pickIssuerAndSerialNumberDERFromCert;
function certBinToCertificatesDER(bin) {
    if (Array.isArray(bin)) {
        // use all items, map with `certBinToCertificatesDER`, and concat all
        return bin
            .map(certBinToCertificatesDER)
            .reduce(function (prev, cur) { return prev.concat(cur); }, []);
    }
    var ub = toUint8Array(bin);
    var certsBin = pickCertificatesIfDERHasSignedData(ub, 0);
    if (certsBin) {
        // certificates
        var _a = calculateDERLength(certsBin, 1), tempLength = _a[0], eaten = _a[1];
        if (eaten + tempLength > certsBin.length) {
            throw new Error('Invalid certificate data (invalid length for signedData.certificates)');
        }
        var offsetLast = eaten + tempLength;
        var rawData = [];
        for (var offset = eaten; offset < offsetLast;) {
            // pick certificates
            if (certsBin[offset] !== 0x30) {
                throw new Error('Invalid certificate data (no signedData.certificates[*])');
            }
            var _b = calculateDERLength(certsBin, offset + 1), certLength = _b[0], tempOffset = _b[1];
            if (tempOffset + certLength > certsBin.length) {
                throw new Error('Invalid certificate data (invalid length for signedData.certificates[*])');
            }
            rawData.push(new DERObject_js_1.RawDERObject(certsBin.subarray(offset, tempOffset + certLength)));
            offset = tempOffset + certLength;
        }
        return rawData;
    }
    else {
        return [new DERObject_js_1.RawDERObject(ub)];
    }
}
exports.certBinToCertificatesDER = certBinToCertificatesDER;

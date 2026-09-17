"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickSignedDataFromTimestampResponse = exports.createTimestampRequest = void 0;
var functions_js_1 = require("../util/functions.js");
var certUtil_js_1 = require("./certUtil.js");
var derUtil_js_1 = require("./data/derUtil.js");
var KnownOids_js_1 = require("./data/KnownOids.js");
function createTimestampRequest(data, algorithmIdentifier) {
    return new Uint8Array(derUtil_js_1.makeDERSequence(
    // version
    [0x2, 0x1, 0x1]
        // messageImprint
        .concat(derUtil_js_1.makeDERSequence(algorithmIdentifier
        .toDER()
        .concat(derUtil_js_1.makeDEROctetString(certUtil_js_1.toUint8Array(data)))))
        // certReq
        .concat([0x01, 0x01, 0xff]))).buffer;
}
exports.createTimestampRequest = createTimestampRequest;
function pickSignedDataFromTimestampResponse(data) {
    var _a, _b, _c, _d, _e, _f;
    var ub = certUtil_js_1.toUint8Array(data);
    if (ub.length < 2 || ub[0] !== 0x30) {
        throw new Error('Invalid or unexpected timestamp response');
    }
    var len;
    var offset;
    _a = certUtil_js_1.calculateDERLength(ub, 1), len = _a[0], offset = _a[1];
    if (len > ub.length - offset) {
        throw new Error('Invalid or unexpected timestamp response (insufficient buffer)');
    }
    var dataLast = offset + len;
    // status PKIStatusInfo
    if (ub[offset] !== 0x30) {
        throw new Error('Invalid or unexpected timestamp response (no PKIStatusInfo)');
    }
    _b = certUtil_js_1.calculateDERLength(ub, offset + 1), len = _b[0], offset = _b[1];
    if (offset >= dataLast) {
        throw new Error('Invalid or unexpected timestamp response (invalid length for PKIStatusInfo)');
    }
    var timeStampTokenOffset = offset + len;
    // PKIStatusInfo.status
    if (ub[offset] !== 0x2 || ub[offset + 1] !== 0x1) {
        throw new Error('Invalid or unexpected timestamp response (invalid PKIStatusInfo.status)');
    }
    var status = ub[offset + 2];
    switch (status) {
        case 0: // granted
        case 1: // grantedWithMods
            break;
        case 2: // rejection
        case 3: // waiting
        case 4: // revocationWarning
        case 5: /* revocationNotification */ {
            var msg = "Timestamp response has error status " + status;
            // PKIStatusInfo.statusString
            if (offset + 3 < timeStampTokenOffset && ub[offset + 3] === 0x30) {
                _c = certUtil_js_1.calculateDERLength(ub, offset + 4), len = _c[0], offset = _c[1];
                if (offset + len <= timeStampTokenOffset &&
                    ub[offset] === 0xc) {
                    _d = certUtil_js_1.calculateDERLength(ub, offset + 1), len = _d[0], offset = _d[1];
                    if (offset + len <= timeStampTokenOffset) {
                        var statusString = 
                        // pick UTF8String body
                        [].slice
                            .call(ub, offset, offset + len)
                            // map 0x20<=x<=0x7e values to chars, and other values to '%xx' to be parsed by decodeURIComponent
                            .map(function (val) {
                            if (val >= 0x20 && val <= 0x7e) {
                                return String.fromCharCode(val);
                            }
                            else {
                                var s = val.toString(16);
                                if (s.length === 1) {
                                    s = '0' + s;
                                }
                                return '%' + s;
                            }
                        })
                            .join('');
                        msg += ', text = ' + decodeURIComponent(statusString);
                    }
                }
            }
            throw new Error(msg);
        }
        default:
            throw new Error("Unexpected PKIStatusInfo.status: " + (status !== null && status !== void 0 ? status : '(unknown)'));
    }
    // TimeStampToken ::= ContentInfo
    if (timeStampTokenOffset + 1 >= dataLast ||
        ub[timeStampTokenOffset] !== 0x30) {
        throw new Error('Invalid or unexpected timestamp response (no TimeStampToken)');
    }
    _e = certUtil_js_1.calculateDERLength(ub, timeStampTokenOffset + 1), len = _e[0], offset = _e[1];
    if (offset + len > dataLast) {
        throw new Error('Invalid or unexpected timestamp response (insufficient data for TimeStampToken)');
    }
    // ContentInfo.contentType
    var signedDataOid = KnownOids_js_1.OID_SIGNED_DATA.toDER();
    if (ub[offset] !== 0x6) {
        throw new Error('Invalid or unexpected timestamp response (no contentType in TimeStampToken)');
    }
    for (var i = 0; i < signedDataOid.length; ++i) {
        if (ub[offset + i] !== signedDataOid[i]) {
            throw new Error('Invalid or unexpected timestamp response (unexpected TimeStampToken.contentType octet)');
        }
    }
    // ContentInfo.content
    offset += signedDataOid.length;
    // [0] IMPLICIT
    if (ub[offset] !== 0xa0) {
        throw new Error('Invalid or unexpected timestamp response (no content in TimeStampToken)');
    }
    _f = certUtil_js_1.calculateDERLength(ub, offset + 1), len = _f[0], offset = _f[1];
    if (offset + len > dataLast) {
        throw new Error('Invalid or unexpected timestamp response (invalid length for TimeStampToken.content)');
    }
    // return content data (=== SignedData)
    return functions_js_1.allocatePartialBinary(ub, offset, len);
}
exports.pickSignedDataFromTimestampResponse = pickSignedDataFromTimestampResponse;

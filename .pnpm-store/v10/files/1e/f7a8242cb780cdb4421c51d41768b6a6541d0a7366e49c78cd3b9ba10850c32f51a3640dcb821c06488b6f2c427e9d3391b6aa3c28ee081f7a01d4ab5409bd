// refs.
// - Windows Authenticode Portable Executable Signature Format
//   https://download.microsoft.com/download/9/c/5/9c5b2167-8017-4bae-9fde-d599bac8184a/authenticode_pe.docx
// - RFC 2315 - PKCS #7: Cryptographic Message Syntax Version 1.5
//   https://tools.ietf.org/html/rfc2315
// - RFC 3280 - Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile
//   https://tools.ietf.org/html/rfc3280
// - Object IDs associated with Microsoft cryptography
//   https://support.microsoft.com/en-us/help/287547/object-ids-associated-with-microsoft-cryptography
// - OID repository
//   http://oid-info.com/
// - RFC 3161 - Internet X.509 Public Key Infrastructure Time-Stamp Protocol (TSP)
//   https://tools.ietf.org/html/rfc3161
// - mono/AuthenticodeDeformatter.cs
//   https://github.com/mono/mono/blob/master/mcs/class/Mono.Security/Mono.Security.Authenticode/AuthenticodeDeformatter.cs
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { Format, calculateCheckSumForPE } from 'pe-library';
import { allocatePartialBinary, cloneToArrayBuffer, copyBuffer, roundUp, } from '../util/functions.js';
import { certBinToCertificatesDER, pickIssuerAndSerialNumberDERFromCert, toUint8Array, } from './certUtil.js';
import AlgorithmIdentifier from './data/AlgorithmIdentifier.js';
import CertificateDataRoot from './data/CertificateDataRoot.js';
import { RawDERObject } from './data/DERObject.js';
import DigestInfo from './data/DigestInfo.js';
import IssuerAndSerialNumber from './data/IssuerAndSerialNumber.js';
import * as KnownOids from './data/KnownOids.js';
import SignedData from './data/SignedData.js';
import SignerInfo from './data/SignerInfo.js';
import SpcIndirectDataContent, { SpcIndirectDataContentInfo, SPC_INDIRECT_DATA_OBJID, } from './data/SpcIndirectDataContent.js';
import SpcPeImageData, { SpcPeImageAttributeTypeAndOptionalValue, } from './data/SpcPeImageData.js';
import { SpcLinkFile } from './data/SpcLink.js';
import Attribute from './data/Attribute.js';
import { arrayToDERSet, makeDEROctetString, makeDERSequence, } from './data/derUtil.js';
import ContentInfo from './data/ContentInfo.js';
import ObjectIdentifier from './data/ObjectIdentifier.js';
import { createTimestampRequest, pickSignedDataFromTimestampResponse, } from './timestamp.js';
function makeSimpleIterator(data) {
    var done = false;
    return {
        next: function () {
            if (done) {
                return {
                    done: true,
                    value: undefined,
                };
            }
            else {
                done = true;
                return {
                    done: false,
                    value: data,
                };
            }
        },
    };
}
function validateSignerObject(signer) {
    if (!signer.encryptData && !signer.signData) {
        throw new Error('Signer object must implement either `encryptData` or `signData`.');
    }
}
function calculateExecutableDigest(executable, signer, alignment) {
    function inner() {
        var checkSumOffset, certificateTableOffset, rawHeader, targetSections, sectionCount, sectionStartOffset, sectionEndOffset, sectionHeadersSize, secHeader, secArray_1, off, _i, targetSections_1, section, exData, alignedLength, diff;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    checkSumOffset = executable.dosHeader.newHeaderAddress + 88;
                    certificateTableOffset = executable.dosHeader.newHeaderAddress +
                        executable.newHeader.getDataDirectoryOffset() +
                        Format.ImageDataDirectoryArray.itemSize *
                            Format.ImageDirectoryEntry.Certificate;
                    rawHeader = executable.getRawHeader();
                    targetSections = executable.getAllSections();
                    sectionCount = targetSections.length;
                    sectionStartOffset = rawHeader.byteLength;
                    sectionEndOffset = roundUp(sectionStartOffset +
                        sectionCount * Format.ImageSectionHeaderArray.itemSize, executable.getFileAlignment());
                    sectionHeadersSize = sectionEndOffset - sectionStartOffset;
                    secHeader = new ArrayBuffer(sectionHeadersSize);
                    {
                        secArray_1 = Format.ImageSectionHeaderArray.from(secHeader, sectionCount);
                        targetSections.forEach(function (sec, i) {
                            secArray_1.set(i, sec.info);
                        });
                    }
                    // pick from head to immediately before checksum
                    return [4 /*yield*/, allocatePartialBinary(rawHeader, 0, checkSumOffset)];
                case 1:
                    // pick from head to immediately before checksum
                    _a.sent();
                    // pick from the end of checksum to immediately before 'Certificate Table' header
                    return [4 /*yield*/, allocatePartialBinary(rawHeader, checkSumOffset + 4, certificateTableOffset - (checkSumOffset + 4))];
                case 2:
                    // pick from the end of checksum to immediately before 'Certificate Table' header
                    _a.sent();
                    off = certificateTableOffset +
                        Format.ImageDataDirectoryArray.itemSize;
                    return [4 /*yield*/, allocatePartialBinary(executable.getRawHeader(), off, executable.getTotalHeaderSize() - off)];
                case 3:
                    _a.sent();
                    // pick section header
                    return [4 /*yield*/, secHeader];
                case 4:
                    // pick section header
                    _a.sent();
                    _i = 0, targetSections_1 = targetSections;
                    _a.label = 5;
                case 5:
                    if (!(_i < targetSections_1.length)) return [3 /*break*/, 8];
                    section = targetSections_1[_i];
                    if (!section.data) return [3 /*break*/, 7];
                    return [4 /*yield*/, section.data];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    exData = executable.getExtraData();
                    if (!(exData !== null)) return [3 /*break*/, 11];
                    return [4 /*yield*/, exData];
                case 9:
                    _a.sent();
                    alignedLength = roundUp(exData.byteLength, alignment);
                    diff = alignedLength - exData.byteLength;
                    if (!(diff !== 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, new Uint8Array(diff).buffer];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11: return [2 /*return*/];
            }
        });
    }
    return signer.digestData(inner());
}
function getAlgorithmIdentifierObject(type) {
    if (typeof type !== 'string') {
        return new AlgorithmIdentifier(new ObjectIdentifier(type));
    }
    switch (type) {
        case 'sha1':
        case 'SHA1':
            return new AlgorithmIdentifier(KnownOids.OID_SHA1_NO_SIGN);
        case 'sha256':
        case 'SHA256':
            return new AlgorithmIdentifier(KnownOids.OID_SHA256_NO_SIGN);
        case 'sha384':
        case 'SHA384':
            return new AlgorithmIdentifier(KnownOids.OID_SHA384_NO_SIGN);
        case 'sha512':
        case 'SHA512':
            return new AlgorithmIdentifier(KnownOids.OID_SHA512_NO_SIGN);
        case 'sha224':
        case 'SHA224':
            return new AlgorithmIdentifier(KnownOids.OID_SHA224_NO_SIGN);
        case 'sha512-224':
        case 'SHA512-224':
            return new AlgorithmIdentifier(KnownOids.OID_SHA512_224_NO_SIGN);
        case 'sha512-256':
        case 'SHA512-256':
            return new AlgorithmIdentifier(KnownOids.OID_SHA512_256_NO_SIGN);
        case 'sha3-224':
        case 'SHA3-224':
            return new AlgorithmIdentifier(KnownOids.OID_SHA3_224_NO_SIGN);
        case 'sha3-256':
        case 'SHA3-256':
            return new AlgorithmIdentifier(KnownOids.OID_SHA3_256_NO_SIGN);
        case 'sha3-384':
        case 'SHA3-384':
            return new AlgorithmIdentifier(KnownOids.OID_SHA3_384_NO_SIGN);
        case 'sha3-512':
        case 'SHA3-512':
            return new AlgorithmIdentifier(KnownOids.OID_SHA3_512_NO_SIGN);
        case 'shake128':
        case 'SHAKE128':
            return new AlgorithmIdentifier(KnownOids.OID_SHAKE128_NO_SIGN);
        case 'shake256':
        case 'SHAKE256':
            return new AlgorithmIdentifier(KnownOids.OID_SHAKE256_NO_SIGN);
        default:
            throw new Error('Invalid or unsupported digest algorithm');
    }
}
function doSign(signer, digestAlgorithm, dataIterator) {
    if (signer.signData) {
        return signer.signData(dataIterator);
    }
    else {
        return signer.digestData(dataIterator).then(function (digestAttributes) {
            // encrypting DigestInfo with digest of 'attributes' set
            var digestInfoBin = new Uint8Array(new DigestInfo(digestAlgorithm, digestAttributes).toDER()).buffer;
            // (eencryptData should be defined here)
            return signer.encryptData(makeSimpleIterator(digestInfoBin));
        });
    }
}
/**
 * Generates the executable binary data with signed info.
 * This function is like an extension of `generate` method of `NtExecutable`.
 * @param executable a valid instance of `NtExecutable`
 * @param signer user-defined `SignerObject` instance for signing
 * @param alignment alignment value for placing certificate data
 *     (using `executable.getFileAlignment()` if omitted)
 * @return Promise-like (Thenable) object which will resolve with generated executable binary
 */
export function generateExecutableWithSign(executable, signer, alignment) {
    validateSignerObject(signer);
    var certAlignment;
    if (typeof alignment === 'number') {
        if (alignment <= 0) {
            throw new Error('Invalid alignment value');
        }
        certAlignment = alignment;
    }
    else {
        certAlignment = executable.getFileAlignment();
    }
    var digestAlgorithm = getAlgorithmIdentifierObject(signer.getDigestAlgorithm());
    var digestEncryptionAlgorithm;
    var a = signer.getEncryptionAlgorithm();
    if (typeof a !== 'string') {
        digestEncryptionAlgorithm = new AlgorithmIdentifier(new ObjectIdentifier(a));
    }
    else {
        switch (a) {
            case 'rsa':
            case 'RSA':
                digestEncryptionAlgorithm = new AlgorithmIdentifier(KnownOids.OID_RSA);
                break;
            case 'dsa':
            case 'DSA':
                digestEncryptionAlgorithm = new AlgorithmIdentifier(KnownOids.OID_DSA);
                break;
            default:
                throw new Error('Invalid or unsupported digest encryption algorithm');
        }
    }
    // (for compatibility)
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    var cert = signer.getCertificateData
        ? signer.getCertificateData()
        : signer.getPublicKeyData();
    var _a = pickIssuerAndSerialNumberDERFromCert(cert), issuer = _a[0], serialNumber = _a[1];
    return (
    // calculate digest
    calculateExecutableDigest(executable, signer, certAlignment)
        // make content, content's digest, and sign
        .then(function (digest) {
        var content = new SpcIndirectDataContent(new SpcPeImageAttributeTypeAndOptionalValue(new SpcPeImageData(0 /* IncludeResources */, new SpcLinkFile(''))), new DigestInfo(digestAlgorithm, digest));
        return (signer
            .digestData(makeSimpleIterator(new Uint8Array(content.toDERWithoutHeader())
            .buffer))
            // make sign
            .then(function (contentDigest) {
            var attributes = [
                new Attribute(KnownOids.OID_SPC_SP_OPUS_INFO_OBJID, 
                // (SpcSpOpusInfo) null sequence
                [new RawDERObject([0x30, 0x00])]),
                new Attribute(KnownOids.OID_CONTENT_TYPE, [
                    SPC_INDIRECT_DATA_OBJID,
                ]),
                new Attribute(KnownOids.OID_SPC_STATEMENT_TYPE_OBJID, [
                    new RawDERObject(makeDERSequence(KnownOids.OID_SPC_INDIVIDUAL_SP_KEY_PURPOSE_OBJID.toDER())),
                ]),
                new Attribute(KnownOids.OID_MESSAGE_DIGEST, [
                    new RawDERObject(makeDEROctetString(toUint8Array(contentDigest))),
                ]),
            ];
            // get digest of 'attributes' set
            var attrBin = new Uint8Array(arrayToDERSet(attributes)).buffer;
            return doSign(signer, digestAlgorithm, makeSimpleIterator(attrBin)).then(function (signed) {
                return [content, attributes, signed];
            });
        }));
    })
        // make cert bin
        .then(function (_a) {
        var content = _a[0], attributes = _a[1], signed = _a[2];
        var signerInfo = new SignerInfo(
        // version
        1, 
        // issuerAndSerialNumber
        new IssuerAndSerialNumber(new RawDERObject(issuer), new RawDERObject(serialNumber)), 
        // digestAlgorithm
        digestAlgorithm, 
        // digestEncryptionAlgorithm
        digestEncryptionAlgorithm, 
        // encryptedDigest
        toUint8Array(signed), 
        // authenticatedAttributes
        attributes);
        if (!signer.timestampData) {
            return [content, signerInfo];
        }
        // timestamp
        return (signer
            // make digest of encrypted data for make timestamp
            .digestData(makeSimpleIterator(cloneToArrayBuffer(signed)))
            .then(function (digestEncryptedBase) {
            var digestEncrypted = createTimestampRequest(digestEncryptedBase, digestAlgorithm);
            // request timestamp
            return signer.timestampData(digestEncrypted).then(function (timestamp) {
                // pick up signedData
                var timestampSignedData = pickSignedDataFromTimestampResponse(timestamp);
                // add timestamp to 'unauthenticatedAttributes'
                signerInfo.unauthenticatedAttributes = [
                    new Attribute(KnownOids.OID_RFC3161_COUNTER_SIGNATURE, [
                        new ContentInfo(KnownOids.OID_SIGNED_DATA, new RawDERObject(toUint8Array(timestampSignedData))),
                    ]),
                ];
                return [content, signerInfo];
            });
        }));
    })
        .then(function (_a) {
        var content = _a[0], signerInfo = _a[1];
        // make certificate data
        var root = new CertificateDataRoot(KnownOids.OID_SIGNED_DATA, new SignedData(
        // version
        1, 
        // digestAlgorithms
        [digestAlgorithm], 
        // contentInfo
        new SpcIndirectDataContentInfo(content), 
        // signerInfos
        [signerInfo], 
        // certificates
        certBinToCertificatesDER(cert)));
        var certBin = new Uint8Array(root.toDER());
        var resultBin = new ArrayBuffer(8 + certBin.length);
        // make WIN_CERTIFICATE
        var resultView = new DataView(resultBin);
        // dwLength
        resultView.setUint32(0, certBin.length + 8, true);
        // wRevision : 0x0200 (revision 2)
        resultView.setUint16(4, 0x200, true);
        // wCertificateType : 0x0002
        resultView.setUint16(6, 0x2, true);
        copyBuffer(resultBin, 8, certBin, 0, certBin.byteLength);
        return resultBin;
    })
        .then(function (certBin) {
        var alignedSize = roundUp(certBin.byteLength, certAlignment);
        // NOTE: The certificate data must follow the extra data.
        // To achieve this, the another size between them must be added to the padding size.
        // (The extra data may not be aligned, but the certificate data should be aligned.)
        var paddingSize = alignedSize;
        var exData = executable.getExtraData();
        if (exData !== null) {
            var diffSize = roundUp(exData.byteLength, certAlignment) -
                exData.byteLength;
            paddingSize += diffSize;
        }
        var newBin = executable.generate(paddingSize);
        var certOffset = newBin.byteLength - alignedSize;
        var dirArray = Format.ImageDataDirectoryArray.from(newBin, executable.dosHeader.newHeaderAddress +
            executable.newHeader.getDataDirectoryOffset());
        dirArray.set(Format.ImageDirectoryEntry.Certificate, {
            size: alignedSize,
            virtualAddress: certOffset,
        });
        // recalculate checksum
        calculateCheckSumForPE(newBin, true);
        // write Certificate section data
        copyBuffer(newBin, certOffset, certBin, 0, certBin.byteLength);
        return newBin;
    }));
}

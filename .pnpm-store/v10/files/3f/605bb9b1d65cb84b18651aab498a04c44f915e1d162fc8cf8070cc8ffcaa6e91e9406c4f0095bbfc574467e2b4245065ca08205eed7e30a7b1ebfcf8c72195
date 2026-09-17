import DERObject from './DERObject.js';
import IssuerAndSerialNumber from './IssuerAndSerialNumber.js';
import AlgorithmIdentifier from './AlgorithmIdentifier.js';
import Attribute from './Attribute.js';
export default class SignerInfo implements DERObject {
    version: number;
    issuerAndSerialNumber: IssuerAndSerialNumber;
    digestAlgorithm: AlgorithmIdentifier;
    digestEncryptionAlgorithm: AlgorithmIdentifier;
    encryptedDigest: Uint8Array;
    authenticatedAttributes?: Attribute[] | undefined;
    unauthenticatedAttributes?: Attribute[] | undefined;
    constructor(version: number, issuerAndSerialNumber: IssuerAndSerialNumber, digestAlgorithm: AlgorithmIdentifier, digestEncryptionAlgorithm: AlgorithmIdentifier, encryptedDigest: Uint8Array, authenticatedAttributes?: Attribute[] | undefined, unauthenticatedAttributes?: Attribute[] | undefined);
    toDER(): number[];
}

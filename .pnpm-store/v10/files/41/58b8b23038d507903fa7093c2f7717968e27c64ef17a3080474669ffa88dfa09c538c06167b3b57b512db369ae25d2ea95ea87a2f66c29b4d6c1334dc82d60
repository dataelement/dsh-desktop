import ContentInfo from './ContentInfo.js';
import DigestInfo from './DigestInfo.js';
import ObjectIdentifier from './ObjectIdentifier.js';
import DERObject from './DERObject.js';
export declare const SPC_INDIRECT_DATA_OBJID: ObjectIdentifier;
export declare class SpcAttributeTypeAndOptionalValue<TValue extends DERObject = DERObject> {
    type: ObjectIdentifier;
    value: TValue;
    constructor(type: ObjectIdentifier, value: TValue);
    toDER(): number[];
}
export default class SpcIndirectDataContent implements DERObject {
    data: SpcAttributeTypeAndOptionalValue;
    messageDigest: DigestInfo;
    constructor(data: SpcAttributeTypeAndOptionalValue, messageDigest: DigestInfo);
    toDER(): number[];
    toDERWithoutHeader(): number[];
}
export declare class SpcIndirectDataContentInfo extends ContentInfo<SpcIndirectDataContent> {
    constructor(content: SpcIndirectDataContent);
}

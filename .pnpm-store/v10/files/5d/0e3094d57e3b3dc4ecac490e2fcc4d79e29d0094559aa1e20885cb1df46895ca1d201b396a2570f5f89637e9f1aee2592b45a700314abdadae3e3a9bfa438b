import DERObject from './DERObject.js';
import ObjectIdentifier from './ObjectIdentifier.js';
import { SpcAttributeTypeAndOptionalValue } from './SpcIndirectDataContent.js';
import SpcLink from './SpcLink.js';
export declare const SPC_PE_IMAGE_DATA_OBJID: ObjectIdentifier;
export declare const enum SpcPeImageFlags {
    IncludeResources = 0,
    IncludeDebugInfo = 1,
    IncludeImportAddressTable = 2
}
export default class SpcPeImageData implements DERObject {
    flags: SpcPeImageFlags;
    file: SpcLink;
    constructor(flags: SpcPeImageFlags, file: SpcLink);
    toDER(): number[];
}
export declare class SpcPeImageAttributeTypeAndOptionalValue extends SpcAttributeTypeAndOptionalValue<SpcPeImageData> {
    constructor(value: SpcPeImageData);
}

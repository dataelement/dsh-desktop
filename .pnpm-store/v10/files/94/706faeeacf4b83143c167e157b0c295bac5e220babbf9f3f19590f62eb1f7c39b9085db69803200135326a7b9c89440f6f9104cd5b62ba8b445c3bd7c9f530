import DERObject from './DERObject.js';
import ObjectIdentifier from './ObjectIdentifier.js';
export default class ContentInfo<TContent extends DERObject = DERObject> implements DERObject {
    contentType: ObjectIdentifier;
    content: TContent;
    constructor(contentType: ObjectIdentifier, content: TContent);
    toDER(): number[];
}

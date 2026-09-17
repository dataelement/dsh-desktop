import DERObject from './DERObject.js';
import ObjectIdentifier from './ObjectIdentifier.js';
export default class Attribute implements DERObject {
    attrType: ObjectIdentifier;
    attrValues: DERObject[];
    constructor(attrType: ObjectIdentifier, attrValues: DERObject[]);
    toDER(): number[];
}

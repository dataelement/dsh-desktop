import DERObject from './DERObject.js';
/**
 * Abstract data SpcLink. Must use either `SpcLinkUrl` or `SpcLinkFile` instead.
 */
export default abstract class SpcLink implements DERObject {
    private readonly tag;
    value: DERObject;
    constructor(tag: number, value: DERObject);
    toDER(): number[];
}
export declare class SpcLinkUrl extends SpcLink {
    constructor(url: string);
}
export declare class SpcLinkFile extends SpcLink {
    constructor(file: string);
}

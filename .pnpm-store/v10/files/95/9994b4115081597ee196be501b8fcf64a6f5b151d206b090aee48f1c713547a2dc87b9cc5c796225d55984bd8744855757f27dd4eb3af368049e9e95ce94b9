import AlgorithmIdentifier from './AlgorithmIdentifier.js';
import DERObject from './DERObject.js';
export default class DigestInfo implements DERObject {
    digestAlgorithm: AlgorithmIdentifier;
    digest: ArrayBuffer | ArrayBufferView;
    constructor(digestAlgorithm: AlgorithmIdentifier, digest: ArrayBuffer | ArrayBufferView);
    toDER(): number[];
}

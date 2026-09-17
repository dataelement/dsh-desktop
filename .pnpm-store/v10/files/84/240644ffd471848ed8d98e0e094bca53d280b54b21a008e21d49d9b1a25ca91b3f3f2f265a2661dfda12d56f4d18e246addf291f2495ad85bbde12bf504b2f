import DigestAlgorithmIdentifier from './AlgorithmIdentifier.js';
import ContentInfo from './ContentInfo.js';
import DERObject from './DERObject.js';
export default class SignedData implements DERObject {
    version: number;
    digestAlgorithms: DigestAlgorithmIdentifier[];
    contentInfo: ContentInfo;
    signerInfos: DERObject[];
    certificates?: DERObject[] | undefined;
    crls?: DERObject[] | undefined;
    constructor(version: number, digestAlgorithms: DigestAlgorithmIdentifier[], contentInfo: ContentInfo, signerInfos: DERObject[], certificates?: DERObject[] | undefined, crls?: DERObject[] | undefined);
    toDER(): number[];
}

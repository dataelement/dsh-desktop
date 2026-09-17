import DERObject from './data/DERObject.js';
export declare function toUint8Array(bin: ArrayBuffer | ArrayBufferView): Uint8Array;
/** @return [length, afterOffset] */
export declare function calculateDERLength(data: number[] | Uint8Array, offset: number): [number, number];
/** @return [issuer, serialNumber] */
export declare function pickIssuerAndSerialNumberDERFromCert(bin: ArrayBuffer | ArrayBufferView | Array<ArrayBuffer | ArrayBufferView>): [number[], number[]];
export declare function certBinToCertificatesDER(bin: ArrayBuffer | ArrayBufferView | Array<ArrayBuffer | ArrayBufferView>): DERObject[];

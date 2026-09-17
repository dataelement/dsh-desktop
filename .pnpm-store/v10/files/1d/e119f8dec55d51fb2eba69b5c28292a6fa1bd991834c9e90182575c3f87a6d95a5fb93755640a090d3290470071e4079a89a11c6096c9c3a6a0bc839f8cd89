/**
 * Represents the raw-graphic icon item, such as PNG data.
 */
export default class RawIconItem {
    width: number;
    height: number;
    bitCount: number;
    bin: ArrayBuffer;
    constructor(bin: ArrayBuffer | ArrayBufferView, width: number, height: number, bitCount: number, byteOffset?: number, byteLength?: number);
    static from(bin: ArrayBuffer | ArrayBufferView, width: number, height: number, bitCount: number, byteOffset?: number, byteLength?: number): RawIconItem;
    isIcon(): false;
    isRaw(): this is RawIconItem;
}

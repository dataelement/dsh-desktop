declare class PickleIterator {
    private payload;
    private payloadOffset;
    private readIndex;
    private endIndex;
    constructor(pickle: Pickle);
    readBool(): boolean;
    readInt(): number;
    readUInt32(): number;
    readInt64(): bigint;
    readUInt64(): bigint;
    readFloat(): number;
    readDouble(): number;
    readString(): string;
    readBytes(length: number): Buffer;
    readBytes<R, F extends (...args: any[]) => R>(length: number, method: F): R;
    getReadPayloadOffsetAndAdvance(length: number): number;
    advance(size: number): void;
}
export declare class Pickle {
    private header;
    private headerSize;
    private capacityAfterHeader;
    private writeOffset;
    private constructor();
    static createEmpty(): Pickle;
    static createFromBuffer(buffer: Buffer): Pickle;
    getHeader(): Buffer;
    getHeaderSize(): number;
    createIterator(): PickleIterator;
    toBuffer(): Buffer;
    writeBool(value: boolean): boolean;
    writeInt(value: number): boolean;
    writeUInt32(value: number): boolean;
    writeInt64(value: number): boolean;
    writeUInt64(value: number): boolean;
    writeFloat(value: number): boolean;
    writeDouble(value: number): boolean;
    writeString(value: string): boolean;
    setPayloadSize(payloadSize: number): number;
    getPayloadSize(): number;
    writeBytes(data: string, length: number, method?: undefined): boolean;
    writeBytes(data: number | BigInt, length: number, method: Function): boolean;
    resize(newCapacity: number): void;
}
export {};

export default class StringTableItem {
    readonly length = 16;
    private _a;
    constructor();
    static fromEntry(bin: ArrayBuffer, offset: number, byteLength: number): StringTableItem;
    get(index: number): string | null;
    getAll(): Array<string | null>;
    set(index: number, val: string | null): void;
    calcByteLength(): number;
    generate(bin: ArrayBuffer, offset: number): number;
}

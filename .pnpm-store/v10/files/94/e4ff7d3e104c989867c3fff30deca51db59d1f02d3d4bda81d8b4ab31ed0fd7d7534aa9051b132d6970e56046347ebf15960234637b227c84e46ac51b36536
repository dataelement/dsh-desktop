import BitmapInfo from './BitmapInfo.js';
export default class IconItem {
    /**
     * Bitmap header data (`BITMAPINFOHEADER`)
     */
    readonly bitmapInfo: BitmapInfo;
    /**
     * Horizontal size of the icon in pixel (overrides `bitmapInfo.width`).
     * If `null` is specified, `bitmapInfo.width` will be used.
     */
    width: number | null;
    /**
     * Vertical size of the icon in pixel (overrides `bitmapInfo.height`).
     * If `null` is specified, `bitmapInfo.height` will be used.
     */
    height: number | null;
    /**
     * Bitmap pixel data used for mask
     * (the data will be appended immediately after `pixels` when generating icon binary)
     */
    masks: ArrayBuffer;
    /**
     * Bitmap pixel data
     */
    private _pixels;
    private constructor();
    /**
     * Bitmap pixel data.
     * @note
     * On set, if `bitmapInfo.sizeImage` is non-zero, `bitmapInfo.sizeImage` will be updated.
     */
    get pixels(): ArrayBuffer;
    /**
     * Bitmap pixel data.
     * @note
     * On set, if `bitmapInfo.sizeImage` is non-zero, `bitmapInfo.sizeImage` will be updated.
     */
    set pixels(newValue: ArrayBuffer);
    /**
     * Generates `IconItem` instance from bitmap data binary.
     * @param bin binary data containing the bitmap data
     * @param byteOffset byte offset of `bin` referring the bitmap data
     * @param byteLength available byte length for `bin` (from the offset `byteOffset`)
     */
    static from(bin: ArrayBuffer | ArrayBufferView, byteOffset?: number, byteLength?: number): IconItem;
    /**
     * Generates `IconItem` instance from bitmap data binary width actual icon size (width and height).
     * @param width icon width
     * @param height icon height
     * @param bin binary data containing the bitmap data
     * @param byteOffset byte offset of `bin` referring the bitmap data
     * @param byteLength available byte length for `bin` (from the offset `byteOffset`)
     */
    static from(width: number, height: number, bin: ArrayBuffer | ArrayBufferView, byteOffset?: number, byteLength?: number): IconItem;
    isIcon(): this is IconItem;
    isRaw(): false;
    generate(): ArrayBuffer;
}

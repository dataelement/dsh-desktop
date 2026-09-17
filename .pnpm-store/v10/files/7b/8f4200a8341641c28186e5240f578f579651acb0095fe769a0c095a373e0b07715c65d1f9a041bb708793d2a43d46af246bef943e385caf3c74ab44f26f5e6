import IconItem from './IconItem.js';
import RawIconItem from './RawIconItem.js';
/**
 * All fields except for 'data' is optional.
 * Missing fields are replaced by 'data' values when generating binary.
 */
export interface IconFileItem {
    width?: number;
    height?: number;
    colors?: number;
    planes?: number;
    bitCount?: number;
    data: IconItem | RawIconItem;
}
export default class IconFile {
    /** Containing icons */
    icons: IconFileItem[];
    constructor();
    static from(bin: ArrayBuffer | ArrayBufferView): IconFile;
    generate(): ArrayBuffer;
}

/**
 * EMF (Enhanced Metafile) binary parser — extracts embedded content from EMF files.
 *
 * PPTX files frequently embed EMF images as OLE object previews.
 * Most contain embedded PDF data inside GDI comment records, or DIB bitmaps
 * via STRETCHDIBITS records. This parser extracts those embedded resources
 * without implementing full EMF record interpretation.
 *
 * EMF record format: each record is { type: u32, size: u32, ...data }
 * Records are walked sequentially until EOF record (type 14).
 */
export type EmfContent = {
    type: 'pdf';
    data: Uint8Array;
} | {
    type: 'bitmap';
    imageData: ImageData;
} | {
    type: 'empty';
} | {
    type: 'unsupported';
};
/**
 * Parse an EMF file and extract its embedded content.
 */
export declare function parseEmfContent(data: Uint8Array): EmfContent;

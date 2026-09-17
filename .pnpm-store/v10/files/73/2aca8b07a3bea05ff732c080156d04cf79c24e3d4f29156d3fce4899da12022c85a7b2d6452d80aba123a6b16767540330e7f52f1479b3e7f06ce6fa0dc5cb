/** One statically declared local script or stylesheet, already read under the source file's authority. */
export interface HtmlAsset {
    readonly kind: 'script' | 'stylesheet';
    /** Original HTML attribute, not a Host absolute path. */
    readonly reference: string;
    readonly data: Uint8Array<ArrayBuffer>;
}
/** Complete bytes for one document; dependencies are finite and never requested by iframe messages. */
export interface HtmlBundle {
    readonly data: Uint8Array<ArrayBuffer>;
    readonly assets: readonly HtmlAsset[];
}
/**
 * Build the outer iframe document. Its resource URLs are created inside the sandbox,
 * because that opaque origin cannot load resource URLs created by the parent.
 * @param bundle - complete HTML bytes and optional static dependencies.
 * @returns bootstrap HTML; invalid UTF-8 throws before navigation.
 */
export declare function createHtmlDocument(bundle: HtmlBundle): string;
//# sourceMappingURL=bootstrap.d.ts.map
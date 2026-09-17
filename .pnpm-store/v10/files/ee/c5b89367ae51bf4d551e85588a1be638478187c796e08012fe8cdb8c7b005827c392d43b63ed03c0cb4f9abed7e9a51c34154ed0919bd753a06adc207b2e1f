/**
 * Safe XML parser using browser DOMParser.
 * All operations are null-safe — accessing missing elements never crashes.
 */
export declare class SafeXmlNode {
    private readonly el;
    constructor(el: Element | null);
    /** Get a string attribute value, or undefined if missing. */
    attr(name: string): string | undefined;
    private resolveAttributeNamespace;
    /** Get a numeric attribute value, or undefined if missing or not a number. */
    numAttr(name: string): number | undefined;
    /**
     * Find the first child element matching the given localName (namespace-agnostic).
     * Returns an empty SafeXmlNode if not found, so chaining never crashes.
     */
    child(localName: string): SafeXmlNode;
    /**
     * Get child elements, optionally filtered by localName (namespace-agnostic).
     * If no localName is given, returns all direct child elements.
     */
    children(localName?: string): SafeXmlNode[];
    /** Get the text content, or empty string if the element is missing. */
    text(): string;
    /** Whether the underlying element actually exists. */
    exists(): boolean;
    /** All direct child elements as SafeXmlNode[]. */
    allChildren(): SafeXmlNode[];
    /** The localName of the underlying element, or empty string. */
    get localName(): string;
    /** Raw access to the underlying Element (may be null). */
    get element(): Element | null;
}
/**
 * Parse an XML string into a SafeXmlNode wrapping the document element.
 * Uses the browser's built-in DOMParser.
 */
export declare function parseXml(xmlString: string): SafeXmlNode;

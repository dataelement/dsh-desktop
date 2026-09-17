/**
 * Predefined (built-in) Office table styles.
 *
 * PowerPoint has 74 predefined table styles that exist natively but are NOT
 * embedded in the PPTX's ppt/tableStyles.xml. Any PPTX can reference them by
 * UUID. This module generates synthetic XML matching the <a:tblStyle> schema
 * so they flow through the existing rendering pipeline unchanged.
 *
 * Derived from LibreOffice's predefined-table-styles.cxx (MPL-2.0) and
 * cross-verified against the Microsoft OOXML predefined style map.
 */
import { SafeXmlNode } from '../parser/XmlParser';
/**
 * Get a predefined table style by its UUID.
 * Returns the parsed SafeXmlNode (a:tblStyle element) or undefined if not a known predefined style.
 * Results are cached — same UUID always returns the same instance.
 */
export declare function getPredefinedTableStyle(styleId: string): SafeXmlNode | undefined;
/** Exported for testing: number of known predefined style UUIDs. */
export declare const PREDEFINED_STYLE_COUNT: number;
/** Exported for testing: all known style IDs. */
export declare function getAllPredefinedStyleIds(): string[];

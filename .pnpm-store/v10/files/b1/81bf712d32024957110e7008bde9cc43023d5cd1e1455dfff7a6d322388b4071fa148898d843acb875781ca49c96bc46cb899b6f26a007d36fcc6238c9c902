/**
 * Theme parser — extracts color scheme and font definitions from a:theme XML.
 */
import { SafeXmlNode } from '../parser/XmlParser';
export interface ThemeFontInfo {
    latin: string;
    ea: string;
    cs: string;
    scripts?: Record<string, string>;
}
export interface ThemeData {
    colorScheme: Map<string, string>;
    majorFont: ThemeFontInfo;
    minorFont: ThemeFontInfo;
    fillStyles: SafeXmlNode[];
    bgFillStyles?: SafeXmlNode[];
    lineStyles: SafeXmlNode[];
    effectStyles: SafeXmlNode[];
}
/**
 * Parse a theme XML root (`a:theme`) into ThemeData.
 */
export declare function parseTheme(root: SafeXmlNode): ThemeData;

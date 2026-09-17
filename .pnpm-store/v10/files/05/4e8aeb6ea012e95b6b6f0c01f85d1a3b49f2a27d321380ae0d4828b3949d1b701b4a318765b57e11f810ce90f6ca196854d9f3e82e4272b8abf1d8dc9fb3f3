/**
 * Parser for .rels (Relationship) XML files in OOXML packages.
 * These files map relationship IDs (rId1, rId2, ...) to targets.
 */
export interface RelEntry {
    type: string;
    target: string;
    targetMode?: string;
}
export declare function isExternalTargetMode(targetMode: string | undefined): boolean;
/**
 * Parse a .rels XML string into a Map of relationship ID -> RelEntry.
 *
 * Example input:
 * ```xml
 * <Relationships xmlns="...">
 *   <Relationship Id="rId1" Type="http://...slide" Target="slides/slide1.xml"/>
 * </Relationships>
 * ```
 */
export declare function parseRels(xmlString: string): Map<string, RelEntry>;
/**
 * Resolve a relative target path against a base path.
 *
 * Examples:
 *   resolveRelTarget('ppt/slides', '../slideLayouts/slideLayout1.xml')
 *     → 'ppt/slideLayouts/slideLayout1.xml'
 *
 *   resolveRelTarget('ppt/slides', 'media/image1.png')
 *     → 'ppt/slides/media/image1.png'
 *
 *   resolveRelTarget('ppt', 'slides/slide1.xml')
 *     → 'ppt/slides/slide1.xml'
 */
export declare function resolveRelTarget(basePath: string, target: string): string;

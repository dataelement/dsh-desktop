import { type PresentationData } from '../model/Presentation';
import type { NodeType, Position, Size } from '../model/nodes/BaseNode';
export type SearchTextKind = 'shape' | 'table-cell';
export interface TextBounds extends Position, Size {
}
export interface TextIndexOptions {
    includeShapes?: boolean;
    includeTables?: boolean;
    includeGroups?: boolean;
}
export interface TextIndexEntry {
    slideIndex: number;
    nodeId: string;
    nodePath: string;
    nodeType: NodeType;
    textKind: SearchTextKind;
    text: string;
    bounds: TextBounds;
    paragraphIndex?: number;
    rowIndex?: number;
    cellIndex?: number;
}
export interface TextSearchOptions {
    matchCase?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
    snippetRadius?: number;
}
export interface TextSearchResult extends TextIndexEntry {
    matchStart: number;
    matchEnd: number;
    snippet: string;
}
export declare const buildTextIndex: (presentation: PresentationData, options?: TextIndexOptions) => TextIndexEntry[];
export declare const searchText: (index: readonly TextIndexEntry[], query: string | RegExp, options?: TextSearchOptions) => TextSearchResult[];
export declare const searchPresentation: (presentation: PresentationData, query: string | RegExp, options?: TextSearchOptions & TextIndexOptions) => TextSearchResult[];

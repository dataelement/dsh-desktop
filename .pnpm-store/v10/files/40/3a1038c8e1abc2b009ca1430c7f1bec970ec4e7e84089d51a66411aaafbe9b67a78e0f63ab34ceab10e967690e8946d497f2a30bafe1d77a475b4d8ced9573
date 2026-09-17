/**
 * Top-level presentation builder — assembles all parsed components
 * (themes, masters, layouts, slides) into a single PresentationData structure.
 */
import { PptxFiles } from '../parser/ZipParser';
import type { MediaResolver } from '../utils/media';
import { SafeXmlNode } from '../parser/XmlParser';
import { ThemeData } from './Theme';
import { MasterData } from './Master';
import { LayoutData } from './Layout';
import { SlideData, SlideNode } from './Slide';
import { BaseNodeData } from './nodes/BaseNode';
import type { GroupNodeData } from './nodes/GroupNode';
export interface PresentationData {
    width: number;
    height: number;
    slides: SlideData[];
    layouts: Map<string, LayoutData>;
    masters: Map<string, MasterData>;
    themes: Map<string, ThemeData>;
    slideToLayout: Map<number, string>;
    layoutToMaster: Map<string, string>;
    masterToTheme: Map<string, string>;
    media: Map<string, Uint8Array>;
    mediaResolver?: MediaResolver;
    tableStyles?: SafeXmlNode;
    /** Presentation-wide default text style from ppt/presentation.xml. */
    defaultTextStyle?: SafeXmlNode;
    charts: Map<string, SafeXmlNode>;
    /** SmartArt fallback drawing parts keyed by part path (ppt/diagrams/drawing*.xml). */
    diagramDrawings?: Map<string, string>;
    /** Chart-local theme overrides keyed by chart part path. */
    chartThemes?: Map<string, ThemeData>;
    /** Chart style parts keyed by chart part path. */
    chartStyles?: Map<string, SafeXmlNode>;
    /** Chart color style parts keyed by chart part path. */
    chartColorStyles?: Map<string, SafeXmlNode>;
    isWps: boolean;
}
export interface BuildPresentationOptions {
    /**
     * Defer per-slide shape/table/chart node parsing until a slide is rendered,
     * searched, serialized, or explicitly materialized.
     */
    lazySlides?: boolean;
}
/**
 * Build the complete PresentationData from extracted PPTX files.
 *
 * This is the main factory function that wires together all parsed components:
 * 1. Parses presentation.xml for slide ordering and size
 * 2. Resolves the full relationship chain: slide → layout → master → theme
 * 3. Parses each component and assembles the final structure
 */
export declare function buildPresentation(files: PptxFiles, options?: BuildPresentationOptions): PresentationData;
export declare function materializeSlideNodes(pres: PresentationData, slide: SlideData): void;
export declare function materializeAllSlideNodes(pres: PresentationData): void;
interface PlaceholderInheritanceOptions {
    /**
     * Parent group for lazy-parsed group children. Layout/master placeholders are
     * stored in slide coordinates, while group children render in the group's
     * child coordinate space, so inherited xfrm must be inverted before remap.
     */
    parentGroup?: GroupNodeData;
}
export declare function resolveNodePlaceholderInheritance(node: SlideNode | BaseNodeData, layout: LayoutData | undefined, master: MasterData | undefined, options?: PlaceholderInheritanceOptions): void;
export {};

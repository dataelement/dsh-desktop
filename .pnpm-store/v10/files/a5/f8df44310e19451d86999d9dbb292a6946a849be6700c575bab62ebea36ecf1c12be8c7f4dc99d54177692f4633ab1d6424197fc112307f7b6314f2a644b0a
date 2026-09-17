/**
 * Slide parser — converts a slide XML into a structured SlideData
 * with typed node objects for each shape on the slide.
 */
import { SafeXmlNode } from '../parser/XmlParser';
import { RelEntry } from '../parser/RelParser';
import { type RenderableNode } from './RenderableChild';
export { parseOleFrameAsPicture } from './RenderableChild';
export type SlideNode = RenderableNode;
export interface SlideData {
    index: number;
    /** True when p:sld@show is false/0; hidden slides stay addressable but are skipped by PDF exports. */
    hidden?: boolean;
    nodes: SlideNode[];
    background?: SafeXmlNode;
    layoutIndex: string;
    rels: Map<string, RelEntry>;
    /** Full path to the slide file (e.g. "ppt/slides/slide3.xml"). */
    slidePath: string;
    /** When false, shapes from the layout and master should NOT be rendered on this slide. */
    showMasterSp: boolean;
    /** @internal Raw slide XML used when slide node parsing is deferred. */
    sourceXml?: string;
    /** @internal Whether `nodes` has been parsed from `sourceXml`. */
    nodesMaterialized?: boolean;
    /** @internal Whether layout/master placeholder inheritance has been applied. */
    placeholderInheritanceResolved?: boolean;
}
/**
 * Parse a slide XML root (`p:sld`) into SlideData.
 *
 * @param root      Parsed XML root of the slide
 * @param index     Zero-based slide index
 * @param rels      Relationship entries for this slide
 * @param slidePath Full path to the slide file (e.g. "ppt/slides/slide1.xml")
 */
export declare function parseSlide(root: SafeXmlNode, index: number, rels: Map<string, RelEntry>, slidePath?: string, diagramDrawings?: Map<string, string>): SlideData;
export declare function createLazySlide(sourceXml: string, index: number, rels: Map<string, RelEntry>, slidePath?: string): SlideData;
export declare function materializeSlideData(slide: SlideData, diagramDrawings?: Map<string, string>): void;

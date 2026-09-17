/**
 * Render context — provides resolved theme/master/layout chain for a given slide.
 */
import { PresentationData } from '../model/Presentation';
import { SlideData } from '../model/Slide';
import { ThemeData } from '../model/Theme';
import { MasterData } from '../model/Master';
import { LayoutData } from '../model/Layout';
import { SafeXmlNode } from '../parser/XmlParser';
import type { EChartsType } from 'echarts/core';
import type { PdfjsConfig } from '../utils/pdfRenderer';
export interface RenderContext {
    presentation: PresentationData;
    slide: SlideData;
    theme: ThemeData;
    master: MasterData;
    layout: LayoutData;
    /** Current OOXML part path used for resolving relationships while rendering this context. */
    partPath?: string;
    /** Resolved slide layout part path for the current slide. */
    layoutPath?: string;
    /** Resolved slide master part path for the current slide. */
    masterPath?: string;
    mediaUrlCache: Map<string, string>;
    colorCache: Map<string, {
        color: string;
        alpha: number;
    }>;
    /** Async media/rendering work that callers may await before screenshot/export. */
    asyncTasks?: Promise<void>[];
    /** Aborted when the owning slide is disposed; async renderers must stop late writes. */
    signal?: AbortSignal;
    /** Optional pdfjs URLs for EMF-embedded PDF fallback rendering. */
    pdfjs?: PdfjsConfig;
    /** Shared set of live ECharts instances for explicit disposal. */
    chartInstances?: Set<EChartsType>;
    /** Fill node from parent group's grpSpPr, used to resolve `a:grpFill` in children. */
    groupFillNode?: SafeXmlNode;
    /** Connected root used for hidden text measurement while slide nodes are still detached. */
    measurementRoot?: HTMLElement;
    /** Template rendering skips placeholder descendants inside groups as well as top-level shapes. */
    skipPlaceholderChildren?: boolean;
    /**
     * Navigation callback for shape-level hyperlink actions (action buttons, clickable shapes).
     * Called with target slide index (0-based) for supported internal slide actions,
     * or with a URL string for external links.
     */
    onNavigate?: (target: {
        slideIndex?: number;
        url?: string;
    }) => void;
}
export declare function createRenderContext(presentation: PresentationData, slide: SlideData, mediaUrlCache?: Map<string, string>, chartInstances?: Set<EChartsType>, pdfjs?: PdfjsConfig, signal?: AbortSignal): RenderContext;

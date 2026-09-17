/**
 * Slide renderer — orchestrates rendering of a complete slide with all its nodes.
 */
import { SlideData } from '../model/Slide';
import { PresentationData } from '../model/Presentation';
import type { EChartsType } from 'echarts/core';
import type { PdfjsConfig } from '../utils/pdfRenderer';
export interface SlideRendererOptions {
    /** Called when a single node fails to render. */
    onNodeError?: (nodeId: string, error: unknown) => void;
    /**
     * Navigation callback for shape-level hyperlink actions (action buttons, etc.).
     * Called with target slide index (0-based) for slide jumps,
     * or with a URL string for external links.
     */
    onNavigate?: (target: {
        slideIndex?: number;
        url?: string;
    }) => void;
    /** Shared media URL cache for blob URL reuse across slides. */
    mediaUrlCache?: Map<string, string>;
    /** Optional pdfjs URLs for EMF-embedded PDF fallback rendering. */
    pdfjs?: PdfjsConfig;
    /** Shared set of live ECharts instances for explicit disposal. */
    chartInstances?: Set<EChartsType>;
}
/**
 * Per-slide resource handle returned by `renderSlide()`.
 * Allows the caller to dispose of slide-specific resources (chart instances,
 * blob URLs in standalone mode) without tearing down the whole viewer.
 */
export interface SlideHandle {
    /** The rendered slide DOM element. */
    readonly element: HTMLElement;
    /** Resolves when asynchronous slide resources (for example EMF-PDF fallbacks) finish. */
    readonly ready: Promise<void>;
    /** Dispose slide-specific resources (charts inside this slide, blob URLs if standalone). */
    dispose(): void;
    /** Support `using` declarations (TC39 Explicit Resource Management). */
    [Symbol.dispose](): void;
}
/**
 * Render a complete slide into an HTML element.
 *
 * Rendering order:
 * 1. Background (slide → layout → master inheritance)
 * 2. Master non-placeholder shapes (behind everything)
 * 3. Layout non-placeholder shapes
 * 4. Slide shapes (on top)
 */
export declare function renderSlide(presentation: PresentationData, slide: SlideData, options?: SlideRendererOptions): SlideHandle;

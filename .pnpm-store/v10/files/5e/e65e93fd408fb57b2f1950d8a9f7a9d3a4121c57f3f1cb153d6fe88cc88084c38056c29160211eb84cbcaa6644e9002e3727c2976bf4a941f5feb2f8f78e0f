import type { ZipParseLimits } from '../parser/ZipParser';
import { PptxViewer } from './Viewer';
import type { FitMode, PreviewInput } from './Viewer';
import type { PdfjsConfig } from '../utils/pdfRenderer';
export type { PreviewInput, FitMode } from './Viewer';
export type { SlideHandle } from '../renderer/SlideRenderer';
export interface RendererOptions {
    width?: number;
    mode?: 'list' | 'slide';
    /** Scaling mode. contain = fit container width, none = use intrinsic slide size. */
    fitMode?: FitMode;
    /** Initial zoom percentage. Effective scale = fitScale * zoomPercent/100. */
    zoomPercent?: number;
    /** Optional ZIP parsing limits for controlling resource usage and DoS surface. */
    zipLimits?: ZipParseLimits;
    /** Decode embedded media on demand instead of during ZIP parsing. Default `false`. */
    lazyMedia?: boolean;
    /** Parse slide shape/table/chart nodes on demand instead of during model build. Default `false`. */
    lazySlides?: boolean;
    /** Optional pdfjs URLs for EMF-embedded PDF fallback rendering. Use `false` to disable. */
    pdfjs?: PdfjsConfig;
    /**
     * Number of slides rendered per batch in list mode.
     * Lower values improve UI responsiveness for large decks.
     */
    listRenderBatchSize?: number;
    /**
     * List-mode mounting strategy.
     * - full: render and mount all slides (default, backward compatible)
     * - windowed: mount only visible/nearby slides to reduce DOM/memory pressure
     */
    listMountStrategy?: 'full' | 'windowed';
    /** Number of slides mounted immediately in windowed list mode. */
    windowedInitialSlides?: number;
    /** Overscan in viewport heights for windowed mounting. */
    windowedOverscanViewport?: number;
    /**
     * Scroll container element used as IntersectionObserver root in list mode
     * (both windowed mounting and scroll-based slide tracking).
     * When omitted, the viewport (null root) is used.
     */
    scrollContainer?: HTMLElement;
    onSlideError?: (index: number, error: unknown) => void;
    onNodeError?: (nodeId: string, error: unknown) => void;
    /** Called after each slide finishes rendering. May fire multiple times for the same slide in windowed list mode. */
    onSlideRendered?: (index: number, element: HTMLElement) => void;
    /** Called when the active slide changes. Fires in both list mode (scroll tracking) and slide mode (goToSlide, navigation). */
    onSlideChange?: (index: number) => void;
    /** Called after a slide is unmounted in windowed list mode. */
    onSlideUnmounted?: (index: number) => void;
}
/** @deprecated Use `PptxViewer` instead. */
export declare class PptxRenderer extends PptxViewer {
    private rendererMode;
    private rendererListOptions;
    private rendererZipLimits?;
    private rendererLazyMedia;
    private rendererLazySlides;
    private previewAbortController;
    constructor(container: HTMLElement, options?: RendererOptions);
    /** @deprecated Use `PptxViewer.open()` or `viewer.load()` + `viewer.renderList()` */
    preview(input: PreviewInput, options?: {
        signal?: AbortSignal;
    }): Promise<{
        slideCount: number;
        elapsed: number;
    }>;
    /** Appends prev/next navigation buttons after rendering a single slide. */
    protected afterSingleSlideRender(): void;
    destroy(): void;
}

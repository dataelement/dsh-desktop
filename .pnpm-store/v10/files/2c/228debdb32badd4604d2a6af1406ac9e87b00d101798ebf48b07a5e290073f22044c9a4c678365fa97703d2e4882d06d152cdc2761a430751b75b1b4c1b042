import type { ZipParseLimits } from '../parser/ZipParser';
import { PresentationData } from '../model/Presentation';
import type { SlideHandle } from '../renderer/SlideRenderer';
import { type TextIndexOptions, type TextSearchOptions, type TextSearchResult } from '../search/TextSearch';
import type { PdfjsConfig } from '../utils/pdfRenderer';
export type { SlideHandle } from '../renderer/SlideRenderer';
export type FitMode = 'contain' | 'none';
export type PreviewInput = ArrayBuffer | Uint8Array | Blob;
export interface ViewerOptions {
    width?: number;
    /** Scaling mode. contain = fit container width, none = use intrinsic slide size. */
    fitMode?: FitMode;
    /** Initial zoom percentage. Effective scale = fitScale * zoomPercent/100. */
    zoomPercent?: number;
    /**
     * Scroll container element used as IntersectionObserver root in list mode
     * (both windowed mounting and scroll-based slide tracking).
     * When omitted, the viewport (null root) is used.
     */
    scrollContainer?: HTMLElement;
    /** Optional ZIP parsing limits for controlling resource usage and DoS surface. */
    zipLimits?: ZipParseLimits;
    /** Decode embedded media on demand instead of during ZIP parsing. Default `false`. */
    lazyMedia?: boolean;
    /** Parse slide shape/table/chart nodes on demand instead of during model build. Default `false`. */
    lazySlides?: boolean;
    /** Optional pdfjs URLs for EMF-embedded PDF fallback rendering. Use `false` to disable. */
    pdfjs?: PdfjsConfig;
    onSlideChange?: (index: number) => void;
    onSlideRendered?: (index: number, element: HTMLElement) => void;
    onSlideError?: (index: number, error: unknown) => void;
    onSlideUnmounted?: (index: number) => void;
    onNodeError?: (nodeId: string, error: unknown) => void;
    onRenderStart?: () => void;
    onRenderComplete?: () => void;
}
export interface ListRenderOptions {
    windowed?: boolean;
    batchSize?: number;
    initialSlides?: number;
    overscanViewport?: number;
    /** Show "Slide N" labels below each slide. Default `false`. */
    showSlideLabels?: boolean;
}
export interface ThumbnailRenderOptions {
    /** Target preview width in CSS pixels. Preserves the slide aspect ratio. */
    width?: number;
    /** Target preview height in CSS pixels. Preserves the slide aspect ratio. */
    height?: number;
    /** Explicit scale factor. Takes precedence over width/height when provided. */
    scale?: number;
}
export interface SearchHighlightOptions {
    /** Additional CSS class for application-specific styling. */
    className?: string;
    /** Border color for the highlight overlay. */
    borderColor?: string;
    /** Fill color for the highlight overlay. */
    backgroundColor?: string;
    /** CSS box-shadow for the highlight overlay. */
    boxShadow?: string;
    /** Overlay border radius. Numbers are treated as CSS pixels. */
    borderRadius?: number | string;
    /** Overlay border width. Numbers are treated as CSS pixels. */
    borderWidth?: number | string;
    /** Extra intrinsic-slide padding around the matched node bounds. */
    padding?: number;
    /** z-index applied to the overlay. */
    zIndex?: number;
    /** Additional inline CSS properties applied after the default/custom fields. */
    style?: Record<string, string | number | undefined>;
    /** Scroll or navigate to the result before drawing. Defaults to `true`. */
    scrollIntoView?: boolean | ScrollIntoViewOptions;
}
export interface SearchHighlightHandle {
    element: HTMLElement;
    result: TextSearchResult;
    dispose(): void;
    [Symbol.dispose](): void;
}
export interface PptxViewerEventMap {
    renderstart: Event;
    rendercomplete: Event;
    slidechange: CustomEvent<{
        index: number;
    }>;
    sliderendered: CustomEvent<{
        index: number;
        element: HTMLElement;
    }>;
    slideerror: CustomEvent<{
        index: number;
        error: unknown;
    }>;
    slideunmounted: CustomEvent<{
        index: number;
    }>;
    nodeerror: CustomEvent<{
        nodeId: string;
        error: unknown;
    }>;
}
export declare class PptxViewer extends EventTarget {
    protected container: HTMLElement;
    private viewerOptions;
    private presentation;
    private mediaUrlCache;
    private chartInstances;
    private currentSlide;
    private _fitMode;
    private _isRendering;
    private zoomFactor;
    private renderChain;
    private renderGeneration;
    private cleanupListMount?;
    private cleanupScrollObserver?;
    private suppressScrollChange;
    private ensureListSlideMountedFn?;
    private resizeObserver?;
    private windowResizeHandler?;
    private resizeRafId;
    private lastMeasuredContainerWidth;
    private mountedSlides;
    private slideHandles;
    private searchHighlightHandles;
    private textIndexCache;
    private activeRenderMode;
    private listOptions;
    constructor(container: HTMLElement, options?: ViewerOptions);
    private emitRenderStart;
    private emitRenderComplete;
    private emitSlideChange;
    private emitSlideRendered;
    private emitSlideError;
    private emitSlideUnmounted;
    private emitNodeError;
    /**
     * Load a parsed presentation model. Does NOT render — call `renderList()` or
     * `renderSlide()` afterwards.
     */
    load(presentation: PresentationData): void;
    /**
     * Render all slides in a scrollable list.
     */
    renderList(options?: ListRenderOptions): Promise<void>;
    /**
     * Render a single slide (no built-in nav UI).
     */
    renderSlide(index?: number): Promise<void>;
    open(input: PreviewInput, options?: {
        renderMode?: 'list' | 'slide';
        listOptions?: ListRenderOptions;
        signal?: AbortSignal;
        lazyMedia?: boolean;
        lazySlides?: boolean;
    }): Promise<void>;
    static open(input: PreviewInput, container: HTMLElement, options?: ViewerOptions & {
        renderMode?: 'list' | 'slide';
        listOptions?: ListRenderOptions;
        signal?: AbortSignal;
        lazyMedia?: boolean;
        lazySlides?: boolean;
    }): Promise<PptxViewer>;
    goToSlide(index: number, scrollOptions?: ScrollIntoViewOptions): Promise<void>;
    setZoom(percent: number): Promise<void>;
    setFitMode(mode: FitMode): Promise<void>;
    get presentationData(): PresentationData | null;
    get slideCount(): number;
    get slideWidth(): number;
    get slideHeight(): number;
    get currentSlideIndex(): number;
    get isRendering(): boolean;
    get zoomPercent(): number;
    get fitMode(): FitMode;
    on<K extends keyof PptxViewerEventMap>(type: K, listener: (event: PptxViewerEventMap[K]) => void): this;
    off<K extends keyof PptxViewerEventMap>(type: K, listener: (event: PptxViewerEventMap[K]) => void): this;
    isSlideMounted(index: number): boolean;
    getMountedSlides(): number[];
    /**
     * Render a single slide into an external container element.
     * Useful for React/Vue integration, thumbnail generation, etc.
     *
     * **Ownership:** The caller owns the returned {@link SlideHandle} and is
     * responsible for calling `handle.dispose()` when the slide is no longer
     * needed. `destroy()` does NOT automatically dispose externally-rendered
     * handles.
     */
    renderSlideToContainer(index: number, container: HTMLElement, scale?: number): SlideHandle | null;
    /**
     * Search loaded presentation text without depending on rendered DOM.
     * Results point to slide/node locations that callers can use for navigation
     * or custom highlighting.
     */
    searchText(query: string | RegExp, options?: TextSearchOptions & TextIndexOptions): TextSearchResult[];
    /**
     * Render a scaled preview of a slide into an external container.
     * The slide is still laid out at intrinsic size and then transformed, so this
     * avoids thumbnail-only reflow differences.
     */
    renderThumbnailToContainer(index: number, container: HTMLElement, options?: ThumbnailRenderOptions): SlideHandle | null;
    /**
     * Draw a node-level overlay for a text search result.
     *
     * The overlay uses result bounds in intrinsic slide coordinates and is
     * transformed together with the rendered slide. It does not modify slide text.
     */
    highlightSearchResult(result: TextSearchResult, options?: SearchHighlightOptions): Promise<SearchHighlightHandle | null>;
    clearSearchHighlights(): void;
    /**
     * Hook called after rendering a single slide. Override in subclasses to
     * append additional UI (e.g. navigation buttons).
     */
    protected afterSingleSlideRender(): void;
    destroy(): void;
    private unloadRenderedState;
    [Symbol.dispose](): void;
    private normalizeZoomPercent;
    private normalizeBatchSize;
    private normalizePositiveInt;
    private normalizePositiveFloat;
    private toCssLength;
    private prepareSearchHighlightTarget;
    private findRenderedSlideElement;
    private applySearchHighlightStyle;
    private getTextIndex;
    private getThumbnailScale;
    private getDisplayMetrics;
    private queueRender;
    private isRenderStale;
    private handleContainerResize;
    private setupAdaptiveResize;
    private teardownAdaptiveResize;
    private disposeAllCharts;
    private createListSlideItem;
    private mountListSlide;
    private unmountListSlide;
    private renderAllSlidesFull;
    private renderAllSlidesWindowed;
    private setupScrollSlideTracking;
    private renderSingleSlide;
    /**
     * After list-mode rendering, a scrollbar may appear on the page body
     * (or a scroll ancestor), narrowing the container. If the container's
     * clientWidth now differs from the width used to compute the initial
     * scale, patch every wrapper's dimensions and each slide element's
     * transform in-place — no DOM rebuild required.
     */
    private correctListMetricsIfNeeded;
    private handleNavigate;
}
export declare function normalizePreviewInput(input: PreviewInput): Promise<ArrayBuffer>;

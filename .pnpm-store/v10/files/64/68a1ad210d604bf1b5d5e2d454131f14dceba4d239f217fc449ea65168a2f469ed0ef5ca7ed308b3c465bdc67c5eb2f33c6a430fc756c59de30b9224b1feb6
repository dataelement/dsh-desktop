/** How the document owner delivers file contents to a renderer. */
export type DocumentLoadMode = 'text-pages' | 'bytes-complete';
/** One renderer implementation, independent of its component registration. */
export interface DocumentPreviewDefinition {
    /** Unique implementation name, also used as the document slot key. */
    readonly id: string;
    /** File suffixes without a leading dot; compound suffixes such as tar.gz are accepted. */
    readonly extensions: readonly string[];
    /** External implementations win over product implementations; defaults to extension. */
    readonly priority?: 'builtin' | 'extension';
    /** Localized implementation label, evaluated when the toolbar renders. @returns the visible name. */
    readonly title: () => string;
    /** Content delivery mode supplied by the document owner. */
    readonly loading: DocumentLoadMode;
    /** Whether the implementation consumes the document's wrap preference. */
    readonly wrap?: boolean;
}
/**
 * Rank an observed definition snapshot without consulting mutable service state.
 * @param definitions - registered implementations in registration order.
 * @param path - decoded filename or file path.
 * @returns matching implementations, external band first, then longest suffix.
 */
export declare function matchingDocumentPreviews(definitions: readonly DocumentPreviewDefinition[], path: string): readonly DocumentPreviewDefinition[];
/** Observable registry of all live implementations, including lower-priority alternatives. */
export declare class DocumentPreviewRegistry {
    private readonly registered;
    private readonly listeners;
    private snapshot;
    /**
     * Read the current registrations.
     * @returns the same snapshot until a registration changes.
     */
    readonly getSnapshot: () => readonly DocumentPreviewDefinition[];
    /**
     * Observe registration changes.
     * @param listener - registration-change observer.
     * @returns its disposer.
     */
    readonly subscribe: (listener: () => void) => (() => void);
    /**
     * Register metadata separately from the matching keyed slot component.
     * @param definition - unique implementation and recognized suffixes.
     * @returns an idempotent disposer; duplicate live implementation names throw.
     */
    register(definition: DocumentPreviewDefinition): () => void;
    /**
     * List every matching implementation in automatic-selection order.
     * @param path - decoded file path; matching never resolves filesystem access.
     * @returns extension band first, then longest suffix, then registration order.
     */
    candidates(path: string): readonly DocumentPreviewDefinition[];
    private publish;
}
//# sourceMappingURL=registry.d.ts.map
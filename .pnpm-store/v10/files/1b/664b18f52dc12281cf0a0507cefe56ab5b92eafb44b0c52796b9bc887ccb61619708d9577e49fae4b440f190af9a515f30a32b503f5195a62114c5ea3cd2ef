/** Localized strings consumed by one pending-file card. */
export interface FileCardLabels {
    /** Card body announcement, e.g. "Pending file {name}". */
    readonly label: string;
    /** Remove-button label. */
    readonly remove: string;
    /** Status line while the upload is in flight. */
    readonly uploading: string;
    /** Status line and retry affordance after a failed upload. */
    readonly failed: string;
    /** Retry-button label. */
    readonly retry: string;
}
/** Upload display state resolved by the owner. */
export type FileCardState = 'uploading' | 'ready' | 'error';
/** One pending file card: type glyph, name, size or upload status, remove, retry. */
export declare function FileCard({ name, bytes, state, progress, labels, onRemove, onRetry, }: {
    name: string;
    bytes: number;
    state: FileCardState;
    progress?: number;
    labels: FileCardLabels;
    onRemove: () => void;
    onRetry: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=FileCard.d.ts.map
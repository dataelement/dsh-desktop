/**
 * Curated editor for the direct DeepSeek adapter's advisory model catalog.
 * The settings layer replaces `models` as one array, so the parent supplies
 * the effective inherited rows until the first edit materializes a user
 * override; reset removes that override instead of copying defaults into it.
 */
import type { ReactNode } from 'react';
import type { en } from './locales.ts';
/** One catalog entry kept structurally open so hidden or future fields survive an edit. */
export type DeepSeekModelDraft = Record<string, unknown>;
/**
 * Read a typed capacity, so a user can write `256K` or `1M` instead of counting
 * zeroes. The stored value stays a plain token count.
 * @param text - raw field text.
 * @returns the count; `undefined` when blank (inherit), `NaN` when unreadable
 * (rejected by {@link validateDeepSeekModels} before any write).
 */
export declare function parseCapacity(text: string): number | undefined;
/**
 * Spell a stored count back in the shortest form that survives a round trip
 * through {@link parseCapacity}; a count that is not a whole number of
 * thousands stays written out.
 * @param value - stored capacity.
 * @returns the field text.
 */
export declare function formatCapacity(value: number): string;
/** A localized validation failure for one user-owned model array. */
export interface DeepSeekModelsValidationFailure {
    /** Zero-based model position. */
    index: number;
    /** Message key owned by the Models settings section. */
    key: 'modelIdRequired' | 'modelIdDuplicate' | 'modelNameInvalid' | 'modelContextInvalid' | 'modelMaxTokensInvalid';
}
/** Convert a schema-validated catalog value into records without dropping hidden fields. */
export declare function modelDrafts(value: unknown): DeepSeekModelDraft[];
/**
 * Validate adapter constraints that the serialized schema cannot express.
 * @param value - user-owned `models` value, or undefined while inherited.
 * @returns the first invalid row, or undefined when the adapter will accept it.
 */
export declare function validateDeepSeekModels(value: unknown): DeepSeekModelsValidationFailure | undefined;
/** Props of {@link DeepSeekModelsEditor}. */
export interface DeepSeekModelsEditorProps {
    /** Effective rows: inherited until the parent materializes an override. */
    models: readonly DeepSeekModelDraft[];
    /** Whether the user layer currently owns the whole array. */
    overridden: boolean;
    /** Fallback context capacity used when a row omits its exact value. */
    defaultContextWindow: number | undefined;
    /** Fallback output cap used when a row omits its exact value. */
    defaultMaxTokens: number | undefined;
    /** Section copy. */
    t: (key: keyof typeof en) => string;
    /** Disable every mutation. */
    disabled: boolean;
    /** Replace the user-owned array after one visible edit. */
    onChange: (models: DeepSeekModelDraft[]) => void;
    /** Remove the user-owned array and return to inheritance. */
    onReset: () => void;
}
/**
 * Render the direct DeepSeek adapter's model catalog: id and display name on
 * each row, capacities behind the row's own disclosure.
 * @param props - effective rows plus the array-level override actions.
 * @returns the catalog editor.
 */
export declare function DeepSeekModelsEditor(props: DeepSeekModelsEditorProps): ReactNode;
//# sourceMappingURL=DeepSeekModelsEditor.d.ts.map
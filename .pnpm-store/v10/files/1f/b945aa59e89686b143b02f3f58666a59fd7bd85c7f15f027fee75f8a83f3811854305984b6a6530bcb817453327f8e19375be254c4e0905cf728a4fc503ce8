/**
 * The model list of one pi-ai provider profile, plus the action that asks the
 * provider what it serves.
 *
 * The list is the profile's `models` array as the card holds it: an empty list
 * means "serve this route's built-in catalog", and any entry replaces that
 * catalog, so a row is only ever added deliberately. Fetching asks the endpoint
 * **the form currently shows** — including a key typed but not yet saved — so
 * adding a provider is one pass instead of save-then-return; the reply is
 * candidates the user picks from, never configuration written behind them.
 *
 * A provider that cannot be interrogated (an unreachable endpoint, a protocol
 * with no readable listing) is not a dead end: the failure is shown next to the
 * rows the user can still fill in by hand.
 */
import type { ReactNode } from 'react';
import type { ModelsOperations } from './operations.ts';
import type { DeepSeekModelDraft } from './DeepSeekModelsEditor.tsx';
import type { en } from './locales.ts';
/**
 * One configured model row. Fields this card does not edit must survive an
 * edit rather than being dropped by a rebuild.
 */
export type ModelDraft = DeepSeekModelDraft;
/** What an interrogation needs, taken from the live form. */
export interface ProbeTarget {
    /** Settings namespace whose adapter family answers. */
    settingsNs: string;
    /**
     * Route being edited, when the card edits one. An adapter that already
     * describes it answers from its own registry, so such a card can ask without
     * an endpoint at all.
     */
    provider?: string;
    /** Endpoint as the form currently shows it. */
    baseURL?: string;
    /** Wire protocol the form names, when it names one. */
    api?: string;
    /** Key typed into the form and not yet stored, when there is one. */
    apiKey?: string;
}
/** Props of {@link ModelListEditor}. */
export interface ModelListEditorProps {
    /** The rows as currently drafted. */
    models: readonly ModelDraft[];
    /** Whether the user layer currently owns the whole array; absent on a create. */
    overridden?: boolean;
    /** Replace the drafted rows. */
    onChange: (models: ModelDraft[]) => void;
    /** Remove the user-owned array and return to inheritance; absent on a create. */
    onReset?: () => void;
    /** Endpoint facts for the fetch action. */
    probe: ProbeTarget;
    /**
     * Copy key naming why the fetch action is unavailable, or `undefined` when
     * it is. The card owns this because the key it would send is judged there:
     * asking with a key the form has already refused spends a round trip to be
     * told what the field already says.
     */
    probeBlocked?: keyof typeof en | undefined;
    /** The Host operations whose interrogation answers the fetch action. */
    operations: ModelsOperations;
    /** Section copy. */
    t: (key: keyof typeof en) => string;
    /** Disable every control (read-only deployment or a pending write). */
    disabled: boolean;
}
/**
 * Render the model list with its fetch action.
 * @param props - the drafted rows, probe target, wire face, and copy.
 * @returns the model-list editor.
 */
export declare function ModelListEditor(props: ModelListEditorProps): ReactNode;
//# sourceMappingURL=ModelListEditor.d.ts.map
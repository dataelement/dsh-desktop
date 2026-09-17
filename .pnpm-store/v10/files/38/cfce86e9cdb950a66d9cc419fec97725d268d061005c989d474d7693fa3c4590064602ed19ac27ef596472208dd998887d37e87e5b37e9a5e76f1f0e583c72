/**
 * Shared form model behind every plugin card.
 *
 * A card stages what the user types and writes it only when they save. Each
 * settings write is a durable, revision-fenced document mutation, so a control
 * that committed as it settled turned one edit into a write the user never
 * asked for and could not preview; staged text makes what is on screen exactly
 * what a save would store.
 *
 * A field shows its effective value — the user layer over the composition
 * layer over the schema default — and whether the user layer carries it. That
 * presence, not a value comparison, is what marks a field overridden: an
 * override equal to the composition default is still an override.
 */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client';
/** The write one field's staged text performs when the card is saved. */
export type FieldWrite = {
    kind: 'set';
    value: unknown;
} | {
    kind: 'clear';
};
/** How one section field converts between its stored value and its draft text. */
export interface CardFieldSpec {
    /** Field name inside the namespace section. */
    field: string;
    /** Render a stored value as draft text; the empty string when the section carries none. */
    format: (value: unknown) => string;
    /**
     * The write this draft text stages, or undefined when the text is not a
     * value this field accepts — which blocks the save rather than discarding it.
     */
    parse: (text: string) => FieldWrite | undefined;
}
/**
 * A control whose value is written outside the settings section. A credential
 * literal never rides a response, so its draft has nothing to seed from: it is
 * blank until typed, and a blank draft writes nothing.
 */
export interface CardSecretSpec {
    /** Field name addressing this control inside the card's form. */
    field: string;
    /** Write the staged text; resolves to whether the Host accepted it. */
    write: (text: string) => Promise<boolean>;
}
/** One field as a card's control renders it. */
export interface CardFieldState {
    /** Draft text the control renders. */
    text: string;
    /**
     * Whether saving would leave a user-layer entry for this field. A staged
     * edit answers for itself, so the badge previews the save rather than
     * reporting a state the pending edit already contradicts.
     */
    overridden: boolean;
    /** Whether the draft is not a value this field accepts, which blocks saving. */
    invalid: boolean;
}
/** Form state every plugin card shares. */
export interface CardShell {
    /** False while the namespace is not served to this client; the card renders nothing. */
    available: boolean;
    /** Whether the Host document accepts writes. */
    writable: boolean;
    /** Whether the form holds edits that a save would write. */
    dirty: boolean;
    /** Whether any staged draft is invalid, which blocks the save. */
    invalid: boolean;
    /** Whether a save is crossing the wire. */
    saving: boolean;
    /** Whether the last save did not land as staged; cleared by the next edit or save. */
    failed: boolean;
}
/** The write actions every plugin card's slot entry injects. */
export interface CardActions {
    /** Stage draft text for one field. */
    edit: (field: string, text: string) => void;
    /** Stage a clear, so saving lets the field re-inherit the composition layer. */
    resetField: (field: string) => void;
    /** Write every staged edit, then re-seed from what the Host accepted. */
    save: () => void;
    /** Drop every staged edit. */
    discard: () => void;
}
/**
 * A whole-number field. An empty draft clears the field; any other draft that
 * is not a finite number blocks the save.
 * @param field - field name inside the namespace section.
 * @returns the field's conversion spec.
 */
export declare function numberField(field: string): CardFieldSpec;
/**
 * A free-text field. An empty draft clears the field, so emptying the control
 * and saving is the same gesture as resetting it.
 * @param field - field name inside the namespace section.
 * @returns the field's conversion spec.
 */
export declare function textField(field: string): CardFieldSpec;
/**
 * Stages one card's edits over one settings namespace and writes them on save.
 *
 * The form publishes through a snapshot store because slot components read
 * through a snapshot selector, while both the scope and the local drafts
 * change underneath; every projection is rebuilt from the two together.
 */
export declare class CardForm<T> {
    private readonly scope;
    private readonly specs;
    private readonly secretSpecs;
    private readonly staged;
    private readonly listeners;
    private saving;
    private failed;
    /**
     * @param scope - the bound settings scope for this card's namespace.
     * @param specs - the section fields this card edits.
     * @param secrets - the card's write-only controls, written outside the section.
     */
    constructor(scope: SettingsScope<T>, specs: CardFieldSpec[], secrets?: CardSecretSpec[]);
    /**
     * Publish a projection of this form, rebuilt whenever the scope or a draft changes.
     * @param project - build the card's state from the form's current reads.
     * @returns the store the card's component reads through its bound selector.
     */
    bind<S>(project: () => S): SnapshotStore<S>;
    /**
     * Read the card-level state: what the Host serves, and what a save would do.
     * @returns the form state every card shares.
     */
    shell(): CardShell;
    /**
     * Read one control's state.
     * @param field - field name of a section field or of a write-only control.
     * @returns the draft text, whether a save would leave an override, and whether it is invalid.
     */
    field(field: string): CardFieldState;
    /**
     * Build the edit, reset, save, and discard actions bound to this form.
     * @returns the actions a card's slot entry injects.
     */
    actions(): CardActions;
    /**
     * Write every staged edit, then re-seed from what the Host accepted.
     *
     * The Host is the only authority on whether a value was accepted — its
     * validators own the constraints no schema can express — so the outcome is
     * read back from the section rather than predicted here. A save that did not
     * land keeps its drafts, so the user can correct them instead of retyping.
     * @returns settlement after every write and the read-back.
     */
    save(): Promise<void>;
    /**
     * Every staged edit a save would write. An entry whose draft is not a value
     * its field accepts carries no write: the form is still dirty, and the save
     * refuses rather than dropping the edit.
     * @returns the planned writes, in the order the fields were staged.
     */
    private plan;
    private clear;
    private store;
    private stage;
    private spec;
    private snapshotOf;
    private sectionValue;
    private baseValue;
    private userLayer;
    private stored;
    private publish;
}
//# sourceMappingURL=card-form.d.ts.map
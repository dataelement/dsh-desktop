/**
 * Hand-written controls for the plugin configuration forms. Each renders one
 * field's label, its staged text, whether saving would leave an override, and
 * — when one stands — the reset that stages a clear back to the composition
 * layer. Nothing here writes: a control reports what the user typed, and the
 * card's save is the single point where a draft becomes a document mutation.
 */
/** What every field control needs regardless of its value type. */
export interface FieldProps {
    /** Stable id associating the label with its control. */
    id: string;
    /** Visible label. */
    label: string;
    /** One-line explanation rendered under the control. */
    hint: string;
    /** Draft text this control renders. */
    text: string;
    /** True when saving would leave a user-layer entry for this field. */
    overridden: boolean;
    /** True when the draft is not a value this field accepts. */
    invalid: boolean;
    /** Copy for the overridden badge. */
    overriddenLabel: string;
    /** Copy for the reset control. */
    resetLabel: string;
    /** Copy shown in place of the hint while the draft is invalid. */
    invalidLabel: string;
    /** Disables every control (read-only document, or an unavailable namespace). */
    disabled: boolean;
    /** Stage draft text. */
    onEdit: (text: string) => void;
    /** Stage a clear so the field re-inherits the composition layer. */
    onReset: () => void;
}
/**
 * A staged value field. `numeric` only hints the keypad: which drafts a field
 * accepts is decided by its spec, so the control never silently rewrites what
 * the user typed.
 * @param props - the field's copy, its staged text, and the edit actions.
 * @returns the labelled control.
 */
export declare function ValueField(props: FieldProps & {
    /** Hints a numeric keypad without narrowing what the control accepts. */
    numeric?: boolean;
    /** Placeholder shown while the draft is empty. */
    placeholder?: string;
}): import("react").JSX.Element;
/**
 * A write-only credential control. The value never rides a response, so the
 * control reports only whether one is configured and starts blank; a blank
 * draft writes nothing, which keeps the stored key rather than clearing it.
 * @param props - the field's copy, its staged text, and the configured state.
 * @returns the labelled control.
 */
export declare function SecretField(props: Pick<FieldProps, 'id' | 'label' | 'hint' | 'text' | 'disabled' | 'onEdit'> & {
    /** Whether the Host reports a configured credential for this reference. */
    configured: boolean;
    /** Copy describing the configured state. */
    stateLabel: string;
}): import("react").JSX.Element;
//# sourceMappingURL=fields.d.ts.map
/**
 * One provider's editor card, hand-written per adapter family: the primary
 * field is a single write-only **API key** input (the page never asks for an
 * environment-variable name — a typed key stores through `credentials/set`
 * under the profile's reference, deriving `<ROUTE>_API_KEY` when the profile
 * has none. The pi-ai profile records that derivation as `apiKeyEnv` only when
 * a key is entered; a blank key materializes a reference-free profile for
 * provider-native authentication);
 * the collapsed 自定义设置 area carries the per-family extras (`baseURL` for
 * both families, DeepSeek's id/name/context-window model catalog, and the
 * display name and wire protocol of a pi-ai route the adapter does not ship —
 * the two fields the create card asked that route for, editable here for the
 * same reason).
 * Reasoning effort is deliberately absent: it is a per-MODEL capability, and
 * the models under one provider disagree about it, so a provider-scoped
 * control can only be set to a value some of them reject. The composer's
 * model picker offers each model its own levels; `settings.yaml` keeps the
 * profile field for a deployment that knows its route. Everything else stays
 * owned by `settings.yaml`. Profile edits land as minimal `settings.mutate`
 * path ops against the stored section — the card names only the fields it can
 * see instead of rebuilding the whole subtree from a partial descriptor.
 */
import type { ReactNode } from 'react';
import type { SettingsNamespaceView, SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client';
import type { ModelsOperations } from './operations.ts';
import type { SettingsSchemaOperations } from './schema-operations.ts';
import type { en } from './locales.ts';
/** Props of {@link ProviderEditor}. */
export interface ProviderEditorProps {
    /** Provider route id. */
    provider: string;
    /** Display name for the card title. */
    displayName: string;
    /** Hide the title row (the add card renders its own provider select). */
    hideTitle?: boolean;
    /**
     * Whether the adapter reports this route as hand-declared — absent from its
     * installed catalog. Such a route carries its own wire protocol, chosen when
     * it was created and editable here for the same reason; a catalog route's
     * models each carry theirs, so a route-level protocol there could only
     * override every one of them and the card does not offer it.
     */
    declared?: boolean;
    /** The owning namespace view (schema, layers, secrets). */
    namespace: SettingsNamespaceView;
    /** Settings-owned synchronous schema and immutable path operations. */
    schema: SettingsSchemaOperations;
    /** Path from the section root to this provider's profile. */
    settingsPath: readonly string[];
    /** The Host operations this card writes and interrogates through. */
    operations: ModelsOperations;
    /** Section copy. */
    t: (key: keyof typeof en) => string;
    /** Disable writes (read-only settings provider). */
    readOnly: boolean;
    /** Render only the credential field and actions, without provider settings. */
    credentialOnly?: boolean;
    /** Require a newly entered credential before this editor can submit. */
    credentialRequired?: boolean;
    /** Give the credential field initial focus when this editor mounts. */
    autoFocusCredential?: boolean;
    /** Override the dismiss action copy. */
    cancelLabelKey?: keyof typeof en;
    /** Override the idle commit action copy. */
    submitLabelKey?: keyof typeof en;
    /** Override the in-flight commit action copy. */
    submitBusyLabelKey?: keyof typeof en;
    /** Close the editor; `changed` reports whether an Apply committed. */
    onClose: (changed: boolean) => void;
}
/**
 * The minimal path ops carrying `after` over `before`, both as the card sees
 * them. Only keys the card observed are named; fields absent from both sides
 * produce no op, which is why edits are path-addressed rather than a rebuilt
 * section.
 * @param base - path of the edited subtree inside the user section.
 * @param before - the subtree as loaded, or undefined when it is new.
 * @param after - the subtree as edited.
 * @returns ordered set/unset ops; empty when nothing changed.
 */
export declare function pathOps(base: readonly string[], before: unknown, after: Record<string, unknown>): SettingsPathOpView[];
/**
 * Render one provider's editing card.
 * @param props - the addressed profile plus wire faces and copy.
 * @returns the editor card.
 */
export declare function ProviderEditor(props: ProviderEditorProps): ReactNode;
//# sourceMappingURL=ProviderEditor.d.ts.map
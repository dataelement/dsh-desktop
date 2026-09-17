/**
 * Stage one of tab-type registration: what a type IS.
 *
 * A registration is purely static — which addresses the type recognizes, how it
 * ranks against other types that recognize the same one, what the tab chip says,
 * and whether the type offers an entry box on the guide page. Nothing here is
 * per-tab, per-session, or a runtime hook: stage two is the keyed
 * `sidebar.right.pane.tab` registration that supplies the body under the same
 * `kind`, and everything a body needs at runtime arrives in its props.
 *
 * Address recognition follows VS Code's editor resolver: a glob declaration
 * narrows the candidates, an optional `canOpen` predicate vetoes, and the
 * survivors are ranked by priority band, then by matched-pattern length, then by
 * registration order. Addresses are `scheme://` URIs; the one local change to
 * VS Code's glob rule is that a pattern containing `:` matches the whole address
 * (`dsh-resource://file/**`, `sidebar://guide`) rather than the URI's path.
 *
 * A kind may carry one `builtin` and one `extension` registration at once: the
 * extension is the one in force — claims, `get`, the guide page, and the body
 * and title, which the seat finds under the definition's own `id` — and the
 * builtin resumes when the extension unregisters. Everything else colliding on
 * a kind throws, as does a second registration of an `id`.
 *
 * Thunked copy (`title`, `guide[].title`, `guide[].description`) is read again
 * on every use, so a language change needs no re-registration.
 */
import type { ComponentType } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives';
/**
 * How strongly a type wants an address it recognizes, as one of three literal
 * bands (a string, not an imported constant, so a type shipped from another
 * package needs no runtime import from here).
 *
 * - `extension` — a type from outside the product, and the highest: a type that
 *   declares nothing outranks every viewer shipped here, exactly as in VS Code.
 *   It is also the band that may take over a `builtin` kind.
 * - `builtin` — the ordinary band for types shipped with the product.
 * - `fallback` — plain-content viewers that anything more specific should beat.
 *   VS Code's text editor holds this position implicitly; ours is a separate
 *   package, so it says so.
 */
export type SidebarRightTabPriority = 'extension' | 'builtin' | 'fallback';
/** One entry capsule the guide page offers, contributed by the type it opens (picking it opens that type as a page). */
export interface SidebarRightGuideEntry {
    /** Ascending position among every registered type's entries. */
    readonly order: number;
    /**
     * The capsule's title.
     * @returns the title in the current language.
     */
    readonly title: () => string;
    /**
     * One line under the title on what picking the capsule opens. The guide shows
     * it only while it lists few enough entries to stay light; a crowded guide
     * falls back to titles alone, so a type must stand on its title.
     * @returns the description in the current language.
     */
    readonly description?: () => string;
    /** Optional glyph, drawn before the title; without one the guide draws its cube placeholder. */
    readonly icon?: ComponentType<IconProps>;
}
/** A guide entry as the registry lists it: with the kind of the type that contributed it, which is what picking it opens. */
export interface SidebarRightGuideBox extends SidebarRightGuideEntry {
    readonly kind: string;
}
/** One registered tab type: its static face, and nothing else. */
export interface SidebarRightTabDefinition {
    /**
     * This implementation's identity in the tab system, unique across every
     * registration (a package name is the natural value). A kind is not unique —
     * an extension may take a builtin's over — so the implementation carries its
     * own name, and it is the key its body and title register under in the
     * `sidebar.right.pane.tab` and `sidebar.right.pane.tab.title` seats.
     */
    readonly id: string;
    /** Type discriminator: what the tabs of this type are, and what `openTab` names. */
    readonly kind: string;
    /**
     * Resource-address globs this type recognizes; omit for a page type, which is
     * opened by kind and recognizes no address.
     *
     * A pattern containing `:` is matched against the whole address
     * (`dsh-resource://file/**`); one without is matched against the URI's path at
     * any depth (`*.md` matches `dsh-resource://file/session/s1/home/me/notes.md`),
     * and an address that is not a URI matches no such pattern. Matching ignores
     * case and does not hide dotfiles.
     */
    readonly patterns?: readonly string[];
    /** Defaults to `extension`: a type that says nothing is one from outside the product. */
    readonly priority?: SidebarRightTabPriority;
    /**
     * Veto an address this type's globs matched.
     *
     * Synchronous and cheap: it runs on every routing decision. Omit it to accept
     * every match.
     * @param address - the matched address.
     * @returns whether this type will open it.
     */
    readonly canOpen?: (address: string) => boolean;
    /**
     * The tab chip's initial text, captured into the layout record at open time.
     * @param address - the address being opened.
     * @returns the title in the current language.
     */
    readonly title: (address: string) => string;
    /** Entry boxes for the guide page. Omit to stay off it. */
    readonly guide?: readonly SidebarRightGuideEntry[];
}
/** What a routing decision settles on: who draws the address, and as what. */
export interface SidebarRightTabClaim {
    /** The claiming type. */
    readonly kind: string;
    /**
     * Stable identity of the content, which is the address itself.
     *
     * Two opens of the same address are the same tab, which is what makes opening
     * idempotent.
     */
    readonly contentId: string;
    /** Title for the tab chip. */
    readonly title: string;
}
/**
 * The registered tab types.
 *
 * Registration order is part of the contract: it breaks ties between types that
 * recognize an address equally well.
 */
export declare class SidebarRightTabRegistry {
    private readonly ctx;
    private readonly kinds;
    private readonly ids;
    private readonly listeners;
    private registrations;
    private cached;
    private guideEntries;
    /** @param ctx - Context whose effects own the contributed types. */
    constructor(ctx: Context);
    /**
     * Register one tab type for the caller's lifetime.
     *
     * The caller holds the returned disposer inside its own `ctx.effect`, so a
     * type's registration lives exactly as long as the plugin that contributed it.
     * An `extension` may register a kind a `builtin` already holds and takes it
     * over until it unregisters; a second registration in the same band, or any
     * registration meeting a `fallback` of the same kind, is a wiring mistake, and
     * so is an `id` already in use.
     * @param definition - the contributed type.
     * @returns idempotent disposer.
     * @throws when the id is taken, or the kind is already registered in a way this one cannot coexist with.
     */
    register(definition: SidebarRightTabDefinition): () => void;
    /** Add a registration to its kind's slot, the higher band in force; `coexists` has already admitted it. */
    private enter;
    /** Remove a registration from its kind's slot: a shadowed builtin resumes, and an emptied kind is freed. */
    private leave;
    /** Every kind's registration in force, in registration order. */
    private active;
    /**
     * Registered types in registration order.
     * @returns reference-stable entries.
     */
    entries(): readonly SidebarRightTabDefinition[];
    /**
     * Every type in force's guide entries, in `order`, each naming the kind it opens.
     * @returns reference-stable entries.
     */
    guide(): readonly SidebarRightGuideBox[];
    /**
     * The type in force for a kind.
     * @param kind - the type discriminator.
     * @returns the type, or `undefined` when nothing registered it.
     */
    get(kind: string): SidebarRightTabDefinition | undefined;
    /**
     * Every type that would open an address, best first.
     *
     * Ranked by priority band, then by the length of the pattern that matched,
     * then by registration order. Types whose `canOpen` vetoes are absent.
     * @param address - the address a caller wants opened.
     * @returns the ranked types; empty when nothing recognizes the address.
     */
    candidates(address: string): readonly SidebarRightTabDefinition[];
    /**
     * Decide which type opens an address, and as what.
     *
     * Without `kind`, the best candidate wins. With `kind`, that type opens the
     * address if its `canOpen` agrees — its globs are not consulted, because
     * naming the type IS the decision.
     *
     * An address no type will open is a wiring mistake, not a user error, so this
     * throws rather than reporting absence.
     * @param address - the address a caller wants opened.
     * @param kind - a type named by the caller, overriding the ranking.
     * @returns the claiming type and the record to open.
     */
    claim(address: string, kind?: string): SidebarRightTabClaim;
    /**
     * Observe low-frequency registry changes.
     * @param listener - synchronous invalidation callback.
     * @returns unsubscribe callback.
     */
    subscribe(listener: () => void): () => void;
    private refresh;
}
//# sourceMappingURL=tab-registry.d.ts.map
/**
 * Global theme DOM applier: projects the resolved ThemeSnapshot onto the
 * document — `html { color-scheme }` for native UA chrome (scrollbars, form
 * controls), `body[data-ds-dark-theme]` for the token palette, the active
 * theme's alias-token overrides as inline CSS variables on body, the content
 * font-size axis (`--dsh-content-font-size`), and one presenter-owned
 * `meta[name="theme-color"]` for surrounding browser UI. Pure DOM writes, no
 * React involvement; the presenter only ever retracts what it wrote itself,
 * so foreign attributes, metadata, and inline styles survive.
 */
import type { ThemeSnapshot } from '@deepseek-ai/dsh-client-ui-theme/client';
/** Body attribute selecting the dark base palette in the token stylesheets. */
export declare const DARK_ATTRIBUTE = "data-ds-dark-theme";
/** Body variable carrying the user's content font size in px. */
export declare const CONTENT_FONT_SIZE_VARIABLE = "--dsh-content-font-size";
/** Applies theme snapshots to the document; one instance per plugin fiber. */
export declare class ThemePresenter {
    /** Token names this presenter wrote in the last apply (its retraction set). */
    private appliedTokens;
    /** The single metadata node this presenter inserts and removes. */
    private readonly themeColorMeta;
    /** Create the presenter-owned metadata node before the first snapshot arrives. */
    constructor();
    /**
     * Project a snapshot onto the document: set root `color-scheme` and the body
     * palette attribute from `active.colorScheme` (never the id — `system` is
     * resolved upstream), publish the content font-size axis, then replace the
     * previously applied token variables with `active.tokens`. Browser
     * theme-color metadata follows the computed body background after those
     * writes, so the rendered palette remains the color authority.
     * @param snapshot - resolved theme snapshot from ctx.theme.
     */
    apply(snapshot: ThemeSnapshot): void;
    /** Retract root color-scheme, the palette attribute, token variables, the font-size axis, and the owned metadata node. */
    dispose(): void;
}
//# sourceMappingURL=theme-presenter.d.ts.map
/**
 * Structured index injections: the typed rows plugins contribute to the boot
 * HTML instead of raw `tapIndex` string transforms. Rows are pure
 * JSON-serializable data because one table feeds two renderers: the served
 * form renders rows into the index.html text ({@link renderIndexInjections}),
 * and a static worker deployment ships the same rows over its boot payload
 * for a page-side interpreter. Anything not expressible as a row stays on
 * `tapIndex`, which runs after row rendering.
 */
/** Document region a rendered row lands in: after the opening head or body tag. */
export type IndexInjectionPlacement = 'head' | 'body';
/** One structured index injection row. */
export type IndexInjection = 
/** Assign a JSON-serializable value to a `globalThis` property, ahead of later script rows. */
{
    kind: 'global';
    name: string;
    value: unknown;
}
/** Inline classic script. `text` must not contain `</script`, which would close the element early. */
 | {
    kind: 'script';
    placement: IndexInjectionPlacement;
    text: string;
}
/**
 * External classic script, executed in table order: a parser-blocking tag
 * when served, an awaited fetch-and-execute in the worker form (whose
 * loader resolves worker-only URLs such as `/plugins/...`).
 */
 | {
    kind: 'script-src';
    placement: IndexInjectionPlacement;
    src: string;
}
/** Advisory preload for an external classic script; static workers may ignore it. */
 | {
    kind: 'script-preload';
    src: string;
}
/** A `<style>` element in the head. `text` must not contain `</style`, which would close the element early. */
 | {
    kind: 'style';
    text: string;
}
/** Raw markup fragment. */
 | {
    kind: 'html';
    placement: IndexInjectionPlacement;
    html: string;
};
/**
 * Render rows into an index.html body: head rows immediately after the
 * opening head tag, body rows immediately after the opening body tag, each
 * group in table order, and the boot-readiness tail after the last body row.
 * @param html - the raw index.html body.
 * @param rows - the collected injection table.
 * @returns the html with every row rendered.
 */
export declare function renderIndexInjections(html: string, rows: readonly IndexInjection[]): string;
//# sourceMappingURL=injections.d.ts.map
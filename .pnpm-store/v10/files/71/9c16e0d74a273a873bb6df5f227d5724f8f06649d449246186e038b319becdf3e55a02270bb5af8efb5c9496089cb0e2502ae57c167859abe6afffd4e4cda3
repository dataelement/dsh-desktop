/** Source-line helpers shared by the plain renderer and the document scroller. */
import type { DocumentTextPage } from '../document/contract.ts';
import type { TextPage } from '../store.ts';
/**
 * Split a loaded page into its source lines.
 * @param page - source page.
 * @returns its lines, preserving one empty line but excluding a zero-line page.
 */
export declare function linesOf(page: TextPage): string[];
/** Loaded source page with its 1-based start position. */
export type LoadedPage = DocumentTextPage;
/**
 * Order loaded pages by source position.
 * @param pages - stored page table.
 * @returns pages in source order.
 */
export declare function loadedPages(pages: Readonly<Record<number, TextPage>>): LoadedPage[];
/**
 * Find the end of the loaded source prefix.
 * @param pages - ordered pages.
 * @returns the last loaded source line, or zero.
 */
export declare function lastLineLoaded(pages: readonly LoadedPage[]): number;
/**
 * Reveal a plain-text or highlighted source line.
 * @param body - scrolling document body or code-content viewport.
 * @param line - 1-based source line to reveal.
 * @returns Whether the current renderer exposes that line.
 */
export declare function scrollToLine(body: HTMLElement, line: number): boolean;
//# sourceMappingURL=lines.d.ts.map
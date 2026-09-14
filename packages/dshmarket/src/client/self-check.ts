/**
 * What the browser can see about the market that the server cannot.
 *
 * This exists because of a pattern, not a hypothesis. #293 ("市场显示空白")
 * and #384 ("lightbox cannot be closed") are both reproducible for their
 * reporters and for nobody else, on clean profiles, across host versions.
 * Both investigations then stalled in the same place: I asked the reporter to
 * open a console and paste the result of an expression. That costs a day per
 * question, asks a non-developer to run code from a stranger, and is the one
 * step where a report goes quiet.
 *
 * Meanwhile the exported log — which the issue template already asks for, and
 * which reporters do send — describes only the server: dependencies, bundle
 * resolution, events. Everything it says was already true of a machine where
 * the bug does not happen. The interesting half was in a page nobody looked
 * at.
 *
 * So the browser answers the questions I have actually had to ask, in the
 * artefact people already know how to produce. Nothing here diagnoses
 * anything on its own; it is evidence, collected before it is needed.
 */

/**
 * How many times this module has been evaluated in this page.
 *
 * Module scope runs once per module instance, so >1 means the market's client
 * bundle was loaded twice — two React copies, two of every module singleton,
 * two portal containers. That is a specific hypothesis for #384: two React
 * roots each attach delegated listeners to their own portal container, and a
 * click lands on whichever container is last in `body` while the handlers
 * live on the other one, so the buttons look present and do nothing.
 *
 * Counted on `window` rather than in a module variable for the obvious
 * reason: a module variable would be duplicated along with everything else
 * and each copy would confidently report 1.
 */
const globals = globalThis as typeof globalThis & { __dshmarketClientLoads?: number }
globals.__dshmarketClientLoads = (globals.__dshmarketClientLoads ?? 0) + 1

/** Whether `value` looks like a browser environment worth inspecting. */
const hasDom = (): boolean => typeof document !== 'undefined' && document.body !== null

/**
 * The browser-side section of the exported log.
 *
 * Deliberately facts, not verdicts. "portal containers: 2" is something a
 * reporter can paste without judging it, and something I can act on; "your
 * bundle is double-loaded" would be a guess printed in the user's face, and
 * wrong the first time a host legitimately renders two markets.
 * @returns the lines to append, or an empty array outside a browser.
 */
export function clientDiagnostics(): string[] {
  if (!hasDom()) return []
  const portals = document.querySelectorAll('[data-dsh-market-portal]')
  const roots = document.querySelectorAll('[data-dsh-market-root]')
  const last = portals.length > 0 ? portals[portals.length - 1] : null
  return [
    // >1 is the double-load signal above. Reported always, so that a normal
    // page proves the number is being read rather than defaulting.
    `client bundle evaluations: ${String(globals.__dshmarketClientLoads ?? 0)}`,
    `market roots in the document: ${String(roots.length)}`,
    // Asked by hand in #384. A container that is not body's last child sits
    // under whatever was appended after it, which is the other way a button
    // can be visible and unclickable.
    `portal containers: ${String(portals.length)}`
      + (last === null ? '' : ` (last one is body's last child: ${String(last === document.body.lastElementChild)})`),
    // Asked by hand in #293: "blank" can mean the section never mounted, or
    // mounted and rendered nothing. Those have different causes.
    `plugin cards rendered: ${String(document.querySelectorAll('[data-dsh-market-root] [class*="_card"]').length)}`,
    // The mount point every /dsh-market/* request is resolved against (#345).
    // A surprising value here explains a whole class of "nothing loads".
    `document baseURI: ${document.baseURI}`,
    `page URL: ${location.origin}${location.pathname}`,
    `user agent: ${navigator.userAgent}`,
  ]
}

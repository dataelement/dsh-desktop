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

import { api } from './market-data.ts'
import { lastMarketCrash } from './ErrorBoundary.tsx'

/**
 * Download the exported log: the server's account plus what only the browser
 * can see.
 *
 * A free function rather than a hook, because the market's error boundary
 * has to offer it too — a crashed market is exactly when the log matters,
 * and for months it was exactly when the button did not exist (#293).
 * @throws when the server half cannot be fetched; callers show their own state.
 */
export async function exportMarketLog(): Promise<void> {
  const res = await fetch(api('/dsh-market/logs'))
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
  const serverText = await res.text()
  const browser = clientDiagnostics()
  const blob = new Blob(
    [serverText, ...(browser.length > 0 ? ['## browser\n', browser.join('\n'), '\n'] : [])],
    { type: 'text/plain;charset=utf-8' },
  )
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'dsh-market-log.txt'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

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

/**
 * The marks Chrome and Edge leave on `<html>` when they translate a page.
 *
 * Both add a `translated-*` class for the direction they rendered into; Edge
 * also flags the document it worked on. Reported verbatim rather than
 * reduced to a boolean, because which engine did it is the next question
 * after "was it translated at all".
 * @returns the marks found, or null when there are none.
 */
function translatedMarks(): string | null {
  const root = document.documentElement
  const marks = [
    ...[...root.classList].filter(name => name.startsWith('translated')),
    ...(root.hasAttribute('_msthash') ? ['edge (_msthash)'] : []),
    ...(root.hasAttribute('_msttexthash') ? ['edge (_msttexthash)'] : []),
  ]
  return marks.length === 0 ? null : marks.join(', ')
}

/** The market crash the error boundary caught, if there was one. */
function crashLines(): string[] {
  const crash = lastMarketCrash()
  if (crash === null) return []
  return [
    `market UI crashed at: ${crash.at}`,
    `market crash message: ${crash.message}`,
    ...(crash.stack === null ? [] : [`market crash component stack:${crash.stack}`]),
  ]
}

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
    // #293: browser page translation replaces text nodes underneath React,
    // which is the one reported cause of the blank market. Chrome and Edge
    // mark the document when they do it, so a report can now say so without
    // the reporter having to notice. A fact, not a verdict — a translated
    // page is not by itself a fault.
    `page translated by the browser: ${translatedMarks() ?? 'no'}`,
    `document baseURI: ${document.baseURI}`,
    `page URL: ${location.origin}${location.pathname}`,
    // A crash the error boundary caught. Reported after the DOM facts
    // because it is the one line that already IS a diagnosis — and when it
    // is present, it is the first thing worth reading.
    ...crashLines(),
    `user agent: ${navigator.userAgent}`,
  ]
}

/**
 * The market's last line of defence: a crash renders a way out, not a blank.
 *
 * Every part of the market UI is inside one React tree. When that tree
 * throws during render or commit, React unmounts it — and what the user gets
 * is an empty settings panel, with the "export log" button gone along with
 * everything else. That is not hypothetical: it is #293, where browser page
 * translation replaced text nodes under React and the resulting
 * NotFoundError blanked the panel for months, and every request for a log
 * came back empty because there was no longer a button to press.
 *
 * #513 fixed that particular trigger. This exists because the next one will
 * be different, and the property worth having is not "translation is
 * handled" but "a crash is survivable and reportable".
 *
 * Deliberately not a retry loop. If the same render throws again the
 * boundary catches it again and the user is back here, which is honest —
 * an automatic remount would flicker between a broken UI and this panel
 * with no way to read either.
 */

import { Component, createElement as h } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  /** Optional so `createElement(Boundary, props, child)` type-checks. */
  children?: ReactNode
  /** Rendered under the message; the export-log control belongs here. */
  actions?: ReactNode
  /** Bilingual strings, so this file holds no copy of its own. */
  text: { title: string; hint: string; reload: string; details: string }
}

interface State {
  error: Error | null
}

/**
 * The last crash this boundary caught, for the exported log.
 *
 * Module-level rather than component state because the log export runs
 * outside this tree — and a crash the user has already dismissed is still
 * the most useful line in their report.
 */
let lastCrash: { message: string; stack: string | null; at: string } | null = null

/** The crash to report in the exported log, or null when there was none. */
export function lastMarketCrash(): { message: string; stack: string | null; at: string } | null {
  return lastCrash
}

/** Testing seam: forget the recorded crash. */
export function forgetMarketCrash(): void {
  lastCrash = null
}

export class MarketErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    lastCrash = {
      message: error.message,
      // React's component stack says WHERE, which the JS stack does not once
      // the bundle is minified — and a reporter cannot get either by hand.
      stack: info.componentStack ?? error.stack ?? null,
      at: new Date().toISOString(),
    }
    // Kept on the console too: a developer looking at a live page should not
    // have to export a file to see what a boundary swallowed.
    console.error('[dsh-market] the market UI crashed and was replaced by its recovery panel', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children
    const { text, actions } = this.props
    return h('div', {
      // Marked like the real root so the exported log's "market roots"
      // count does not read as "never mounted" for a crashed market —
      // those are different failures and the log has to keep telling them
      // apart.
      'data-dsh-market-root': '',
      'data-dsh-market-crashed': '',
      translate: 'no',
      className: 'notranslate',
      style: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' },
    }, [
      h('div', { key: 'title', style: { fontSize: '14px', fontWeight: 600 } }, text.title),
      h('div', { key: 'hint', style: { fontSize: '12px', lineHeight: '19px', opacity: 0.8, whiteSpace: 'pre-wrap' } }, text.hint),
      h('div', { key: 'actions', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
        h('button', {
          key: 'reload',
          type: 'button',
          onClick: () => { this.setState({ error: null }) },
        }, text.reload),
        actions,
      ]),
      h('details', { key: 'details', style: { fontSize: '11px', opacity: 0.7 } }, [
        h('summary', { key: 'summary', style: { cursor: 'pointer' } }, text.details),
        h('pre', {
          key: 'body',
          style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 0' },
        }, error.message),
      ]),
    ])
  }
}

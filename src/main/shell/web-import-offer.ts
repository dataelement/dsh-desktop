import { pathToFileURL } from 'node:url'
import {
  importWebHome,
  previewWebHome,
  shouldOfferWebHomeImport,
  writeSkipDecision,
  type WebHomePreview
} from '../state/web-home-import'

export type WebImportChoice = 'import' | 'skip'
export type WebImportOfferResult = 'imported' | 'skipped' | 'not-offered' | 'cancelled'

export function readWebImportAction(value: unknown): WebImportChoice | undefined {
  if (value === 'import' || value === 'skip') return value
  return undefined
}

/** Accept only the packaged import page, including its query string. */
export function isWebImportPageUrl(url: string, pagePath: string): boolean {
  try {
    const destination = new URL(url)
    if (destination.protocol !== 'file:') return false
    return destination.pathname === pathToFileURL(pagePath).pathname
  } catch {
    return false
  }
}

/**
 * Ask before copying a web Harness home into an unused desktop home.
 * Skipping records the decision. Cancelling records nothing. The source is only read.
 */
export async function offerWebHomeImport(options: {
  dshHome: string
  webHome: string
  choose: (preview: WebHomePreview, notice?: string) => Promise<WebImportChoice | undefined>
  onProgress?: (line: string) => void
}): Promise<WebImportOfferResult> {
  if (!(await shouldOfferWebHomeImport(options.dshHome, options.webHome))) return 'not-offered'
  let notice: string | undefined
  for (;;) {
    const preview = await previewWebHome(options.webHome)
    const choice = await options.choose(preview, notice)
    if (choice === undefined) return 'cancelled'
    if (choice === 'skip') {
      await writeSkipDecision(options.dshHome, options.webHome)
      return 'skipped'
    }
    try {
      await importWebHome({
        source: options.webHome,
        dest: options.dshHome,
        onProgress: options.onProgress
      })
      return 'imported'
    } catch (error) {
      notice = error instanceof Error && error.message.length > 0 ? error.message : 'Web import failed'
    }
  }
}

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const themeClient = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-theme',
  'lib',
  'client.js'
)

const WEBKIT_SCROLLBAR_RULES =
  '::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:0 0}'

/**
 * Chromium abandons the platform's native scrollbars as soon as any
 * `::-webkit-scrollbar` rule matches, which on macOS turns the system's
 * overlay scrollbars into permanently visible ones regardless of the
 * "Show scroll bars" preference. The desktop patch therefore keeps Harness's
 * custom scrollbar only off macOS, and lets the OS decide there.
 */
describe('DSH Desktop scrollbar styling', () => {
  it('skips the custom webkit scrollbar on macOS so the system preference applies', async () => {
    const client = await readFile(themeClient, 'utf8')
    const start = client.indexOf('var scrollbar_css_default = ')
    expect(start).toBeGreaterThan(-1)
    const declaration = client.slice(start, client.indexOf('\n', start))

    expect(declaration).toContain(
      'typeof navigator !== "undefined" && navigator.userAgent.includes("Macintosh") ? '
    )
    expect(declaration).toContain(WEBKIT_SCROLLBAR_RULES)
    // The webkit rules must live only on the non-macOS branch of the ternary.
    expect(declaration.indexOf(WEBKIT_SCROLLBAR_RULES)).toBeGreaterThan(
      declaration.indexOf('"Macintosh"')
    )
  })

  it('tells native scrollbars which color scheme Harness is showing', async () => {
    const client = await readFile(themeClient, 'utf8')

    expect(client).toContain(
      '"body{color-scheme:light}body[data-ds-dark-theme]{color-scheme:dark}"'
    )
  })

  it('keeps the non-webkit fallback and the width token for every platform', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-theme'), 'utf8')

    expect(patch).toContain('--dsh-scrollbar-width:8px}@supports not selector(::-webkit-scrollbar)')
    expect(patch).toContain('navigator.userAgent.includes("Macintosh")')
  })
})

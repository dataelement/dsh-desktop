import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

describe('packaged conversation input CSS', () => {
  it('injects the accessory row without an undefined client variable', async () => {
    const entry = require.resolve('@deepseek-ai/dsh-client-ui-conversation/package.json')
      .replace(/package\.json$/u, 'lib/client.js')
    const bundle = await readFile(entry, 'utf8')
    const start = bundle.lastIndexOf('//#region', bundle.indexOf('const css$1 ='))
    const end = bundle.indexOf('var InputBar_module_css_default', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)

    const styles: Array<{ textContent?: string }> = []
    const document = {
      querySelector: () => null,
      createElement: () => ({ dataset: {}, textContent: '' }),
      head: { appendChild: (style: { textContent?: string }) => { styles.push(style) } }
    }
    runInNewContext(bundle.slice(start, end), { document })
    expect(styles).toHaveLength(1)
    expect(styles[0]?.textContent).toContain('.uV2eYG_promptRow{')
  })
})

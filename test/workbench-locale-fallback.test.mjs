import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const code = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')

describe('workbench copy falls back to English for non-Chinese locales (#844)', () => {
  it('gates the English copy on non-Chinese instead of English-only', () => {
    // Before #844 any locale other than English read the Chinese source
    // strings (sidebar 工作台/会话 on a pt-BR UI). The zh/en bundles are the
    // only copies shipped, so every non-Chinese locale reads the English one.
    expect(code).toMatch(/const isEnglish = \(\) => !localeActive\(\)\.toLowerCase\(\)\.startsWith\('zh'\)/u)
    expect(code).not.toMatch(/const isEnglish = \(\) => localeActive\(\)\.toLowerCase\(\)\.startsWith\('en'\)/u)
  })

  it('routes every copy surface through the shared predicate', () => {
    // tr/both plus the entry display keep using isEnglish, so the predicate
    // flip covers all copy sites without per-site changes.
    expect(code).toMatch(/const tr = \(value\) => isEnglish\(\) \? enCopy\[value\] \|\| value : value/u)
    expect(code).toMatch(/const both = \(zh, en\) => isEnglish\(\) \? en : zh/u)
    expect(code).toMatch(/title: isEnglish\(\) \? entry\.titleEn \|\| entry\.title : entry\.title/u)
  })

  it('still defaults to Chinese when no host locale is attached', () => {
    expect(code).toMatch(/hostLocale\?\.getSnapshot\?\.\(\)\.active \|\| 'zh'/u)
  })
})

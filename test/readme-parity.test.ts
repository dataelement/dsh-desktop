import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readmes = [
  'README.md',
  'README.zh.md',
  'README.en.md',
  'README.ja.md',
  'README.ru.md',
  'README.es.md',
  'README.pt.md'
]

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> }
const requiredFacts = [
  'DOCX',
  'PPTX',
  'XLSX',
  '--safe-mode',
  'Cloudflare',
  'Pinggy',
  'NSIS',
  'docs/development.md',
  'docs/architecture.md'
]

describe('localized README parity', () => {
  it('documents the pinned Harness version in the linked development guide', () => {
    // READMEs explain the product; the development guide owns version details.
    const guide = readFileSync('docs/development.md', 'utf8')
    expect(guide).toContain(`@deepseek-ai/dsh@${manifest.dependencies['@deepseek-ai/dsh']}`)
  })

  for (const path of readmes) {
    it(`${path} carries the current product facts`, () => {
      const content = readFileSync(path, 'utf8')

      for (const fact of requiredFacts) expect(content).toContain(fact)
      expect(content).not.toContain('@deepseek-ai/dsh@0.1.1-rc.1')
      expect(content).not.toMatch(/NSIS\s*(?:and|与|と|и|y|e)\s*Portable/i)
    })
  }

  it('keeps every relative Markdown link resolvable', () => {
    const documents = [
      ...readmes,
      'docs/development.md',
      'docs/architecture.md',
      'docs/release-runbook.md',
      'docs/preset-packages.md',
      'docs/office-runtime.md'
    ]

    for (const path of documents) {
      const content = readFileSync(path, 'utf8')
      const links = content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)

      for (const match of links) {
        const target = match[1]
        if (!target) continue
        if (/^(?:https?:|mailto:)/.test(target)) continue
        const withoutAnchor = target.split('#', 1)[0]
        if (!withoutAnchor) continue
        expect(
          existsSync(resolve(dirname(path), decodeURIComponent(withoutAnchor))),
          `${path} links to missing ${target}`
        ).toBe(true)
      }
    }
  })

  it('does not publish internal working documents', () => {
    expect(existsSync('docs/preset-square-mvp.md')).toBe(false)
    expect(existsSync('docs/windows-profile-repair.md')).toBe(false)
  })
})

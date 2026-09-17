// The plugin serves the development guide from its own package directory, so the
// guide cannot read docs/ at runtime and is committed as a copy of two documents.
// Hand-maintaining that copy is how it drifted from its sources before: a change
// to the switch description had to be made twice and was missed once. These tests
// make that drift fail loudly instead.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GUIDE_SOURCES, GUIDE_TARGET, renderGuideFromSources } from '../scripts/build-workbench-guide.mjs'

const root = join(import.meta.dirname, '..')
const read = path => readFileSync(join(root, path), 'utf8')

describe('bundled workbench development guide', () => {
  it('equals what its two source documents render to', () => {
    expect(read(GUIDE_TARGET)).toBe(renderGuideFromSources(read))
  })

  it('keeps both sources and the section that separates them', () => {
    const guide = read(GUIDE_TARGET)
    const standard = read(GUIDE_SOURCES.standard)
    const implementation = read(GUIDE_SOURCES.implementation)
    expect(guide).toContain(standard.trimEnd())
    expect(guide).toContain(implementation.trimEnd())
    expect(guide).toContain('# 实现与交付说明')
    // The guide is self-contained: it must not depend on a path only this
    // repository has, because readers see it outside the checkout.
    expect(guide).not.toContain('../../docs/')
  })

  it('does not repeat the acceptance checklist that the market repository owns', () => {
    // The product specification states required behavior; the market repository
    // states what a reviewer checks. Restating the checklist here is what made
    // the two documents read as duplicates.
    expect(read(GUIDE_SOURCES.standard)).not.toContain('## 5. 提交检查')
  })
})

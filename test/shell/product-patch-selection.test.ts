import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildDesktopProductPatch, writeDesktopProductPatch } from '../../src/main/shell/product-patch'

const enterprise = { dshDesktopHostPlugins: ['dsh-desktop-enterprise'] }
describe('explicit Desktop product plugin selection', () => {
  it.each([undefined, null, {}, [], { dependencies: { 'dsh-desktop-enterprise': '*' } }, { dshDesktopHostPlugins: 'dsh-desktop-enterprise' }])('does not activate enterprise from incidental dependencies: %j', metadata => {
    expect(buildDesktopProductPatch(metadata)).not.toContain('dsh-desktop-enterprise')
  })
  it('mounts enterprise once only when declared by the product', () => {
    expect(buildDesktopProductPatch(enterprise).match(/name: dsh-desktop-enterprise/g)).toHaveLength(1)
  })
  it('writes the declared normal profile and keeps Safe Mode independent', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desktop-product-selection-'))
    try {
      const normal = await writeDesktopProductPatch(home, 'desktop', enterprise)
      expect(await readFile(normal, 'utf8')).toContain('name: dsh-desktop-enterprise')
      const safe = await writeDesktopProductPatch(home, 'safe', enterprise)
      expect(await readFile(safe, 'utf8')).not.toContain('dsh-desktop-enterprise')
    } finally { await rm(home, { recursive: true, force: true }) }
  })
})

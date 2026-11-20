import { loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import {
  buildDesktopProductPatch,
  DESKTOP_SAFE_PRODUCT_PATCH,
  writeDesktopProductPatch
} from '../../src/main/shell/product-patch'

const declared = {
  dshDesktopHostPlugins: ['dsh-desktop-enterprise', '@example/desktop-plugin', 'dsh-desktop-enterprise']
}

interface OverlayInsertEntry {
  insert?: Array<{ id?: string, name?: string, config?: Record<string, unknown> }>
}

function insertRows(entries: unknown[]): Array<{ id?: string, name?: string, config?: Record<string, unknown> }> {
  const entry = entries.find((item): item is OverlayInsertEntry =>
    typeof item === 'object' && item !== null && Array.isArray((item as OverlayInsertEntry).insert)
  )
  return entry?.insert ?? []
}

describe('explicit Desktop product plugin selection', () => {
  it.each([
    undefined,
    null,
    {},
    [],
    { dependencies: { 'dsh-desktop-enterprise': '*' } },
    { dshDesktopHostPlugins: 'dsh-desktop-enterprise' }
  ])('does not activate enterprise from incidental dependencies: %j', metadata => {
    const parsed = parse(buildDesktopProductPatch(metadata), { logLevel: 'silent' }) as unknown[]
    expect(insertRows(parsed).some(row => row.name === 'dsh-desktop-enterprise')).toBe(false)
  })

  it('mounts each declared host plugin once and produces valid YAML for scoped packages', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desktop-product-selection-'))
    try {
      const file = await writeDesktopProductPatch(home, 'desktop', declared)
      const entries = loadOverlayPatches('test', file)
      const rows = insertRows(entries)
      expect(rows.filter(row => row.name === 'dsh-desktop-enterprise')).toEqual([
        { id: 'dsh-desktop-enterprise', name: 'dsh-desktop-enterprise' }
      ])
      expect(rows.filter(row => row.name === '@example/desktop-plugin')).toEqual([
        { id: '@example/desktop-plugin', name: '@example/desktop-plugin' }
      ])
      expect(rows.find(row => row.id === 'dsh-desktop-workbenches')).toEqual({
        id: 'dsh-desktop-workbenches',
        name: 'dsh-desktop-workbenches',
        config: { root: { __jsExpr: "dshHomePath('desktop-workbenches')" } }
      })
      expect(rows.find(row => row.id === 'dsh-ppt-composer')).toEqual({
        id: 'dsh-ppt-composer',
        name: 'dsh-ppt-composer',
        config: { root: { __jsExpr: "dshHomePath('kimi-ppt')" } }
      })
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  })

  it('filters non-string and invalid plugin names without corrupting generated YAML', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desktop-product-selection-'))
    try {
      const file = await writeDesktopProductPatch(home, 'desktop', {
        dshDesktopHostPlugins: [123, null, {}, '../escape', 'UPPER', '@bad/name\n- id: evil', '@valid/scoped-plugin.v1']
      })
      const rows = insertRows(loadOverlayPatches('test', file))
      expect(rows.map(row => row.name)).toEqual([
        'dsh-desktop-client-ui',
        '@valid/scoped-plugin.v1',
        'dsh-desktop-workbenches',
        'dsh-desktop-market-installer',
        'dsh-desktop-office',
        'dsh-ppt-composer'
      ])
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  })

  it('writes the declared normal profile, keeps Safe Mode independent, and supports HMR disable', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desktop-product-selection-'))
    try {
      expect(DESKTOP_SAFE_PRODUCT_PATCH.endsWith('\n')).toBe(true)
      expect(insertRows(parse(DESKTOP_SAFE_PRODUCT_PATCH) as unknown[]).map(row => row.name)).toEqual([
        'dsh-desktop-client-ui'
      ])
      const normal = await writeDesktopProductPatch(home, 'desktop', declared, { skipBlockingHmr: true })
      const normalEntries = loadOverlayPatches('test', normal)
      expect(insertRows(normalEntries).some(row => row.name === 'dsh-desktop-enterprise')).toBe(true)
      expect(normalEntries.find(entry => (entry as { id?: string }).id === 'hmr')).toEqual({
        id: 'hmr',
        disabled: true
      })

      const safe = await writeDesktopProductPatch(home, 'safe', declared)
      const safeEntries = loadOverlayPatches('test', safe)
      expect(insertRows(safeEntries).map(row => row.name)).toEqual(['dsh-desktop-client-ui'])
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  })
})

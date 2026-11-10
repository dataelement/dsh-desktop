import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { composeEntries, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { describe, expect, it } from 'vitest'
import { writeDesktopProductPatch } from '../src/main/shell/product-patch'

const root = process.cwd()

describe('Desktop account UI composition', () => {
  it.each(['dsh-desktop.patch.yml', 'dsh-desktop-safe.patch.yml'])(
    '%s disables account UI while preserving model settings',
    (filename) => {
      const web = loadOverlayPatches('test', join(root, 'node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml'))
      const desktop = loadOverlayPatches('test', join(root, 'build', filename))
      const upstream = composeEntries([web])
      expect(upstream.find((entry) => entry.id === 'ui-settings-account')?.name)
        .toBe('@deepseek-ai/dsh-client-ui-settings-account')
      const entries = composeEntries([web, desktop])
      expect(entries.find((entry) => entry.id === 'ui-settings-account')?.disabled).toBe(true)
      for (const name of ['@deepseek-ai/dsh-client-ui-settings-general', '@deepseek-ai/dsh-client-ui-settings-models']) {
        expect(entries.filter((entry) => entry.name === name && !entry.disabled)).toHaveLength(1)
      }
    }
  )

  it('shell desktop patch disables account UI and desktop platform sign-in', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-product-patch-'))
    try {
      const patch = await writeDesktopProductPatch(home)
      const base = loadOverlayPatches('test', join(root, 'node_modules/@deepseek-ai/dsh-base/cordis.patch.yml'))
      const web = loadOverlayPatches('test', join(root, 'node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml'))
      const shell = loadOverlayPatches('test', patch)
      const entries = composeEntries([base, web, shell])
      expect(entries.find((entry) => entry.id === 'ui-settings-account')?.disabled).toBe(true)
      expect(entries.find((entry) => entry.id === 'deepseek-account')?.config).toMatchObject({ desktopPlatform: null })
      expect(entries.find((entry) => entry.id === 'desktop-product-telemetry')?.disabled).toBe(true)
      expect(entries.find((entry) => entry.id === 'product-analytics')?.disabled).toBe(true)
      expect(entries.find((entry) => entry.id === 'ui-brand-official')?.disabled).toBe(true)
      expect(entries.find((entry) => entry.id === 'dsh-desktop-client-ui')?.name).toBe('dsh-desktop-client-ui')
      expect(entries.find((entry) => entry.id === 'dsh-desktop-workbenches')).toMatchObject({
        name: 'dsh-desktop-workbenches',
        config: { root: { __jsExpr: "dshHomePath('desktop-workbenches')" } }
      })
      expect(entries.find((entry) => entry.id === 'dsh-desktop-market-installer')?.name)
        .toBe('dsh-desktop-market-installer')
      expect(entries.find((entry) => entry.id === 'dsh-desktop-office')).toMatchObject({
        name: 'dsh-desktop-office',
        config: {
          resources: { __jsExpr: 'process.env.DSH_DESKTOP_OFFICE_RESOURCES' },
          cli: { __jsExpr: 'process.env.DSH_DESKTOP_OFFICE_CLI' }
        }
      })
      expect(entries.find((entry) => entry.id === 'hmr')?.disabled).not.toBe(true)
      expect(entries.find((entry) => entry.id === 'dsh-ppt-composer')).toMatchObject({
        name: 'dsh-ppt-composer',
        config: { root: { __jsExpr: "dshHomePath('kimi-ppt')" } }
      })
      const safePatch = await writeDesktopProductPatch(home, 'safe')
      const safeEntries = composeEntries([base, web, loadOverlayPatches('test', safePatch)])
      expect(safeEntries.find((entry) => entry.id === 'dsh-desktop-workbenches')).toBeUndefined()
      expect(safeEntries.find((entry) => entry.id === 'dsh-desktop-market-installer')).toBeUndefined()
      expect(safeEntries.find((entry) => entry.id === 'dsh-desktop-office')).toBeUndefined()
      expect(safeEntries.find((entry) => entry.id === 'dsh-ppt-composer')).toBeUndefined()
      for (const name of ['@deepseek-ai/dsh-client-ui-settings-general', '@deepseek-ai/dsh-client-ui-settings-models']) {
        expect(entries.filter((entry) => entry.name === name && !entry.disabled)).toHaveLength(1)
      }
      for (const mode of ['desktop', 'safe']) {
        const windowsDev = await writeDesktopProductPatch(home, mode, { skipBlockingHmr: true })
        const windowsEntries = composeEntries([base, loadOverlayPatches('test', windowsDev)])
        expect(windowsEntries.find((entry) => entry.id === 'hmr')?.disabled).toBe(true)
      }
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  })
})

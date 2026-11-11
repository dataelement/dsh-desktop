import { mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { installedPluginVersion, pluginPnpmRunnerPath, pnpmEntryPath, upgradeTargets } from '../../src/main/shell/plugin-maintenance'
import type { PluginHealthReport } from '../../src/main/recovery/plugin-market-check'

const ready: PluginHealthReport = {
  packageName: 'example-plugin',
  healthStatus: 'upgrade-available',
  healthLabel: '可升级',
  upgradeReady: true,
  upgradeVersion: '2.0.0'
}

describe('plugin maintenance', () => {
  it('resolves the runner from the selected installation with package exports', async () => {
    const app = join(tmpdir(), `dsh-runner-anchor-${Date.now()}`)
    const installer = join(app, 'node_modules', 'dsh-desktop-market-installer')
    await mkdir(installer, { recursive: true })
    await writeFile(join(app, 'package.json'), '{}')
    await writeFile(join(installer, 'package.json'), JSON.stringify({
      name: 'dsh-desktop-market-installer', exports: { './package.json': './package.json' }
    }))
    const runner = join(installer, 'pnpm-runner.mjs')
    await writeFile(runner, 'export const installation = "selected"')
    try {
      const resolved = pluginPnpmRunnerPath(app)
      // Windows module resolution can retain an 8.3 temp path while realpath expands it.
      expect(await realpath(resolved)).toBe(await realpath(runner))
      expect(await readFile(resolved, 'utf8')).toBe('export const installation = "selected"')
    } finally {
      await rm(app, { recursive: true, force: true })
    }
  })

  it('keeps only plugins with a compatible target version', () => {
    expect(upgradeTargets(['example-plugin', 'other-plugin'], [ready, {
      ...ready,
      packageName: 'other-plugin',
      upgradeReady: false,
      upgradeVersion: undefined
    }])).toEqual([{ name: 'example-plugin', version: '2.0.0' }])
  })

  it('reads the named profile version and finds pnpm beside the app', async () => {
    const home = join(tmpdir(), `dsh-plugin-version-${Date.now()}`)
    const plugin = join(home, 'profiles', 'desktop', 'node_modules', 'example-plugin')
    await mkdir(plugin, { recursive: true })
    await writeFile(join(plugin, 'package.json'), JSON.stringify({ version: '1.2.3' }))
    expect(await installedPluginVersion(home, 'desktop', 'example-plugin')).toBe('1.2.3')
    expect(await installedPluginVersion(home, 'web', 'example-plugin')).toBeUndefined()
    expect(pnpmEntryPath('/app', path => path.endsWith('pnpm.cjs'))).toBe(join('/app', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'))
    expect(pnpmEntryPath('/app', () => false)).toBeUndefined()
  })
})

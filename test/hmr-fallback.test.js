import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  ConfigWatchHmr,
  apply,
  inject,
  name
} from '../packages/dsh-desktop-hmr-fallback/index.js'

/**
 * The plugin registers a Cordis service, which needs a real context to
 * construct. These cover the two decisions that do not: whether the fallback
 * engages at all, and that the desktop patch actually loads it.
 */
function fakeContext(internal) {
  const plugins = []
  return {
    loader: { internal },
    plugin: (value) => plugins.push(value),
    plugins
  }
}

describe('desktop HMR fallback', () => {
  it('stands aside wherever Node’s internal loader is reachable', () => {
    // Development runs and the bundled-Node platforms keep the real service,
    // module-level hot replacement included.
    const ctx = fakeContext({})
    apply(ctx)
    expect(ctx.plugins).toHaveLength(0)
  })

  it('provides the service where the internals are absent', () => {
    // A packaged Electron app: --expose-internals reaches execArgv without
    // reaching Node's option parser, so Harness would create the full HMR
    // service after boot and that service throws on construction.
    const ctx = fakeContext(undefined)
    apply(ctx)
    expect(ctx.plugins).toHaveLength(1)
    expect(name).toBe('dsh-desktop-hmr-fallback')
    expect(inject).toContain('loader')
  })

  it('is composed into the desktop profile', async () => {
    const patch = await readFile(join(process.cwd(), 'build', 'dsh-desktop.patch.yml'), 'utf8')
    expect(patch).toContain('name: dsh-desktop-hmr-fallback')

    const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'))
    expect(manifest.dependencies['dsh-desktop-hmr-fallback']).toBe(
      'file:packages/dsh-desktop-hmr-fallback'
    )

    const dshPatch = await readFile(
      join(process.cwd(), 'patches', '@deepseek-ai+dsh+0.1.1-rc.1.patch'),
      'utf8'
    )
    expect(dshPatch).toContain('"dsh-desktop-hmr-fallback": "0.1.0"')
  })

  it('refreshes on a change to the watched config, and not on its neighbours', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-hmr-fallback-'))
    const watched = join(directory, 'cordis.patch.yml')
    await writeFile(watched, '[]\n', 'utf8')
    const refresh = vi.fn(async () => undefined)

    const service = Object.create(ConfigWatchHmr.prototype)
    service.ctx = { logger: { warn: () => undefined } }
    const dispose = await service.registerConfig(watched, refresh)

    await writeFile(join(directory, 'unrelated.yml'), 'x\n', 'utf8')
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(refresh).not.toHaveBeenCalled()

    await writeFile(watched, '- id: x\n', 'utf8')
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled(), { timeout: 2000 })

    await dispose()
  })
})

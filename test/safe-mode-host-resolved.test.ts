import { readFile } from 'node:fs/promises'
import { mountRootInclude } from '@deepseek-ai/dsh-app-boot'
import { describe, expect, it, vi } from 'vitest'
import { patchPath } from './patch-path'

/**
 * Safe Mode must boot even when `$DSH_HOME/profiles/node_modules` cannot be
 * built: on Windows its junctions can be refused (EPERM) for minutes. Safe Mode
 * loads only installation-owned bundles, so the patched Harness resolves them
 * from its own installation instead of through that fallback directory.
 */
describe('Safe Mode resolves plugins from the installation', () => {
  function fakeContext() {
    const internalImport = vi.fn(async (_name: string, _baseUrl: string, _options: object) => ({}))
    const configImport = vi.fn(async (_name: string, _getOuterStack: () => string) => ({}))
    const loader = {
      builtins: {} as Record<string, unknown>,
      internal: { import: internalImport },
      import: configImport,
      create: vi.fn(async () => 'include'),
      resolve: vi.fn(() => ({}))
    }
    const ctx = { loader, get: () => loader }
    return { ctx, loader, internalImport, configImport }
  }

  it('routes runtime-created entries to the host base, not the profile directory', async () => {
    const { ctx, loader, internalImport, configImport } = fakeContext()
    await mountRootInclude(ctx as never, '/home/profiles/desktop-safe-mode/cordis.yml', [], 'file:///app/dsh/package.json')

    // A plugin calling `ctx.loader.create({ name })` is imported by the Loader itself.
    await loader.import('@deepseek-ai/dsh-host-directory-picker-native', () => '')
    expect(internalImport).toHaveBeenCalledWith(
      '@deepseek-ai/dsh-host-directory-picker-native',
      'file:///app/dsh/package.json',
      {}
    )

    // Relative and builtin names keep their configuration-relative meaning.
    await loader.import('./local-plugin.js', () => '')
    await loader.import('cordis:group', () => '')
    expect(configImport).toHaveBeenCalledTimes(2)
  })

  it('leaves the Loader untouched when no host base is given', async () => {
    const { ctx, loader, configImport } = fakeContext()
    const original = loader.import
    await mountRootInclude(ctx as never, '/home/profiles/web/cordis.yml', [])
    expect(loader.import).toBe(original)
    await loader.import('@deepseek-ai/dsh-llm', () => '')
    expect(configImport).toHaveBeenCalledTimes(1)
  })

  it('skips the fallback heal and passes the host base only when Desktop asks for it', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh'), 'utf8')
    expect(patch).toContain('process.env.DSH_DESKTOP_HOST_RESOLVED === "1" ? pathToFileURL(INSTALL_ANCHOR).href : void 0')
    expect(patch).toContain('+	if (hostResolvedBaseUrl() === void 0) await healProfilesModuleFallback({')
    expect(patch).toContain('+	}, hostResolvedBaseUrl());')
  })
})

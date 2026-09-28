import { readFile } from 'node:fs/promises'
import { mountRootInclude } from '@deepseek-ai/dsh-app-boot'
import { describe, expect, it, vi } from 'vitest'

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
    const ctx = { loader, get: (name: string) => name === 'loader' ? loader : undefined }
    return { ctx, loader, internalImport, configImport }
  }

  it('routes runtime-created entries to the host base, not the profile directory', async () => {
    const { ctx, loader, internalImport, configImport } = fakeContext()
    await mountRootInclude(ctx as never, '/home/profiles/desktop-safe-mode/cordis.yml', [], 'file:///app/dsh/package.json')

    // Runtime children inherit the host-resolved root Include's import policy.
    const HostResolvedRootInclude = loader.builtins.include as { prototype: { import(name: string, stack: () => string): Promise<unknown> } }
    await HostResolvedRootInclude.prototype.import.call(
      { ctx },
      '@deepseek-ai/dsh-host-directory-picker-native',
      () => ''
    )
    expect(internalImport).toHaveBeenCalledWith(
      '@deepseek-ai/dsh-host-directory-picker-native',
      'file:///app/dsh/package.json',
      {}
    )

    // Relative and builtin names keep their configuration-relative meaning.
    await HostResolvedRootInclude.prototype.import.call({ ctx }, './local-plugin.js', () => '')
    await HostResolvedRootInclude.prototype.import.call({ ctx }, 'cordis:group', () => '')
  })

  it('leaves the Loader untouched when no host base is given', async () => {
    const { ctx, loader, configImport } = fakeContext()
    const original = loader.import
    await mountRootInclude(ctx as never, '/home/profiles/web/cordis.yml', [])
    expect(loader.import).toBe(original)
    await loader.import('@deepseek-ai/dsh-llm', () => '')
    expect(configImport).toHaveBeenCalledTimes(1)
  })

  it('uses the installation anchor in the 0.1.7 runtime resolution', async () => {
    const boot = await readFile('node_modules/@deepseek-ai/dsh-app-boot/lib/index.js', 'utf8')
    expect(boot).toContain('const { installAnchor, profile, home = resolveDshHome() } = options')
    expect(boot).toContain('collectInstallationScopePackages(installAnchor')
    expect(boot).toContain('profile === void 0 ? [] : installedProfilePackageNames')
  })
})

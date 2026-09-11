import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  compareSemver,
  inferPluginRuntimeCompatibility,
  parseSemver,
  satisfiesComparator,
  satisfiesRange,
  evaluatePluginMarketCompatibility,
  clearManifestCache,
  type NpmPackageManifest
} from '../src/main/state/plugin-market-check'

describe('plugin-market-check', () => {
  beforeEach(() => clearManifestCache())
  it('parses and compares semver correctly', () => {
    expect(parseSemver('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: []
    })
    expect(parseSemver('0.1.2-alpha.4')).toEqual({
      major: 0,
      minor: 1,
      patch: 2,
      prerelease: ['alpha', 4]
    })
    expect(compareSemver('1.0.0', '1.0.1')).toBe(-1)
    expect(compareSemver('1.2.0', '1.1.9')).toBe(1)
    expect(compareSemver('0.1.2', '0.1.2-alpha.4')).toBe(1)
    expect(compareSemver('0.1.2-alpha.1', '0.1.2-alpha.4')).toBe(-1)
  })

  it('evaluates semver comparators and ranges', () => {
    expect(satisfiesComparator('0.1.2', '^0.1.0')).toBe(true)
    expect(satisfiesComparator('0.2.0', '^0.1.0')).toBe(false)
    expect(satisfiesComparator('1.2.3', '^1.0.0')).toBe(true)
    expect(satisfiesComparator('2.0.0', '^1.0.0')).toBe(false)
    expect(satisfiesComparator('0.1.5', '~0.1.2')).toBe(true)
    expect(satisfiesComparator('0.2.0', '~0.1.2')).toBe(false)
    expect(satisfiesRange('0.1.2-alpha.4', '^0.1.0 || ^0.1.2-0')).toBe(true)
    expect(satisfiesRange('0.1.2', '>=0.1.0 <0.2.0')).toBe(true)
    expect(satisfiesRange('0.2.5', '>=0.1.0 <0.2.0')).toBe(false)
  })

  it('infers runtime compatibility for manifests', () => {
    const compatibleManifest: NpmPackageManifest = {
      name: 'example-plugin',
      version: '1.2.0',
      peerDependencies: {
        '@deepseek-ai/dsh': '^0.1.2-0'
      }
    }
    expect(inferPluginRuntimeCompatibility(compatibleManifest, '0.1.2-rc.1').isCompatible).toBe(true)

    const incompatibleManifest: NpmPackageManifest = {
      name: 'legacy-plugin',
      version: '1.0.0',
      peerDependencies: {
        '@deepseek-ai/dsh': '^0.1.1'
      }
    }
    expect(inferPluginRuntimeCompatibility(incompatibleManifest, '0.1.2-rc.1').isCompatible).toBe(false)

    const deprecatedDepManifest: NpmPackageManifest = {
      name: 'deprecated-dep-plugin',
      version: '1.1.0',
      dependencies: {
        '@deepseek-ai/dsh-host-apiproxy': '^0.1.1'
      }
    }
    expect(inferPluginRuntimeCompatibility(deprecatedDepManifest, '0.1.2').isCompatible).toBe(false)

    const subPackagePeerManifest: NpmPackageManifest = {
      name: 'dsh-better-sidebar',
      version: '0.17.1',
      peerDependencies: {
        '@deepseek-ai/dsh-agent': '^0.1.0-rc.8',
        '@deepseek-ai/cordis': '^4.0.1'
      }
    }
    expect(inferPluginRuntimeCompatibility(subPackagePeerManifest, '0.1.2-rc.1').isCompatible).toBe(false)
    expect(inferPluginRuntimeCompatibility(subPackagePeerManifest, '0.1.0-rc.9').isCompatible).toBe(true)
  })

  it('evaluates plugin market compatibility for upgrade candidates', async () => {
    const mockManifest: NpmPackageManifest = {
      name: 'test-plugin',
      version: '2.0.0',
      peerDependencies: {
        '@deepseek-ai/dsh': '^0.1.2'
      }
    }

    const mockFetch = async () =>
      new Response(JSON.stringify({ 'dist-tags': { latest: '2.0.0' }, versions: { '2.0.0': mockManifest } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })

    const report = await evaluatePluginMarketCompatibility({
      packageName: 'test-plugin',
      installedVersion: '1.0.0',
      currentRuntimeVersion: '0.1.2',
      hasLocalIssue: true,
      fetchFn: mockFetch as unknown as typeof fetch,
      locale: 'zh'
    })

    expect(report.healthStatus).toBe('incompatible-upgrade-available')
    expect(report.upgradeReady).toBe(true)
    expect(report.upgradeVersion).toBe('2.0.0')
  })

  function registry(versions: Array<Partial<NpmPackageManifest> & { version: string }>, latest = versions.at(-1)!.version) {
    return vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      'dist-tags': { latest },
      versions: Object.fromEntries(versions.map((manifest) => [manifest.version, { name: '@fixture/plugin', ...manifest }]))
    }), { status: 200 }))
  }

  const check = (fetchFn: typeof fetch, options = {}) => evaluatePluginMarketCompatibility({
    packageName: '@fixture/plugin', installedVersion: '1.0.0', currentRuntimeVersion: '0.1.2',
    fetchFn, ...options
  })

  it('finds the highest compatible intermediate release when latest requires a newer DSH', async () => {
    const fetchFn = registry([
      { version: '1.10.0', engines: { dsh: '>=0.1.2 <0.2.0' } },
      { version: '1.9.0', engines: { dsh: '^0.1.2' } },
      { version: '2.0.0', engines: { dsh: '>=0.2.0' } }
    ])
    const report = await check(fetchFn, { hasLocalIssue: true })
    expect(report).toMatchObject({ latestVersion: '2.0.0', upgradeVersion: '1.10.0', upgradeReady: true })
    expect(report.detail).toContain('升级后仍需验证启动')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn.mock.calls[0]![0]).toBe('https://registry.npmmirror.com/%40fixture%2Fplugin')
    // Same version list is re-evaluated for another host, not cached as a verdict.
    expect(await check(fetchFn, { currentRuntimeVersion: '0.2.0' })).toMatchObject({ upgradeVersion: '2.0.0' })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('does not downgrade, reinstall the current version or go beyond latest', async () => {
    const fetchFn = registry([
      { version: '0.9.0' }, { version: '1.0.0' },
      { version: '2.0.0', engines: { dsh: '>=0.2.0' } }, { version: '3.0.0' }
    ], '2.0.0')
    for (const installedVersion of ['2.0.0', '3.0.0']) {
      expect(await check(fetchFn, { hasLocalIssue: true, installedVersion })).toMatchObject({
        upgradeReady: false, healthStatus: 'incompatible-no-fix',
        healthLabel: expect.stringContaining('建议卸载'),
        detail: expect.stringContaining('请卸载此插件并继续检测')
      })
      expect(await check(fetchFn, { installedVersion })).toMatchObject({ healthStatus: 'up-to-date' })
      const english = await check(fetchFn, { hasLocalIssue: true, installedVersion, locale: 'en' })
      expect(english.detail).toContain('Remove this plugin and continue checking')
      expect(english.upgradeVersion).toBeUndefined()
    }
    expect(await check(fetchFn, { hasLocalIssue: true })).toMatchObject({ upgradeVersion: '2.0.0' })
  })

  it.each(['zh', 'en'] as const)('offers latest only for a failing plugin when no compatible update matches (%s)', async (locale) => {
    const fetchFn = registry([
      { version: '1.1.0', engines: { dsh: '>=0.2.0' } },
      { version: '2.0.0', peerDependencies: { '@deepseek-ai/dsh': '>=0.3.0' } }
    ])
    expect(await check(fetchFn)).toMatchObject({ upgradeReady: false })
    const report = await check(fetchFn, { hasLocalIssue: true, locale })
    expect(report).toMatchObject({
      upgradeReady: true, upgradeVersion: '2.0.0', latestVersion: '2.0.0',
      healthStatus: 'incompatible-upgrade-available'
    })
    expect(report.healthLabel).toContain(locale === 'zh' ? '兼容性未确认' : 'compatibility unconfirmed')
    expect(report.detail).toContain('>=0.3.0')
  })

  it('skips deprecated versions and prereleases for stable installations', async () => {
    const fetchFn = registry([
      { version: '1.1.0' }, { version: '1.2.0', deprecated: 'broken release' },
      { version: '1.3.0-beta.1' }, { version: '2.0.0', engines: { dsh: '>=0.2.0' } }
    ])
    expect(await check(fetchFn)).toMatchObject({ upgradeVersion: '1.1.0' })
    expect(await check(fetchFn, { installedVersion: '1.0.0-beta.1' })).toMatchObject({ upgradeVersion: '1.3.0-beta.1' })
  })

  it('checks each intermediate version for peer conflicts and removed dependencies', async () => {
    const fetchFn = registry([
      { version: '1.1.0', peerDependencies: { '@deepseek-ai/dsh-agent': '^0.1.2' } },
      { version: '1.2.0', dependencies: { '@deepseek-ai/dsh-host-apiproxy': '*' } },
      { version: '1.3.0', peerDependencies: { '@deepseek-ai/dsh': '>=0.2.0' } }
    ])
    expect(await check(fetchFn)).toMatchObject({ upgradeVersion: '1.1.0' })
  })

  it('treats minVersion as a lower bound and enforces it alongside engines.dsh', async () => {
    const fetchFn = registry([
      { version: '1.1.0', dsh: { minVersion: '0.1.1' } },
      { version: '1.2.0', engines: { dsh: '>=0.1.0' }, dsh: { minVersion: '0.2.0' } }
    ])
    expect(await check(fetchFn)).toMatchObject({ upgradeVersion: '1.1.0' })
  })

  it('keeps registry caches separate and falls back on malformed version lists', async () => {
    const valid = registry([{ version: '1.1.0' }])
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{"version":"2.0.0"}'))
      .mockImplementation(valid)
    expect(await check(fetchFn)).toMatchObject({ upgradeVersion: '1.1.0' })
    expect(fetchFn.mock.calls[1]![0]).toBe('https://registry.npmjs.org/%40fixture%2Fplugin')
    expect(await check(registry([{ version: '1.2.0' }]), { registry: 'https://another-registry.example' }))
      .toMatchObject({ upgradeVersion: '1.2.0' })
  })

  it('reports unavailable metadata and unknown installed versions without claiming compatibility', async () => {
    const failed = vi.fn<typeof fetch>(async () => new Response('', { status: 503 }))
    expect(await check(failed, { hasLocalIssue: true })).toMatchObject({ healthStatus: 'check-failed', upgradeReady: false })
    clearManifestCache()
    expect(await check(registry([{ version: '1.1.0' }]), { installedVersion: undefined, hasLocalIssue: true }))
      .toMatchObject({ healthStatus: 'check-failed', upgradeReady: false })
  })

  it('retries immediately after a failed check instead of caching failure for five minutes', async () => {
    const fetchFn = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockImplementation(registry([{ version: '1.1.0' }]))
    const failed = await check(fetchFn, { hasLocalIssue: true })
    expect(failed.upgradeReady).toBe(false)
    expect(failed.detail).toContain('ENOTFOUND')
    expect(failed.detail).toContain('HTTP 503')
    expect(await check(fetchFn, { hasLocalIssue: true })).toMatchObject({ upgradeReady: true, upgradeVersion: '1.1.0' })
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })
})

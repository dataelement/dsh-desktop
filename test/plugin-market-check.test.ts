import { describe, expect, it } from 'vitest'
import {
  compareSemver,
  inferPluginRuntimeCompatibility,
  parseSemver,
  satisfiesComparator,
  satisfiesRange,
  evaluatePluginMarketCompatibility,
  type NpmPackageManifest
} from '../src/main/state/plugin-market-check'

describe('plugin-market-check', () => {
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
      new Response(JSON.stringify(mockManifest), {
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

    expect(report.healthStatus).toBe('incompatible-fixed-in-latest')
    expect(report.upgradeReady).toBe(true)
    expect(report.upgradeVersion).toBe('2.0.0')
  })
})

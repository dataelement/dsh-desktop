import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_UPDATE_CONFIG, parseDesktopUpdateConfig, stableFeedUrl } from '../src/main/update/update-config'
import { readPackageUpdateConfig } from '../src/main/update/package-update-config'
import { fetchAvailableReleases } from '../src/main/update/version-catalog'
import { DesktopService } from '../src/main/desktop-service/service'

describe('product update configuration', () => {
  it('preserves upstream defaults only when metadata is absent and normalizes the root directory', () => {
    expect(parseDesktopUpdateConfig(undefined)).toBe(DEFAULT_UPDATE_CONFIG)
    const config = parseDesktopUpdateConfig({ updatesBaseUrl: 'https://updates.example/product' })
    expect(config.strategy).toBe('policy')
    expect(config.policyUrl).toBe(DEFAULT_UPDATE_CONFIG.policyUrl)
    expect(stableFeedUrl(config)).toBe('https://updates.example/product/latest/')
  })

  it.each([null, {}, { updatesBaseUrl: 'http://updates.example/' }, { updatesBaseUrl: 'https://user:secret@updates.example/' },
    { updatesBaseUrl: 'https://updates.example/?key=value' }, { updatesBaseUrl: 'https://updates.example/', strategy: 'other' },
    { updatesBaseUrl: 'https://updates.example/', policyUrl: 'http://policy.example/' }])('rejects invalid explicit metadata: %j', value => {
    expect(() => parseDesktopUpdateConfig(value)).toThrow()
  })

  it('reads the supplied installation package rather than the working directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'desktop-update-config-'))
    try {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ dshDesktopUpdates: { updatesBaseUrl: 'https://updates.example/', strategy: 'feed' } }))
      expect(readPackageUpdateConfig(dir).strategy).toBe('feed')
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ dshDesktopUpdates: null }))
      expect(() => readPackageUpdateConfig(dir)).toThrow('Invalid dshDesktopUpdates')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('fetches configured history and rewrites legacy archive URLs without requesting them', async () => {
    const config = parseDesktopUpdateConfig({ updatesBaseUrl: 'https://updates.example/product/', strategy: 'feed' })
    const request = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ versions: [
      { version: '1.0.0', tag: 'v1.0.0', archiveUrl: 'https://dshdesktop.com/updates/archive/1.0.0/' },
      { version: '../escape', tag: 'invalid', archiveUrl: 'https://elsewhere.example/' }
    ] }) }))
    await expect(fetchAvailableReleases('2.0.0', request, config)).resolves.toEqual([
      { version: '1.0.0', tag: 'v1.0.0', archiveUrl: 'https://updates.example/product/archive/1.0.0/' }
    ])
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('https://updates.example/product/versions.json', expect.any(Object))
  })

  it('accepts only the configured archive from a custom policy service', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'desktop-update-policy-'))
    try {
      const config = parseDesktopUpdateConfig({ updatesBaseUrl: 'https://updates.example/product/', policyUrl: 'https://policy.example/check' })
      let feedUrl = 'https://updates.example/product/archive/2.0.0/'
      const request = vi.fn(async () => new Response(JSON.stringify({ updateAvailable: true, version: '2.0.0', feedUrl })))
      const service = new DesktopService({ stateDir: dir, logPath: join(dir, 'harness.log'), version: '1.0.0', platform: 'darwin', arch: 'arm64', request, confirmUpload: async () => false })
      await expect(service.checkUpdate(true, config)).resolves.toMatchObject({ updateAvailable: true, feedUrl })
      expect(request).toHaveBeenCalledWith(expect.stringContaining('https://policy.example/check?'), expect.any(Object))
      feedUrl = 'https://dshdesktop.com/updates/archive/2.0.0/'
      await expect(service.checkUpdate(false, config)).rejects.toThrow('Invalid update policy')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})

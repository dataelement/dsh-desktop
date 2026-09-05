import { describe, expect, it } from 'vitest'
import {
  archiveFeedUrl,
  compareVersions,
  fetchAvailableReleases,
  parseVersionIndex,
  STABLE_FEED_URL,
  VERSION_INDEX_URL
} from '../src/main/update/version-catalog'

describe('version-catalog constants', () => {
  it('points the stable feed and index at the dshdesktop domain', () => {
    expect(STABLE_FEED_URL).toBe('https://dshdesktop.com/updates/latest/')
    expect(VERSION_INDEX_URL).toBe('https://dshdesktop.com/updates/versions.json')
  })

  it('builds a per-version archive feed url with a trailing slash', () => {
    expect(archiveFeedUrl('1.2.3')).toBe('https://dshdesktop.com/updates/archive/1.2.3/')
  })
})

describe('compareVersions', () => {
  it('orders by numeric segments', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBe(-1)
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })

  it('treats a prerelease as lower than its release', () => {
    expect(compareVersions('1.2.3-rc.1', '1.2.3')).toBe(-1)
    expect(compareVersions('1.2.3', '1.2.3-rc.1')).toBe(1)
    expect(compareVersions('1.2.3-rc.1', '1.2.3-rc.2')).toBe(-1)
  })

  it('compares prerelease counters numerically, not lexicographically', () => {
    // "rc.10" < "rc.9" under string comparison; semver says the reverse.
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.9')).toBe(1)
    expect(compareVersions('1.2.3-rc.9', '1.2.3-rc.10')).toBe(-1)
    expect(compareVersions('1.2.3-alpha.10', '1.2.3-alpha.9')).toBe(1)
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.1')).toBe(1)
  })

  it('follows semver identifier precedence', () => {
    // fewer identifiers < more ("alpha" < "alpha.1")
    expect(compareVersions('1.2.3-alpha', '1.2.3-alpha.1')).toBe(-1)
    // numeric identifiers < alphanumeric ones ("1" < "alpha")
    expect(compareVersions('1.2.3-1', '1.2.3-alpha')).toBe(-1)
    expect(compareVersions('1.2.3-alpha', '1.2.3-beta')).toBe(-1)
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.10')).toBe(0)
  })
})

describe('parseVersionIndex', () => {
  it('keeps well-formed entries and drops the rest', () => {
    const raw = {
      versions: [
        { version: '1.2.3', tag: 'v1.2.3', archiveUrl: 'https://dshdesktop.com/updates/archive/1.2.3/' },
        { version: '', tag: 'v0', archiveUrl: 'x' },
        { nope: true },
        42
      ]
    }
    expect(parseVersionIndex(raw)).toEqual([
      { version: '1.2.3', tag: 'v1.2.3', archiveUrl: 'https://dshdesktop.com/updates/archive/1.2.3/' }
    ])
  })

  it('returns an empty array for non-objects or a missing versions array', () => {
    expect(parseVersionIndex(null)).toEqual([])
    expect(parseVersionIndex({})).toEqual([])
    expect(parseVersionIndex('nope')).toEqual([])
  })
})

describe('fetchAvailableReleases', () => {
  const index = {
    versions: [
      { version: '1.0.0', tag: 'v1.0.0', archiveUrl: 'a' },
      { version: '1.2.0', tag: 'v1.2.0', archiveUrl: 'b' },
      { version: '1.1.0', tag: 'v1.1.0', archiveUrl: 'c' }
    ]
  }
  const ok = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(index) } as Response)

  it('drops the current version and sorts descending', async () => {
    const releases = await fetchAvailableReleases('1.1.0', ok as unknown as typeof fetch)
    expect(releases.map((r) => r.version)).toEqual(['1.2.0', '1.0.0'])
  })

  it('throws when the request fails', async () => {
    const bad = () => Promise.resolve({ ok: false, status: 503 } as Response)
    await expect(
      fetchAvailableReleases('1.1.0', bad as unknown as typeof fetch)
    ).rejects.toThrow()
  })

  it('throws when the network rejects', async () => {
    const boom = () => Promise.reject(new Error('offline'))
    await expect(
      fetchAvailableReleases('1.1.0', boom as unknown as typeof fetch)
    ).rejects.toThrow('offline')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { LanMobileBridge } from '../src/main/mobile/lan-mobile-bridge'
import {
  CLOUDFLARED_ASSETS,
  CLOUDFLARED_VERSION,
  ensureCloudflaredBinary,
  extractTryCloudflareUrl,
  resolveCurrentAssetSpec,
  sha256OfFile
} from '../src/main/mobile/cloudflared-tunnel'

const bridges: LanMobileBridge[] = []

afterEach(async () => {
  await Promise.all(bridges.splice(0).map((bridge) => bridge.stop()))
})

describe('Cloudflare Quick Tunnel utilities', () => {
  it('extracts trycloudflare URLs from realistic log streams', () => {
    const log1 = '2026-08-21T09:12:34Z INF | Your quick Tunnel has been created! Visit it at: https://orange-forest-1234.trycloudflare.com |'
    const log2 = 'INF +--------------------------------------------------------------------------------------------+\nINF |  https://my-tunnel-preview-abc-xyz.trycloudflare.com                                         |\nINF +--------------------------------------------------------------------------------------------+'
    const log3 = 'no url here'

    expect(extractTryCloudflareUrl(log1)).toBe('https://orange-forest-1234.trycloudflare.com')
    expect(extractTryCloudflareUrl(log2)).toBe('https://my-tunnel-preview-abc-xyz.trycloudflare.com')
    expect(extractTryCloudflareUrl(log3)).toBeNull()
  })

  it('resolves supported platform and arch specs', () => {
    const darwinArm = resolveCurrentAssetSpec('darwin', 'arm64')
    expect(darwinArm?.spec.asset).toBe('cloudflared-darwin-arm64.tgz')
    expect(darwinArm?.spec.isTarGz).toBe(true)

    const winX64 = resolveCurrentAssetSpec('win32', 'x64')
    expect(winX64?.spec.asset).toBe('cloudflared-windows-amd64.exe')
    expect(winX64?.spec.isTarGz).toBe(false)

    const linuxArm64 = resolveCurrentAssetSpec('linux', 'arm64')
    expect(linuxArm64?.spec.asset).toBe('cloudflared-linux-arm64')

    expect(CLOUDFLARED_VERSION).toBeTruthy()
  })
})

describe('LanMobileBridge tunnel state and endpoints', () => {
  it('exposes tunnel status and handles tunnel toggle', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:3000',
      port: 0
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    expect(snapshot.running).toBe(true)
    expect(snapshot.port).toBeGreaterThan(0)

    const statusRes = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/tunnel/status`)
    expect(statusRes.status).toBe(200)
    const status = await statusRes.json()
    expect(status.active).toBe(false)
    expect(status.loading).toBe(false)

    // Toggle off when already off returns current snapshot safely
    const toggleOffRes = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/tunnel/toggle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enable: false })
    })
    expect(toggleOffRes.status).toBe(200)
    const toggleOffJson = await toggleOffRes.json()
    expect(toggleOffJson.active).toBe(false)
  })
})
describe('cloudflared download integrity', () => {
  it('computes the sha256 digest of a file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-sha-'))
    const file = join(dir, 'payload.bin')
    await writeFile(file, 'hello dsh')
    expect(await sha256OfFile(file)).toBe(
      '5ca8af871577287acfeec98bc5c810d39d7d1713c860579cda5a45808222ad03'
    )
  })

  it('pins the real upstream digests for cloudflared 2026.8.2', () => {
    // Verified against the GitHub Releases API digests for tag 2026.8.2.
    expect(CLOUDFLARED_ASSETS['darwin-arm64']!.sha256).toBe(
      '9042c2c5d8b2de78e60f313d5fb31b6c5c1cebde787a3caf1f2c9588084ac442'
    )
    expect(CLOUDFLARED_ASSETS['darwin-x64']!.sha256).toBe(
      'f1727723c586500e2092368ae21871b3df7ddfd2cb097f22d81bee4a9c458bb4'
    )
    expect(CLOUDFLARED_ASSETS['win32-x64']!.sha256).toBe(
      'c29eee2b121f5436a642eed69fd9767da7e7b8c510fa50aaa130337f931357b5'
    )
    expect(CLOUDFLARED_ASSETS['linux-x64']!.sha256).toBe(
      'fcfb02b575a52ca1af2e3267af4e1517bcdeb30ac48c834c69abaed3c0576ad2'
    )
    expect(CLOUDFLARED_ASSETS['linux-arm64']!.sha256).toBe(
      '7747d94570fb390cf47dcb4f9555c193c6355cda9793f0d878d9049e5d6a7790'
    )
  })

  it('rejects and deletes a downloaded binary whose checksum does not match the pinned spec', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-tunnel-'))
    const download = vi.fn(async (_url: string, destination: string) => {
      await writeFile(destination, 'tampered binary payload')
    })

    await expect(
      ensureCloudflaredBinary({
        cacheDir: dir,
        osPlatform: 'linux',
        osArch: 'x64',
        download,
        findOnPath: async () => null
      })
    ).rejects.toThrow(/checksum mismatch/i)

    expect(download).toHaveBeenCalledTimes(1)
    expect(existsSync(join(dir, 'cloudflared'))).toBe(false)
    const leftovers = await readdir(dir)
    expect(leftovers.filter((name) => name.startsWith('.download-'))).toEqual([])
  })

  it('verifies before extracting tar.gz assets and leaves nothing behind on mismatch', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-tunnel-'))
    await expect(
      ensureCloudflaredBinary({
        cacheDir: dir,
        osPlatform: 'darwin',
        osArch: 'arm64',
        download: async (_url: string, destination: string) => {
          await writeFile(destination, 'not really a tarball')
        },
        findOnPath: async () => null
      })
    ).rejects.toThrow(/checksum mismatch/i)
    expect(await readdir(dir)).toEqual([])
  })

  it('accepts a download whose checksum matches the pinned spec', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-tunnel-'))
    const spec = CLOUDFLARED_ASSETS['linux-x64']!
    const originalSha = spec.sha256
    const payload = Buffer.from('genuine cloudflared binary bytes')
    spec.sha256 = createHash('sha256').update(payload).digest('hex')
    try {
      const binaryPath = await ensureCloudflaredBinary({
        cacheDir: dir,
        osPlatform: 'linux',
        osArch: 'x64',
        download: async (_url: string, destination: string) => {
          await writeFile(destination, payload)
        },
        findOnPath: async () => null
      })
      expect(binaryPath).toBe(join(dir, 'cloudflared'))
      expect(existsSync(binaryPath)).toBe(true)
    } finally {
      spec.sha256 = originalSha
    }
  })

  it('sweeps leftover .download-* files from interrupted runs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-tunnel-'))
    await writeFile(join(dir, '.download-1700000000000-cloudflared-linux-amd64'), 'partial')
    const spec = CLOUDFLARED_ASSETS['linux-x64']!
    const originalSha = spec.sha256
    const payload = Buffer.from('fresh genuine bytes')
    spec.sha256 = createHash('sha256').update(payload).digest('hex')
    try {
      await ensureCloudflaredBinary({
        cacheDir: dir,
        osPlatform: 'linux',
        osArch: 'x64',
        download: async (_url: string, destination: string) => {
          await writeFile(destination, payload)
        },
        findOnPath: async () => null
      })
      const leftovers = (await readdir(dir)).filter((name) => name.startsWith('.download-'))
      expect(leftovers).toEqual([])
    } finally {
      spec.sha256 = originalSha
    }
  })
})


import { afterEach, describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import { LanMobileBridge } from '../src/main/mobile/lan-mobile-bridge'
import {
  extractTryCloudflareUrl,
  resolveCurrentAssetSpec,
  CLOUDFLARED_VERSION
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

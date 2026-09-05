import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { LanMobileBridge } from '../src/main/mobile/lan-mobile-bridge'
import {
  CLOUDFLARED_ASSETS,
  CLOUDFLARED_VERSION,
  ensureCloudflaredBinary,
  extractTryCloudflareUrl,
  resolveCurrentAssetSpec,
  sha256OfFile,
  terminateChildProcess
} from '../src/main/mobile/cloudflared-tunnel'
import {
  startTunnelWithFallback,
  type InternetTunnelInstance
} from '../src/main/mobile/internet-tunnel'
import { extractPinggyUrl } from '../src/main/mobile/pinggy-tunnel'

const bridges: LanMobileBridge[] = []
const harnessServers: ReturnType<typeof createServer>[] = []

afterEach(async () => {
  await Promise.all(bridges.splice(0).map((bridge) => bridge.stop()))
  await Promise.all(
    harnessServers.splice(0).map((server) => {
      server.closeAllConnections()
      return new Promise<void>((resolve) => server.close(() => resolve()))
    })
  )
})

describe('Cloudflare Quick Tunnel utilities', () => {
  it('extracts trycloudflare URLs from realistic log streams', () => {
    const log1 = '2026-08-21T09:12:34Z INF | Your quick Tunnel has been created! Visit it at: https://orange-forest-1234.trycloudflare.com |'
    const log2 = 'INF +--------------------------------------------------------------------------------------------+\nINF |  https://my-tunnel-preview-abc-xyz.trycloudflare.com                                         |\nINF +--------------------------------------------------------------------------------------------+'
    const log3 = 'no url here'

    expect(extractTryCloudflareUrl(log1)).toBe('https://orange-forest-1234.trycloudflare.com')
    expect(extractTryCloudflareUrl(log2)).toBe('https://my-tunnel-preview-abc-xyz.trycloudflare.com')
    expect(extractTryCloudflareUrl(log3)).toBeNull()
    expect(
      extractTryCloudflareUrl(
        'failed to request quick Tunnel: Post "https://api.trycloudflare.com/tunnel": connection reset'
      )
    ).toBeNull()
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

  describe('terminateChildProcess escalation', () => {
    interface FakeChild {
      exitCode: number | null
      signalCode: NodeJS.Signals | null
      killed: boolean
      kill: (signal: NodeJS.Signals) => boolean
    }

    function fakeChild(): FakeChild {
      const child = {
        exitCode: null,
        signalCode: null,
        killed: false,
        kill: vi.fn((signal: NodeJS.Signals) => {
          child.killed = true
          return true
        })
      }
      return child
    }

    it('escalates to SIGKILL when SIGTERM did not stop the child', async () => {
      const child = fakeChild()
      terminateChildProcess(child, 10)
      expect(child.kill).toHaveBeenCalledWith('SIGTERM')
      await new Promise((resolve) => setTimeout(resolve, 40))
      expect(child.kill).toHaveBeenCalledWith('SIGKILL')
    })

    it('never escalates once the child has exited after SIGTERM', async () => {
      const child = fakeChild()
      vi.mocked(child.kill).mockImplementationOnce(() => {
        child.killed = true
        child.exitCode = 143
        return true
      })
      terminateChildProcess(child, 10)
      await new Promise((resolve) => setTimeout(resolve, 40))
      expect(child.kill).toHaveBeenCalledTimes(1)
      expect(child.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('leaves an already-exited child untouched', () => {
      const child = fakeChild()
      child.exitCode = 0
      terminateChildProcess(child, 10)
      expect(child.kill).not.toHaveBeenCalled()
    })
  })
})

describe('Pinggy Tunnel utilities', () => {
  it('extracts current Pinggy HTTPS URL formats without accepting the control host', () => {
    expect(
      extractPinggyUrl(
        'You can access local server via following URL(s):\nhttps://fakqxzqrohxxx.a.pinggy.link'
      )
    ).toBe('https://fakqxzqrohxxx.a.pinggy.link')
    expect(
      extractPinggyUrl(
        '{"urls":["https://rnckk-2405-201.run.pinggy-free.link"]}'
      )
    ).toBe('https://rnckk-2405-201.run.pinggy-free.link')
    expect(extractPinggyUrl('ssh -p 443 free.pinggy.io')).toBeNull()
  })

  it('uses Pinggy only after Cloudflare fails', async () => {
    const calls: string[] = []
    const pinggy = fakeTunnel('pinggy', 'https://fallback.a.pinggy.link')
    const result = await startTunnelWithFallback({
      startCloudflare: async () => {
        calls.push('cloudflare')
        throw new Error('connection reset')
      },
      startPinggy: async () => {
        calls.push('pinggy')
        return pinggy
      }
    })

    expect(result).toBe(pinggy)
    expect(calls).toEqual(['cloudflare', 'pinggy'])
  })

  it('does not start Pinggy when Cloudflare succeeds', async () => {
    const cloudflare = fakeTunnel(
      'cloudflare',
      'https://primary-mobile.trycloudflare.com'
    )
    let pinggyStarted = false
    const result = await startTunnelWithFallback({
      startCloudflare: async () => cloudflare,
      startPinggy: async () => {
        pinggyStarted = true
        return fakeTunnel('pinggy', 'https://unused.a.pinggy.link')
      }
    })

    expect(result).toBe(cloudflare)
    expect(pinggyStarted).toBe(false)
  })

  it('can force the real fallback path for manual Pinggy testing', async () => {
    const calls: string[] = []
    const logs: string[] = []
    const pinggy = fakeTunnel('pinggy', 'https://forced-fallback.a.pinggy.link')
    const result = await startTunnelWithFallback({
      forceCloudflareFailure: true,
      startCloudflare: async () => {
        calls.push('cloudflare')
        return fakeTunnel('cloudflare', 'https://unused.trycloudflare.com')
      },
      startPinggy: async () => {
        calls.push('pinggy')
        return pinggy
      },
      log: (message) => logs.push(message)
    })

    expect(result).toBe(pinggy)
    expect(calls).toEqual(['pinggy'])
    expect(logs).toContain(
      '[tunnel] Cloudflare unavailable, falling back to Pinggy: Cloudflare failure forced by DSH_TUNNEL_FORCE_PINGGY'
    )
  })

  it('preserves both provider errors when neither tunnel is available', async () => {
    await expect(
      startTunnelWithFallback({
        startCloudflare: async () => {
          throw new Error('Cloudflare reset')
        },
        startPinggy: async () => {
          throw new Error('OpenSSH missing')
        }
      })
    ).rejects.toThrow('Cloudflare: Cloudflare reset; Pinggy: OpenSSH missing')
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
function fakeTunnel(
  provider: InternetTunnelInstance['provider'],
  url: string
): InternetTunnelInstance {
  return {
    provider,
    url,
    process: {} as InternetTunnelInstance['process'],
    stop: async () => undefined
  }
}

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

describe('LanMobileBridge toggle concurrency', () => {
  it('ignores concurrent tunnel toggles while a launch is already in flight', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:3000',
      port: 0
    })
    bridges.push(bridge)
    await bridge.start()

    let launches = 0
    Object.assign(bridge as unknown as Record<string, unknown>, {
      launchTunnel: async () => {
        launches += 1
        await new Promise((resolve) => setTimeout(resolve, 30))
      }
    })

    const [first, second] = await Promise.all([
      bridge.toggleTunnel(true),
      bridge.toggleTunnel(true)
    ])

    expect(launches).toBe(1)
    expect(first.tunnelActive).toBe(true)
    expect(second.tunnelLoading).toBe(true)
    expect(second.tunnelActive).toBe(false)
    expect(bridge.snapshot().tunnelActive).toBe(true)
  })
})

describe('LanMobileBridge launch lifecycle', () => {
  it('stops a tunnel spawned by a launch that disables mid-flight', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:3000',
      port: 0
    })
    bridges.push(bridge)
    await bridge.start()

    const stopped: string[] = []
    let releaseLaunch: (() => void) | undefined
    Object.assign(bridge as unknown as Record<string, unknown>, {
      launchTunnel: () =>
        new Promise<void>((resolve) => {
          releaseLaunch = () => {
            Object.assign(bridge as unknown as Record<string, unknown>, {
              tunnelInstance: {
                url: 'https://raced.trycloudflare.com',
                process: {},
                stop: async () => {
                  stopped.push('raced')
                }
              }
            })
            resolve()
          }
        })
    })

    const enabling = bridge.toggleTunnel(true)
    await new Promise((resolve) => setTimeout(resolve, 20))
    const disabling = bridge.toggleTunnel(false)
    await new Promise((resolve) => setTimeout(resolve, 20))
    releaseLaunch!()
    await Promise.all([enabling, disabling])

    expect(stopped).toEqual(['raced'])
    const snapshot = bridge.snapshot()
    expect(snapshot.tunnelActive).toBe(false)
    expect(snapshot.tunnelLoading).toBe(false)
  })

  it('retries after a failed launch and resets the loading flag', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:3000',
      port: 0
    })
    bridges.push(bridge)
    await bridge.start()

    let launches = 0
    Object.assign(bridge as unknown as Record<string, unknown>, {
      launchTunnel: async () => {
        launches += 1
        if (launches === 1) throw new Error('binary download failed')
        Object.assign(bridge as unknown as Record<string, unknown>, {
          tunnelInstance: {
            url: 'https://second.trycloudflare.com',
            process: {},
            stop: async () => undefined
          }
        })
      }
    })

    const failed = await bridge.toggleTunnel(true)
    expect(failed.tunnelActive).toBe(false)
    expect(failed.tunnelLoading).toBe(false)
    expect(failed.tunnelError).toBe('binary download failed')

    const retried = await bridge.toggleTunnel(true)
    expect(launches).toBe(2)
    expect(retried.tunnelActive).toBe(true)
    expect(retried.tunnelLoading).toBe(false)
  })

  it('waits for an in-flight launch during stop() and kills its tunnel', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:3000',
      port: 0
    })
    bridges.push(bridge)
    await bridge.start()

    const stopped: string[] = []
    let releaseLaunch: (() => void) | undefined
    Object.assign(bridge as unknown as Record<string, unknown>, {
      launchTunnel: () =>
        new Promise<void>((resolve) => {
          releaseLaunch = () => {
            Object.assign(bridge as unknown as Record<string, unknown>, {
              tunnelInstance: {
                url: 'https://late.trycloudflare.com',
                process: {},
                stop: async () => {
                  stopped.push('late')
                }
              }
            })
            resolve()
          }
        })
    })

    const enabling = bridge.toggleTunnel(true)
    await new Promise((resolve) => setTimeout(resolve, 20))
    const stopping = bridge.stop()
    await new Promise((resolve) => setTimeout(resolve, 20))
    releaseLaunch!()
    await Promise.all([enabling, stopping])

    expect(stopped).toEqual(['late'])
    expect(bridge.snapshot()).toEqual({ running: false, connected: false })
  })

  it('reports HTTP 409 for an enable toggle while a launch is in flight', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:3000',
      port: 0
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()

    let releaseLaunch: (() => void) | undefined
    Object.assign(bridge as unknown as Record<string, unknown>, {
      launchTunnel: () =>
        new Promise<void>((resolve) => {
          releaseLaunch = resolve
        })
    })

    void bridge.toggleTunnel(true)
    await new Promise((resolve) => setTimeout(resolve, 20))

    const response = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/tunnel/toggle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: `http://127.0.0.1:${snapshot.port}` },
      body: JSON.stringify({ enable: true })
    })
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toMatch(/already in progress/i)

    releaseLaunch!()
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
})
describe('LanMobileBridge shutdown with live connections', () => {
  it('resolves stop() promptly even while an authorized mobile RPC is still in flight', async () => {
    // A harness that accepts connections but never answers: the forwarded
    // session.list hangs until its 30s abort timeout.
    const unresponsiveHarness = createServer(() => {})
    await new Promise<void>((resolve) => unresponsiveHarness.listen(0, '127.0.0.1', resolve))
    harnessServers.push(unresponsiveHarness)
    const harnessPort = (unresponsiveHarness.address() as AddressInfo).port

    const bridge = new LanMobileBridge({
      harnessUrl: () => `http://127.0.0.1:${harnessPort}`
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()

    // Pair one phone through the reconnect surface to get an auth cookie.
    const reconnect = await fetch(`http://127.0.0.1:${snapshot.port}/reconnect`)
    const pairingId = /let id="([^"]+)"/.exec(await reconnect.text())?.[1]
    expect(pairingId).toBeTruthy()
    await fetch(`http://127.0.0.1:${snapshot.port}/desktop/decide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: pairingId, approved: true })
    })
    const approved = await fetch(
      `http://127.0.0.1:${snapshot.port}/pair/status?id=${pairingId}`
    )
    expect(await approved.clone().json()).toEqual({ approved: true })
    const cookie = approved.headers.get('set-cookie')!.split(';', 1)[0]!

    void fetch(`http://127.0.0.1:${snapshot.port}/api/rpc`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'session.list', payload: {} })
    }).catch(() => undefined)
    await new Promise((resolve) => setTimeout(resolve, 100))

    const winner = await Promise.race([
      bridge.stop().then(() => 'stopped' as const),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 3_000))
    ])
    expect(winner).toBe('stopped')
  })
})

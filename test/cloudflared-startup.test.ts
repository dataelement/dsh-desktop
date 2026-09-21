import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractTryCloudflareUrl, startCloudflareQuickTunnel } from '../src/main/mobile/cloudflared-tunnel'

vi.mock('node:child_process', async (importOriginal) => ({
  ...await importOriginal<typeof import('node:child_process')>(), spawn: vi.fn()
}))

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

function childFixture() {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(), stderr: new PassThrough(),
    exitCode: null as number | null, signalCode: null as NodeJS.Signals | null,
    kill: vi.fn((_signal: NodeJS.Signals) => { child.exitCode = 0; return true })
  })
  // The spawn boundary only consumes pipe events, exit state and kill(); the
  // fixture intentionally has no OS process or unrelated ChildProcess IPC API.
  vi.mocked(spawn).mockReturnValue(child as unknown as ChildProcess)
  return child
}

describe('Cloudflare startup lifecycle', () => {
  it('recognizes a fragmented URL without joining separate streams', async () => {
    vi.useFakeTimers()
    const child = childFixture()
    const start = startCloudflareQuickTunnel({ port: 3456, binaryPath: 'fixture' })
    child.stderr.write('https://mobile-')
    child.stdout.write('wrong.trycloudflare.com\n')
    child.stderr.write('ready.trycloudflare.com\n')
    const tunnel = await start
    expect(tunnel.url).toBe('https://mobile-ready.trycloudflare.com')
    expect(child.stderr.listenerCount('data')).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    await tunnel.stop()
    await vi.runAllTimersAsync()
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
    child.stdout.destroy(); child.stderr.destroy()
  })

  it('settles a timeout once and ignores output after cleanup', async () => {
    vi.useFakeTimers()
    const child = childFixture()
    const log = vi.fn()
    const start = startCloudflareQuickTunnel({ port: 3456, binaryPath: 'fixture', timeoutMs: 10, log })
    const rejected = expect(start).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(10)
    await rejected
    child.stderr.emit('data', 'https://too-late.trycloudflare.com\n')
    child.emit('error', new Error('late error'))
    expect(log).not.toHaveBeenCalled()
    expect(child.stderr.listenerCount('data')).toBe(0)
    await vi.runAllTimersAsync()
    expect(vi.getTimerCount()).toBe(0)
    child.stdout.destroy(); child.stderr.destroy()
  })

  it('skips control-host URLs while rejecting hostname suffixes', () => {
    expect(extractTryCloudflareUrl('https://api.trycloudflare.com https://valid.trycloudflare.com'))
      .toBe('https://valid.trycloudflare.com')
    expect(extractTryCloudflareUrl('https://wrong.trycloudflare.com.example.com')).toBeNull()
  })
})

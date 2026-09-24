import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractPinggyUrl, startPinggyTunnel } from '../src/main/mobile/pinggy-tunnel'

vi.mock('node:child_process', async (importOriginal) => ({
  ...await importOriginal<typeof import('node:child_process')>(), spawn: vi.fn()
}))

let directory: string
const pipes: PassThrough[] = []
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'dsh-pinggy-start-')) })
afterEach(async () => {
  for (const pipe of pipes.splice(0)) pipe.destroy()
  vi.useRealTimers()
  vi.clearAllMocks()
  await rm(directory, { recursive: true, force: true })
})

async function fixture(timeoutMs = 30_000) {
  const identityPath = join(directory, 'identity')
  await writeFile(identityPath, 'test fixture, not a key')
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(), stderr: new PassThrough(),
    exitCode: null as number | null, signalCode: null as NodeJS.Signals | null,
    kill: vi.fn((_signal: NodeJS.Signals) => { child.exitCode = 0; return true })
  })
  pipes.push(child.stdout, child.stderr)
  let signalStarted: () => void = () => { throw new Error('Fixture not initialized') }
  const started = new Promise<void>((resolve) => { signalStarted = resolve })
  vi.mocked(spawn).mockImplementation(() => {
    signalStarted()
    // Only the process boundary is replaced; filesystem setup and startup logic stay real.
    return child as unknown as ChildProcess
  })
  const log = vi.fn()
  const start = startPinggyTunnel({
    port: 3456, knownHostsPath: join(directory, 'known-hosts'), identityPath,
    sshPath: process.execPath, timeoutMs, log
  })
  await started
  return { child, start, log }
}

describe('Pinggy startup', () => {
  it('does not combine unrelated stdout and stderr fragments into a pairing URL', async () => {
    vi.useFakeTimers()
    const { child, start, log } = await fixture()
    child.stdout.write('https://real-')
    child.stderr.write('wrong.a.pinggy.link\n')
    child.stdout.write('phone.a.pinggy.link\n')
    const tunnel = await start
    expect(tunnel.url).toBe('https://real-phone.a.pinggy.link')
    expect(child.stdout.listenerCount('data')).toBe(0)
    expect(child.stderr.listenerCount('data')).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    child.stderr.emit('data', 'https://late.a.pinggy.link\n')
    expect(log).toHaveBeenCalledTimes(1)
    await tunnel.stop()
    await vi.runAllTimersAsync()
  })

  it('rejects once on timeout and ignores late output', async () => {
    vi.useFakeTimers()
    const { child, start, log } = await fixture(10)
    const rejected = expect(start).rejects.toThrow('timed out')
    child.stderr.write('connection waiting\n')
    await vi.advanceTimersByTimeAsync(10)
    await rejected
    child.stdout.emit('data', 'https://late.a.pinggy.link\n')
    child.emit('error', new Error('late error'))
    expect(log).not.toHaveBeenCalled()
    expect(child.stdout.listenerCount('data')).toBe(0)
    expect(child.stderr.listenerCount('data')).toBe(0)
    await vi.runAllTimersAsync()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects misleading hostname suffixes', () => {
    for (const suffix of ['.example.com', 'evil', '-evil']) {
      expect(extractPinggyUrl(`https://phone.a.pinggy.link${suffix}`)).toBeNull()
    }
    expect(extractPinggyUrl('https://phone.a.pinggy.online/path')).toBe('https://phone.a.pinggy.online')
  })
})

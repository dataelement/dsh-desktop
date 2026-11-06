import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { installGeneration } from '../packages/dsh-desktop-market-installer/generations/installer'
import { listGenerations } from '../packages/dsh-desktop-market-installer/generations/registry'

/**
 * Covers the two clocks around the pnpm subprocess (#851): continuous
 * progress must not hit the old single total-duration bound, a stalled
 * process must still die, a churning process must hit the hard ceiling, and
 * every kill must read as a timeout in the log rather than masquerading as
 * a pnpm error. Timings keep an order-of-magnitude margin (chunk interval =
 * idle/10) so a slow CI cannot starve the re-arm. The scripted child plays
 * pnpm: scheduled output, then — unless the installer killed it first — a
 * minimal installed package written into the staging directory (the cwd
 * spawnProcess receives) and a close with 0.
 */
describe('the generation install timeout', () => {
  const homes: string[] = []

  async function freshHome(): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-gentimeout-'))
    homes.push(home)
    await mkdir(join(home, 'profiles', '.generations'), { recursive: true })
    return home
  }

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  function scriptedChild(
    stagingDir: string,
    plan: Array<[number, string]>,
    finishMs: number | null
  ) {
    // Structural fake of the ChildProcess subset defaultRunInstall touches.
    interface ScriptedChild {
      stdout: EventEmitter
      stderr: EventEmitter
      on: (event: string, listener: (...args: never[]) => void) => unknown
      once: (event: string, listener: (...args: never[]) => void) => unknown
      emit: (event: string, ...args: unknown[]) => boolean
      kill: () => void
    }
    const streams = { stdout: new EventEmitter(), stderr: new EventEmitter() }
    const child = Object.assign(new EventEmitter(), streams) as unknown as ScriptedChild
    let killed = false
    child.kill = () => {
      killed = true
      child.emit('close', null)
    }
    for (const [delay, text] of plan) {
      setTimeout(() => { if (!killed) streams.stdout.emit('data', Buffer.from(text)) }, delay)
    }
    if (finishMs !== null) {
      setTimeout(() => {
        if (killed) return
        const pkg = join(stagingDir, 'node_modules', 'slow-plugin')
        void mkdir(pkg, { recursive: true })
          .then(() => writeFile(join(pkg, 'package.json'),
            JSON.stringify({ name: 'slow-plugin', version: '1.0.0' })))
          .then(() => child.emit('close', 0))
      }, finishMs)
    }
    return child
  }

  async function installWith(
    home: string,
    plan: Array<[number, string]>,
    finishMs: number | null,
    options: object
  ) {
    const traces: string[] = []
    const result = await installGeneration({
      dshHome: home,
      pluginSpec: 'slow-plugin@1.0.0',
      expectedPluginName: 'slow-plugin',
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: '/unused',
      spawnProcess: (_exe: string, _args: readonly string[], opts: { cwd: string }) =>
        scriptedChild(opts.cwd, plan, finishMs),
      onTrace: (line: string) => traces.push(line),
      ...options
    } as never)
    return { result, traces }
  }

  it('lets an install with continuous progress finish beyond the idle bound', async () => {
    const home = await freshHome()
    // Idle bound 300ms, one chunk every 30ms (interval = idle/10) for 900ms,
    // success written at 950ms. The pre-#851 single total-duration timer
    // killed exactly this shape of install; each re-arm keeps an order of
    // magnitude of scheduler slack, so slow CI cannot spuriously starve it.
    const plan = Array.from({ length: 30 }, (_, i): [number, string] =>
      [(i + 1) * 30, `Progress: added ${i}`])
    const { result } = await installWith(home, plan, 950, { installTimeoutMs: 300 })
    expect(result.ok, `install was killed: ${result.detail ?? ''}`).toBe(true)
    expect(result.detail ?? '').not.toMatch(/timed out/u)
    expect((await listGenerations(home)).length).toBe(1)
  }, 30_000)

  it('kills a stalled process on the idle bound and names the timeout', async () => {
    const home = await freshHome()
    // One line of output, then silence: the process never finishes on its own.
    const { result, traces } = await installWith(home, [[0, 'Progress: resolved 1']], null, {
      installTimeoutMs: 120
    })
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/timed out/u)
    expect(result.detail).toMatch(/no output for 120ms/u)
    expect(traces.join('\n')).toMatch(/timed out.*no output for 120ms/u)
  }, 30_000)

  it('ends a churning process at the hard ceiling even while it emits output', async () => {
    const home = await freshHome()
    // Output every 30ms for >1.2s so the 10-second idle bound never fires;
    // the 200ms hard ceiling must still end it.
    const plan = Array.from({ length: 40 }, (_, i): [number, string] =>
      [i * 30, `Progress: churn ${i}`])
    const { result } = await installWith(home, plan, null, {
      installTimeoutMs: 10_000,
      installHardTimeoutMs: 200
    })
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/hard ceiling/u)
    expect(result.detail).toMatch(/timed out/u)
  }, 30_000)

  it.each([0, -5, Number.NaN, 12.5])('treats the override %s as unset, not as kill-now', async (bad) => {
    const home = await freshHome()
    // A raw 0/NaN would fire setTimeout on the next tick and SIGKILL every
    // install; the guard must fall back to the 90-second default while the
    // scripted child closes with success at 120ms.
    const { result } = await installWith(home, [[20, 'Progress: added 0']], 120, {
      installTimeoutMs: bad
    })
    expect(result.ok, `installTimeoutMs=${String(bad)}: ${result.detail ?? ''}`).toBe(true)
  }, 30_000)
})

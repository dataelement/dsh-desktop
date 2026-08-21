import { EventEmitter } from 'node:events'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  MARKER,
  SIDELINE_MARKER,
  blockedTargets,
  lockedRenameTarget,
  runWithLockRecovery,
  sidelinePath
} from '../packages/dsh-desktop-market-installer/pnpm-runner.mjs'

const WINDOWS_LOCK_FAILURE = [
  'Update failed: dshmarket',
  "error: EPERM: operation not permitted, rename 'C:\\Users\\u\\AppData\\Roaming\\dsh-desktop-dev\\harness\\profiles\\web\\node_modules\\argparse_tmp_19856_4' -> 'C:\\Users\\u\\AppData\\Roaming\\dsh-desktop-dev\\harness\\profiles\\web\\node_modules\\argparse'",
  '    at Worker.<anonymous> (D:\\AA\\DSH Desktop Dev\\resources\\app\\node_modules\\pnpm\\dist\\pnpm.cjs:104217:22)'
].join('\n')

const BLOCKED_TARGET =
  'C:\\Users\\u\\AppData\\Roaming\\dsh-desktop-dev\\harness\\profiles\\web\\node_modules\\argparse'

function fakePnpm(runs) {
  const calls = []
  const spawnProcess = (executable, args) => {
    const run = runs[calls.length] ?? { code: 0, output: '' }
    calls.push({ executable, args })
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.pid = 4242
    child.kill = () => {
      child.emit('exit', null, 'SIGKILL')
      return true
    }
    if (run.silent) return child
    queueMicrotask(() => {
      if (run.output) child.stderr.emit('data', run.output)
      child.emit('exit', run.code, null)
    })
    return child
  }
  return { spawnProcess, calls }
}

describe('packaged pnpm runner', () => {
  it('recognizes a Windows locked rename inside a profile', () => {
    expect(lockedRenameTarget(WINDOWS_LOCK_FAILURE)).toBe(BLOCKED_TARGET)
    expect(
      lockedRenameTarget(
        "EBUSY: resource busy or locked, rename '/p/node_modules/a_tmp_1_1' -> '/p/node_modules/a'"
      )
    ).toBe('/p/node_modules/a')
  })

  it('leaves unrelated failures alone', () => {
    expect(lockedRenameTarget('ERR_PNPM_FETCH_500  GET https://registry/x failed')).toBeUndefined()
    expect(
      lockedRenameTarget("EPERM: operation not permitted, rename '/tmp/a' -> '/etc/passwd'")
    ).toBeUndefined()
    expect(lockedRenameTarget('')).toBeUndefined()
  })

  it('names the sidelined directory next to the blocked one', () => {
    expect(sidelinePath('/p/node_modules/argparse', 42)).toBe(
      `/p/node_modules/argparse${SIDELINE_MARKER}42`
    )
  })

  it('passes a successful run straight through', async () => {
    const { spawnProcess, calls } = fakePnpm([{ code: 0, output: '' }])
    const moveAside = vi.fn()

    const result = await runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      moveAside,
      wait: async () => undefined
    })

    expect(result.code).toBe(0)
    expect(calls).toHaveLength(1)
    expect(moveAside).not.toHaveBeenCalled()
  })

  it('does not retry a failure that is not a locked rename', async () => {
    const { spawnProcess, calls } = fakePnpm([{ code: 1, output: 'ERR_PNPM_NO_MATCHING_VERSION' }])

    const result = await runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      wait: async () => undefined
    })

    expect(result.code).toBe(1)
    expect(calls).toHaveLength(1)
  })

  it('retries once for a lock that clears on its own', async () => {
    const { spawnProcess, calls } = fakePnpm([
      { code: 1, output: WINDOWS_LOCK_FAILURE },
      { code: 0, output: '' }
    ])
    const moveAside = vi.fn()

    const result = await runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      moveAside,
      wait: async () => undefined
    })

    expect(result.code).toBe(0)
    expect(calls).toHaveLength(2)
    expect(moveAside).not.toHaveBeenCalled()
  })

  it('moves the held directory aside and installs over the freed name', async () => {
    const { spawnProcess, calls } = fakePnpm([
      { code: 1, output: WINDOWS_LOCK_FAILURE },
      { code: 1, output: WINDOWS_LOCK_FAILURE },
      { code: 0, output: '' }
    ])
    const moveAside = vi.fn(async () => undefined)

    const result = await runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      moveAside,
      exists: () => true,
      listEntries: async () => [],
      wait: async () => undefined,
      now: () => 1234
    })

    expect(result.code).toBe(0)
    expect(calls).toHaveLength(3)
    expect(moveAside).toHaveBeenCalledWith(
      BLOCKED_TARGET,
      `${BLOCKED_TARGET}${SIDELINE_MARKER}1234`
    )
  })

  it('stops a pnpm that has gone silent instead of waiting out the host timeout', async () => {
    const { spawnProcess, calls } = fakePnpm([{ silent: true }])
    const lines = []

    const result = await runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      idleTimeoutMs: 5,
      kill: (child) => child.kill(),
      watchActivity: () => () => undefined,
      report: (message) => lines.push(message)
    })

    expect(result.code).toBe(1)
    expect(result.idleTimedOut).toBe(true)
    // A wedged run is not retried — three stuck runs are three times the wait.
    expect(calls).toHaveLength(1)
    expect(lines[0]).toContain('touched nothing')
  })

  it('keeps a quiet run that is still writing packages', async () => {
    // Without a TTY pnpm drops its progress display: resolution, a cold
    // download and a large link phase can each pass without a line. Killing
    // those would turn a slow install into a failed one.
    const { spawnProcess } = fakePnpm([{ silent: true }])
    let stopWatching = 0
    let signalActivity = () => undefined

    const running = runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      idleTimeoutMs: 40,
      kill: (child) => child.kill(),
      watchActivity: (onActivity) => {
        signalActivity = onActivity
        return () => {
          stopWatching += 1
        }
      },
      report: () => undefined
    })

    // Three quiet-but-busy stretches, each shorter than the allowance.
    for (let beat = 0; beat < 3; beat += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25))
      signalActivity()
    }
    signalActivity()
    const result = await Promise.race([
      running,
      new Promise((resolve) => setTimeout(() => resolve('still running'), 20))
    ])

    expect(result).toBe('still running')
    signalActivity = () => undefined
    await expect(running).resolves.toMatchObject({ idleTimedOut: true })
    expect(stopWatching).toBe(1)
  })

  it('recovers a run that named its blocker and then hung', async () => {
    // pnpm raises the locked rename inside a worker and has been seen never to
    // unwind from it. That run has to be stopped — and it is also the exact
    // run this recovery exists for, so being stopped must not skip it.
    const calls = []
    const spawnProcess = () => {
      const attempt = calls.length
      calls.push(attempt)
      const child = new EventEmitter()
      child.stdout = new EventEmitter()
      child.stderr = new EventEmitter()
      child.pid = 4242
      child.kill = () => {
        child.emit('exit', null, 'SIGKILL')
        return true
      }
      queueMicrotask(() => {
        if (attempt < 2) {
          // Reports the failure, then never exits.
          child.stderr.emit('data', WINDOWS_LOCK_FAILURE)
          return
        }
        child.emit('exit', 0, null)
      })
      return child
    }
    const moveAside = vi.fn(async () => undefined)

    const result = await runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      moveAside,
      exists: () => true,
      listEntries: async () => [],
      wait: async () => undefined,
      now: () => 99,
      idleTimeoutMs: 10_000,
      stallAfterFailureMs: 5,
      killGraceMs: 5,
      kill: (child) => child.kill(),
      watchActivity: () => () => undefined,
      report: () => undefined
    })

    expect(result.code).toBe(0)
    expect(calls).toHaveLength(3)
    expect(moveAside).toHaveBeenCalledWith(
      BLOCKED_TARGET,
      `${BLOCKED_TARGET}${SIDELINE_MARKER}99`
    )
  })

  it('gives up on a run whose kill never lands', async () => {
    // taskkill can miss on Windows. Waiting for an exit that never comes would
    // be the very hang the idle timeout exists to prevent.
    const { spawnProcess } = fakePnpm([{ silent: true }])

    const result = await runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      idleTimeoutMs: 5,
      killGraceMs: 5,
      kill: () => undefined,
      watchActivity: () => () => undefined,
      report: () => undefined
    })

    expect(result.code).toBe(1)
    expect(result.idleTimedOut).toBe(true)
  })

  it('says what it did, so a report without those lines names an unwrapped pnpm', async () => {
    const { spawnProcess } = fakePnpm([
      { code: 1, output: WINDOWS_LOCK_FAILURE },
      { code: 1, output: WINDOWS_LOCK_FAILURE },
      { code: 0, output: '' }
    ])
    const lines = []

    await runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      moveAside: async () => undefined,
      exists: () => true,
      listEntries: async () => [],
      wait: async () => undefined,
      now: () => 1234,
      report: (message) => lines.push(message)
    })

    expect(lines.join('\n')).toContain('retrying')
    const freed = lines.find((line) => line.startsWith('freed '))
    expect(freed).toContain(BLOCKED_TARGET)
    expect(lines.at(-1)).toContain('succeeded')
    expect(MARKER).toContain('dsh-desktop')
  })

  it('reports pnpm\u2019s own failure when the directory cannot be moved either', async () => {
    const { spawnProcess, calls } = fakePnpm([
      { code: 1, output: WINDOWS_LOCK_FAILURE },
      { code: 1, output: WINDOWS_LOCK_FAILURE }
    ])

    const result = await runWithLockRecovery('/node', ['/pnpm.cjs', 'add', 'x'], {
      spawnProcess,
      moveAside: async () => {
        throw new Error('EPERM')
      },
      exists: () => true,
      listEntries: async () => [],
      wait: async () => undefined
    })

    expect(result.code).toBe(1)
    expect(result.output).toContain('EPERM')
    expect(calls).toHaveLength(2)
  })

  it('frees every destination the run staged for, not only the one pnpm named', async () => {
    // pnpm reports the first blocked destination its workers hit, but an
    // update blocks on every package it has to replace. Freeing one per
    // attempt cannot finish an update that replaces four of them.
    const tree = {
      [modules()]: [
        directory('dshmarket'),
        directory('dshmarket_tmp_7408_13'),
        directory('layout-base'),
        directory('layout-base_tmp_7408_4'),
        directory('cytoscape-fcose'),
        directory('.pnpm'),
        directory('@scope')
      ],
      [modules('@scope')]: [directory('inner'), directory('inner_tmp_7408_9')],
      [modules('cytoscape-fcose', 'node_modules')]: [directory('cose-base_tmp_7408_7')]
    }

    const targets = await blockedTargets(modules('argparse'), ROOT, {
      listEntries: async (path) => tree[path] ?? [],
      exists: () => true
    })

    // pnpm's own diagnosis leads; the rest come from the staging left behind,
    // nested node_modules and scoped packages included.
    expect(targets).toEqual([
      modules('argparse'),
      modules('dshmarket'),
      modules('layout-base'),
      modules('cytoscape-fcose', 'node_modules', 'cose-base'),
      modules('@scope', 'inner')
    ])
  })

  it('offers only destinations that are actually there', async () => {
    const targets = await blockedTargets(undefined, ROOT, {
      listEntries: async (path) =>
        path === modules() ? [directory('gone_tmp_1_1'), directory('kept_tmp_1_1')] : [],
      exists: (path) => path.endsWith('kept')
    })

    expect(targets).toEqual([modules('kept')])
  })

  it('does not mistake a sidelined copy for staging', async () => {
    // `<pkg>.dsh-old-<ts>` is this runner's own leftover. Deriving a target
    // from it would name a package that was never being replaced.
    const targets = await blockedTargets(undefined, ROOT, {
      listEntries: async (path) =>
        path === modules() ? [directory(`cose-base${SIDELINE_MARKER}17`)] : [],
      exists: () => true
    })

    expect(targets).toEqual([])
  })
})

const ROOT = join('/', 'p')

/** A path under the fake profile's node_modules, in the host's own separators. */
function modules(...segments) {
  return join(ROOT, 'node_modules', ...segments)
}

function directory(name) {
  return { name, isDirectory: () => true, isSymbolicLink: () => false }
}

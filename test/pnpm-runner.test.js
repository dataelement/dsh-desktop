import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import {
  MARKER,
  SIDELINE_MARKER,
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
      report: (message) => lines.push(message)
    })

    expect(result.code).toBe(1)
    expect(result.idleTimedOut).toBe(true)
    // A wedged run is not retried — three stuck runs are three times the wait.
    expect(calls).toHaveLength(1)
    expect(lines[0]).toContain('said nothing')
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
      wait: async () => undefined,
      now: () => 1234,
      report: (message) => lines.push(message)
    })

    expect(lines[0]).toContain('retrying')
    expect(lines[1]).toContain(`moved ${BLOCKED_TARGET}`)
    expect(lines[1]).toContain(SIDELINE_MARKER)
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
      wait: async () => undefined
    })

    expect(result.code).toBe(1)
    expect(result.output).toContain('EPERM')
    expect(calls).toHaveLength(2)
  })
})

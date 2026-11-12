import { EventEmitter } from 'node:events'
import { homedir } from 'node:os'
import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  loginShellCandidates,
  mergeLoginShellEnvironment,
  parseLoginShellOutput,
  readDesktopLoginShellEnvironment,
  resolveDesktopLoginShellConfig,
  type DesktopLoginShellChild
} from '../../src/main/shell/backend/login-shell-environment'

const DELIMITER = '_DSH_SHELL_ENV_DELIMITER_'

function framed(body: string): string {
  return `\0${DELIMITER}\0${body}\0${DELIMITER}\0`
}

class FakeShell extends EventEmitter implements DesktopLoginShellChild {
  readonly stdout = new PassThrough()
  killed = false

  constructor(readonly pid?: number) {
    super()
  }

  kill(): boolean {
    this.killed = true
    return true
  }

  emitError(error: Error): void {
    this.emit('error', error)
  }

  emitClose(code: number | null, signal: NodeJS.Signals | null = null): void {
    this.emit('close', code, signal)
  }
}

describe('desktop login shell environment', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses ten seconds unless a positive timeout is configured', () => {
    expect(resolveDesktopLoginShellConfig({})).toEqual({ timeoutMs: 10_000 })
    expect(resolveDesktopLoginShellConfig({ DSH_DESKTOP_LOGIN_SHELL_TIMEOUT_MS: '2500' })).toEqual({ timeoutMs: 2500 })
    expect(resolveDesktopLoginShellConfig({ DSH_DESKTOP_LOGIN_SHELL_TIMEOUT_MS: '0' })).toEqual({ timeoutMs: 10_000 })
    expect(resolveDesktopLoginShellConfig({ DSH_DESKTOP_LOGIN_SHELL_TIMEOUT_MS: 'later' })).toEqual({ timeoutMs: 10_000 })
  })

  it('tries the account login shell before the fixed system shells', () => {
    const shells = loginShellCandidates()
    expect(shells).toEqual(expect.arrayContaining(['/bin/zsh', '/bin/bash', '/bin/sh']))
    expect(new Set(shells).size).toBe(shells.length)
  })

  it('reads variables between the delimiters and ignores a partial dump', () => {
    expect(parseLoginShellOutput(framed('PATH=/opt/homebrew/bin\0BREW_PREFIX=/opt/homebrew'))).toEqual({
      PATH: '/opt/homebrew/bin',
      BREW_PREFIX: '/opt/homebrew'
    })
    expect(parseLoginShellOutput(`\0${DELIMITER}\0PATH=/bin`)).toBeUndefined()
    expect(parseLoginShellOutput(framed('=missing\0PATH=/bin'))).toEqual({ PATH: '/bin' })
  })

  it('keeps launcher-owned variables and drops the probe session', () => {
    const merged = mergeLoginShellEnvironment(
      { PATH: '/usr/bin', DSH_HOME: '/desktop', ELECTRON_RUN_AS_NODE: '1' },
      {
        PATH: '/opt/homebrew/bin',
        DSH_HOME: '/Users/me/.dsh',
        ELECTRON_RUN_AS_NODE: '0',
        PWD: '/Users/me',
        DISABLE_AUTO_UPDATE: 'false',
        BREW_PREFIX: '/opt/homebrew'
      }
    )
    expect(merged).toEqual({
      PATH: '/opt/homebrew/bin',
      DSH_HOME: '/desktop',
      ELECTRON_RUN_AS_NODE: '1',
      BREW_PREFIX: '/opt/homebrew'
    })
  })

  it('returns the inherited environment on Windows without starting a shell', async () => {
    const base = { PATH: 'C:\\Windows', DSH_HOME: '/desktop' }
    const result = await readDesktopLoginShellEnvironment(base, { timeoutMs: 20 }, {
      platform: 'win32',
      spawnShell: () => { throw new Error('spawned') }
    })
    expect(result.environment).toBe(base)
    expect(result.failures).toEqual([])
  })

  it('uses the first shell that prints a complete environment', async () => {
    const calls: string[] = []
    const result = await readDesktopLoginShellEnvironment({ PATH: '/usr/bin', DSH_HOME: '/desktop' }, { timeoutMs: 1000 }, {
      platform: 'darwin',
      shells: ['/bin/zsh', '/bin/bash'],
      spawnShell: shell => {
        calls.push(shell)
        const child = new FakeShell(11)
        queueMicrotask(() => {
          child.stdout.end(Buffer.from(framed('PATH=/opt/homebrew/bin\0DSH_HOME=/Users/me/.dsh')))
          child.emitClose(0)
        })
        return child
      }
    })
    expect(calls).toEqual(['/bin/zsh'])
    expect(result.failures).toEqual([])
    expect(result.environment.PATH).toBe('/opt/homebrew/bin')
    expect(result.environment.DSH_HOME).toBe('/desktop')
  })

  it('tries the next shell when a candidate exits without a dump', async () => {
    const result = await readDesktopLoginShellEnvironment({ PATH: '/usr/bin' }, { timeoutMs: 1000 }, {
      platform: 'linux',
      shells: ['/bin/zsh', '/bin/bash'],
      spawnShell: shell => {
        const child = new FakeShell(12)
        queueMicrotask(() => {
          if (shell === '/bin/zsh') child.emitClose(1, null)
          else {
            child.stdout.end(Buffer.from(framed('PATH=/usr/local/bin')))
            child.emitClose(0)
          }
        })
        return child
      }
    })
    expect(result.failures).toEqual([{ shell: '/bin/zsh', reason: 'exit 1' }])
    expect(result.environment.PATH).toBe('/usr/local/bin')
  })

  it('returns the inherited environment when every candidate fails', async () => {
    const base = { PATH: '/usr/bin' }
    const result = await readDesktopLoginShellEnvironment(base, { timeoutMs: 1000 }, {
      platform: 'darwin',
      shells: ['/missing'],
      spawnShell: () => { throw new Error('ENOENT') }
    })
    expect(result.environment).toBe(base)
    expect(result.failures).toEqual([{ shell: '/missing', reason: 'ENOENT' }])
  })

  it('stops at an already aborted read and does not start a shell', async () => {
    const signal = AbortSignal.abort()
    let spawned = false
    const base = { PATH: '/usr/bin' }
    const result = await readDesktopLoginShellEnvironment(base, { timeoutMs: 1000 }, {
      platform: 'darwin',
      shells: ['/bin/zsh'],
      signal,
      spawnShell: () => {
        spawned = true
        return new FakeShell()
      }
    })
    expect(spawned).toBe(false)
    expect(result.environment).toBe(base)
    expect(result.failures).toEqual([{ shell: '/bin/zsh', reason: 'aborted' }])
  })

  it('kills a timed-out process group and continues with the next shell', async () => {
    const killed: Array<number | NodeJS.Signals> = []
    vi.spyOn(process, 'kill').mockImplementation(pid => {
      killed.push(pid)
      return true
    })
    const seen: Array<{ shell: string, cwd: string }> = []
    const result = await readDesktopLoginShellEnvironment({ PATH: '/usr/bin' }, { timeoutMs: 20 }, {
      platform: 'darwin',
      shells: ['/bin/zsh', '/bin/bash'],
      spawnShell: (shell, _args, options) => {
        seen.push({ shell, cwd: options.cwd })
        if (shell === '/bin/bash') {
          const child = new FakeShell(8)
          queueMicrotask(() => {
            child.stdout.end(Buffer.from(framed('PATH=/opt/homebrew/bin')))
            child.emitClose(0)
          })
          return child
        }
        return new FakeShell(4242)
      }
    })
    expect(seen).toEqual([
      { shell: '/bin/zsh', cwd: homedir() },
      { shell: '/bin/bash', cwd: homedir() }
    ])
    expect(killed).toContain(-4242)
    expect(result.failures).toEqual([{ shell: '/bin/zsh', reason: 'timeout' }])
    expect(result.environment.PATH).toBe('/opt/homebrew/bin')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { launchWindowsJob } from '@deepseek-ai/dsh-subprocess-local/src/windows-job.ts'
import { spawnSubprocess } from '@deepseek-ai/dsh-subprocess-local/src/spawn.ts'

const marker = 'DSH_DESKTOP_HIDDEN_CONSOLE'

function fakeProcess() {
  const stream = { on() {}, once() {}, end() {} }
  return {
    stdio: [null, null, null, null, stream, stream, stream],
    stdin: stream,
    stdout: stream,
    stderr: stream,
    pid: 1,
    on() { return this },
    once() { return this },
    kill() {}
  }
}

function jobSpec() {
  return {
    argv: ['electron.exe', 'codex.js', 'app-server'],
    cwd: process.cwd(),
    stdio: { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
    graceMs: 1_000,
    env: {}
  }
}

describe('Windows subprocess console inheritance', () => {
  afterEach(() => {
    delete process.env[marker]
    vi.restoreAllMocks()
  })

  it('preloads the hidden console on both Electron hops without modifying target arguments', () => {
    process.env[marker] = '1'
    vi.spyOn(process, 'versions', 'get').mockReturnValue({ ...process.versions, electron: '44.7.0' })
    const preload = 'file:///C:/Desktop/build/windows-hide-console-import.mjs'
    vi.spyOn(process, 'execArgv', 'get').mockReturnValue(['--import', preload])
    let args
    const spec = { ...jobSpec(), argv: [process.execPath, 'codex.js', 'app-server'] }
    launchWindowsJob(spec, {}, {
      runnerInvocation: [process.execPath, 'runner.js'],
      spawn(_command, actualArgs) {
        args = actualArgs
        return fakeProcess()
      }
    })
    expect(args).toEqual(['--import', preload, 'runner.js', '--', process.execPath, '--import', preload, 'codex.js', 'app-server'])
    expect(spec.argv).toEqual([process.execPath, 'codex.js', 'app-server'])
  })

  it('inherits the Host console for the Job runner when the marker is set', () => {
    process.env[marker] = '1'
    let options
    launchWindowsJob(jobSpec(), {}, {
      runnerInvocation: [process.execPath, 'runner.js'],
      spawn(_command, _args, spawnOptions) {
        options = spawnOptions
        return fakeProcess()
      }
    })
    expect(options.windowsHide).toBe(false)

    delete process.env[marker]
    launchWindowsJob(jobSpec(), {}, {
      runnerInvocation: [process.execPath, 'runner.js'],
      spawn(_command, _args, spawnOptions) {
        options = spawnOptions
        return fakeProcess()
      }
    })
    expect(options.windowsHide).toBe(true)
  })

  it('inherits the Host console on the Windows fallback spawn when the marker is set', () => {
    process.env[marker] = '1'
    let options
    spawnSubprocess(jobSpec(), {
      platform: 'win32',
      spawn(_command, _args, spawnOptions) {
        options = spawnOptions
        return fakeProcess()
      }
    })
    expect(options.windowsHide).toBe(false)

    delete process.env[marker]
    spawnSubprocess(jobSpec(), {
      platform: 'win32',
      spawn(_command, _args, spawnOptions) {
        options = spawnOptions
        return fakeProcess()
      }
    })
    expect(options.windowsHide).toBe(true)
  })
})

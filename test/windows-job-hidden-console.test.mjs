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

  it('marks forwarded console imports so both Electron hops attach to the parent console', () => {
    process.env[marker] = '1'
    vi.spyOn(process, 'versions', 'get').mockReturnValue({ ...process.versions, electron: '44.7.0' })
    const preload = 'file:///C:/Program%20Files/DSH/%E4%B8%AD%E6%96%87/windows-hide-console-import.mjs'
    const marked = `${preload}?attach=parent`
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
    expect(args).toEqual(['--import', marked, 'runner.js', '--', process.execPath, '--import', marked, 'codex.js', 'app-server'])
    expect(spec.argv).toEqual([process.execPath, 'codex.js', 'app-server'])
  })

  it('marks an --import= preload once and forwards a non-URL specifier unchanged', () => {
    process.env[marker] = '1'
    vi.spyOn(process, 'versions', 'get').mockReturnValue({ ...process.versions, electron: '44.7.0' })
    const marked = 'file:///C:/Desktop/build/windows-hide-console-import.mjs?attach=parent'
    const plain = 'C:\\not a url\\windows-hide-console-import.mjs'
    vi.spyOn(process, 'execArgv', 'get').mockReturnValue([`--import=${marked}`, `--import=${plain}`])
    let args
    launchWindowsJob({ ...jobSpec(), argv: [process.execPath, 'codex.js'] }, {}, {
      runnerInvocation: [process.execPath, 'runner.js'],
      spawn(_command, actualArgs) {
        args = actualArgs
        return fakeProcess()
      }
    })
    expect(args.slice(0, 2)).toEqual([`--import=${marked}`, `--import=${plain}`])
    expect(args.slice(4)).toEqual([process.execPath, `--import=${marked}`, `--import=${plain}`, 'codex.js'])
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

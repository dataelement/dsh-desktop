import { afterEach, describe, expect, it } from 'vitest'
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

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  cleanupDoctorLaunchAgent,
  doctorLaunchAgentPlistPath
} from '../src/main/runtime/doctor-launchagent-cleanup'

const HELPER_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.dsh.doctor</string>
    <key>ProgramArguments</key>
    <array>
      <string>/Applications/DSH Desktop.app/Contents/Frameworks/DSH Desktop Helper.app/Contents/MacOS/DSH Desktop Helper</string>
      <string>/Users/u/.npm-global/lib/node_modules/@linxin666/dsh-doctor/lib/cli.mjs</string>
      <string>supervisor</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
      <key>DSH_DOCTOR_HOME</key>
      <string>/Users/u/.dsh-doctor</string>
    </dict>
    <key>KeepAlive</key>
    <true/>
  </dict>
</plist>
`

const FIXED_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.dsh.doctor</string>
    <key>ProgramArguments</key>
    <array>
      <string>/Applications/DSH Desktop.app/Contents/Frameworks/DSH Desktop Helper.app/Contents/MacOS/DSH Desktop Helper</string>
      <string>supervisor</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
      <key>DSH_DOCTOR_HOME</key>
      <string>/Users/u/.dsh-doctor</string>
      <key>ELECTRON_RUN_AS_NODE</key>
      <string>1</string>
    </dict>
    <key>KeepAlive</key>
    <true/>
  </dict>
</plist>
`

const REAL_NODE_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.dsh.doctor</string>
    <key>ProgramArguments</key>
    <array>
      <string>/usr/local/bin/node</string>
      <string>supervisor</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
      <key>DSH_DOCTOR_HOME</key>
      <string>/Users/u/.dsh-doctor</string>
    </dict>
  </dict>
</plist>
`

interface FakeRunnerOptions {
  status?: number | null
  error?: Error
}

interface FakeRunner {
  calls: { command: string; args: readonly string[] }[]
  run: (command: string, args: readonly string[]) => { status: number | null; error?: Error }
}

function fakeRunner(options: FakeRunnerOptions = {}): FakeRunner {
  const calls: { command: string; args: readonly string[] }[] = []
  const status = options.status === undefined ? 0 : options.status
  return {
    calls,
    run(command, args) {
      calls.push({ command, args: [...args] })
      if (options.error) throw options.error
      return { status }
    }
  }
}

describe('doctor-launchagent-cleanup', () => {
  const originalPlatform = process.platform
  const originalGetuid = process.getuid
  let home: string
  let plistPath: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'doctor-launchagent-cleanup-'))
    plistPath = doctorLaunchAgentPlistPath(home)
  })

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    if (originalGetuid) {
      process.getuid = originalGetuid
    } else {
      delete (process as { getuid?: () => number }).getuid
    }
  })

  function setPlatform(value: NodeJS.Platform): void {
    Object.defineProperty(process, 'platform', { value, configurable: true })
  }

  function setUid(uid: number | null): void {
    if (uid === null) {
      delete (process as { getuid?: () => number }).getuid
    } else {
      process.getuid = () => uid
    }
  }

  function writePlist(content: string): void {
    mkdirSync(join(home, 'Library', 'LaunchAgents'), { recursive: true })
    writeFileSync(plistPath, content, 'utf8')
  }

  it('returns the plist path under Library/LaunchAgents for the home directory', () => {
    expect(doctorLaunchAgentPlistPath('/Users/u')).toBe(
      '/Users/u/Library/LaunchAgents/com.dsh.doctor.plist'
    )
  })

  it('skips cleanup on non-darwin platforms', () => {
    setPlatform('linux')
    const result = cleanupDoctorLaunchAgent({ homeDirectory: home, uid: 501 })
    expect(result).toEqual({ plistFound: false, affected: false, removed: false, unregistered: false })
  })

  it('skips cleanup when the plist is not present', () => {
    setPlatform('darwin')
    const result = cleanupDoctorLaunchAgent({ homeDirectory: home, uid: 501 })
    expect(result).toEqual({ plistFound: false, affected: false, removed: false, unregistered: false })
  })

  it('removes the legacy Helper plist and unregisters the service', () => {
    setPlatform('darwin')
    setUid(501)
    writePlist(HELPER_PLIST)
    const runner = fakeRunner({ status: 0 })
    const log: string[] = []

    const result = cleanupDoctorLaunchAgent({
      homeDirectory: home,
      uid: 501,
      runLaunchctl: runner.run,
      log: (message) => log.push(message)
    })

    expect(result).toEqual({ plistFound: true, affected: true, removed: true, unregistered: true })
    expect(existsSync(plistPath)).toBe(false)
    expect(runner.calls).toEqual([
      { command: 'launchctl', args: ['bootout', 'gui/501/com.dsh.doctor'] }
    ])
    expect(log).toHaveLength(1)
    expect(log[0]).toContain('removed the legacy doctor LaunchAgent')
  })

  it('leaves a fixed plist that already declares ELECTRON_RUN_AS_NODE alone', () => {
    setPlatform('darwin')
    setUid(501)
    writePlist(FIXED_PLIST)
    const runner = fakeRunner()

    const result = cleanupDoctorLaunchAgent({
      homeDirectory: home,
      uid: 501,
      runLaunchctl: runner.run
    })

    expect(result).toEqual({ plistFound: true, affected: false, removed: false, unregistered: false })
    expect(existsSync(plistPath)).toBe(true)
    expect(runner.calls).toEqual([])
  })

  it('does not touch a real-Node doctor plist that lacks the Electron flag', () => {
    // The Doctor CLI on a real Node host never names a Helper executable
    // and never inherited `ELECTRON_RUN_AS_NODE`, so the fixed service
    // does not set the flag. The crash-loop only happens when launchd
    // is asked to start an Electron Helper, so a real-Node plist is
    // left alone — Doctor's own ensure path will keep it consistent.
    setPlatform('darwin')
    setUid(501)
    writePlist(REAL_NODE_PLIST)
    const runner = fakeRunner()

    const result = cleanupDoctorLaunchAgent({
      homeDirectory: home,
      uid: 501,
      runLaunchctl: runner.run
    })

    expect(result).toEqual({ plistFound: true, affected: false, removed: false, unregistered: false })
    expect(existsSync(plistPath)).toBe(true)
    expect(runner.calls).toEqual([])
  })

  it('still removes the plist when launchctl bootout fails with a thrown error', () => {
    setPlatform('darwin')
    setUid(501)
    writePlist(HELPER_PLIST)
    const runner = fakeRunner({ error: new Error('launchctl missing') })

    const result = cleanupDoctorLaunchAgent({
      homeDirectory: home,
      uid: 501,
      runLaunchctl: runner.run
    })

    expect(result.removed).toBe(true)
    expect(result.unregistered).toBe(false)
    expect(existsSync(plistPath)).toBe(false)
  })

  it('still removes the plist when launchctl exits non-zero', () => {
    setPlatform('darwin')
    setUid(501)
    writePlist(HELPER_PLIST)
    const runner = fakeRunner({ status: 3 })

    const result = cleanupDoctorLaunchAgent({
      homeDirectory: home,
      uid: 501,
      runLaunchctl: runner.run
    })

    expect(result.removed).toBe(true)
    expect(result.unregistered).toBe(false)
  })

  it('skips launchctl but still removes the plist when uid is not available', () => {
    setPlatform('darwin')
    setUid(null)
    writePlist(HELPER_PLIST)
    const runner = fakeRunner()

    const result = cleanupDoctorLaunchAgent({
      homeDirectory: home,
      runLaunchctl: runner.run
    })

    expect(result.removed).toBe(true)
    expect(result.unregistered).toBe(false)
    expect(runner.calls).toEqual([])
  })

  it('does not throw when the plist cannot be read', () => {
    setPlatform('darwin')
    setUid(501)
    mkdirSync(join(home, 'Library', 'LaunchAgents'), { recursive: true })
    // Make the plist a directory so readFileSync throws EISDIR.
    mkdirSync(plistPath)
    const runner = fakeRunner()
    const log: string[] = []

    const result = cleanupDoctorLaunchAgent({
      homeDirectory: home,
      uid: 501,
      runLaunchctl: runner.run,
      log: (message) => log.push(message)
    })

    expect(result).toEqual({ plistFound: true, affected: false, removed: false, unregistered: false })
    expect(runner.calls).toEqual([])
    expect(log[0]).toContain('failed to read doctor plist')
  })

  it('keeps the plist on disk when the read succeeds and the file is well-formed but already fixed', () => {
    setPlatform('darwin')
    setUid(501)
    writePlist(FIXED_PLIST)
    const before = readFileSync(plistPath, 'utf8')

    cleanupDoctorLaunchAgent({ homeDirectory: home, uid: 501 })

    expect(readFileSync(plistPath, 'utf8')).toBe(before)
  })
})

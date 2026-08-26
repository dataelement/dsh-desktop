import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { auditLaunchAgents } from '../src/main/state/launch-agent-audit'

// Exercises the real plutil-backed reader and writer; only launchctl is stubbed
// so the test never touches the user's actual services.
describe.runIf(process.platform === 'darwin')('launch agent plist round trip', () => {
  const testRoot = join(__dirname, '.temp-launch-agent-plist')
  const dshHome = join(testRoot, 'dsh-home')
  const home = join(testRoot, 'home')
  const launchAgents = join(home, 'Library', 'LaunchAgents')
  const appBundlePath = join(testRoot, 'Applications', 'DSH Desktop.app')
  const helper = join(appBundlePath, 'Contents', 'MacOS', 'DSH Desktop')
  const plistPath = join(launchAgents, 'com.dsh.doctor.plist')

  beforeEach(async () => {
    await mkdir(launchAgents, { recursive: true })
    await mkdir(dshHome, { recursive: true })
    await writeFile(plistPath, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dsh.doctor</string>
  <key>ProgramArguments</key>
  <array>
    <string>${helper}</string>
    <string>/Users/alex/.dsh/profiles/web/node_modules/@vendor/dsh-doctor/daemon.js</string>
  </array>
  <key>KeepAlive</key><true/>
  <key>RunAtLoad</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
</dict>
</plist>
`)
  })

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true })
  })

  it('rewrites a real plist as a valid property list that runs as node', async () => {
    const result = await auditLaunchAgents({
      dshHome,
      appBundlePath,
      homeDirectory: home,
      platform: 'darwin',
      uid: 501,
      bootoutLaunchAgent: vi.fn(async () => ({ code: 0, stdout: '', stderr: '' })),
      bootstrapLaunchAgent: vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    })

    expect(result.failures).toEqual([])
    expect(result.findings[0]?.action).toBe('repaired')
    expect(result.findings[0]?.owner).toBe('@vendor/dsh-doctor')

    const rewritten = await readFile(plistPath, 'utf8')
    expect(rewritten).toContain('<?xml')
    expect(rewritten).toContain('ELECTRON_RUN_AS_NODE')
    expect(rewritten).toContain('ThrottleInterval')
    expect(rewritten).toContain('KeepAlive')
  })

  it('leaves the repaired agent stable when the audit runs again', async () => {
    const settings = {
      dshHome,
      appBundlePath,
      homeDirectory: home,
      platform: 'darwin' as NodeJS.Platform,
      uid: 501,
      bootoutLaunchAgent: vi.fn(async () => ({ code: 0, stdout: '', stderr: '' })),
      bootstrapLaunchAgent: vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    }

    await auditLaunchAgents(settings)
    const second = await auditLaunchAgents(settings)

    expect(second.findings).toEqual([])
  })
})

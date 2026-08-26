import { describe, expect, it } from 'vitest'
import { isDaemonLaunch } from '../src/main/launchd-guard'

describe('launchd guard', () => {
  it('detects a launch driven by a LaunchAgent label', () => {
    expect(isDaemonLaunch({ XPC_SERVICE_NAME: 'com.dsh.doctor' }, 'darwin')).toBe(true)
  })

  it('treats an application service name as an ordinary GUI launch', () => {
    expect(
      isDaemonLaunch({ XPC_SERVICE_NAME: 'application.io.dsh.desktop.44736077.44736083' }, 'darwin')
    ).toBe(false)
  })

  it('treats the placeholder service name as an ordinary launch', () => {
    expect(isDaemonLaunch({ XPC_SERVICE_NAME: '0' }, 'darwin')).toBe(false)
  })

  it('treats a missing service name as an ordinary launch', () => {
    expect(isDaemonLaunch({}, 'darwin')).toBe(false)
  })

  it('never claims a daemon launch away from macOS', () => {
    expect(isDaemonLaunch({ XPC_SERVICE_NAME: 'com.dsh.doctor' }, 'win32')).toBe(false)
  })
})

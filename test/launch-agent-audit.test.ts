import { describe, expect, it } from 'vitest'
import {
  describesDaemonisedAppBinary,
  repairedLaunchAgent,
  appBundlePathFromExecutable,
  type LaunchAgentRecord
} from '../src/main/state/launch-agent-audit'

const appBundle = '/Applications/DSH Desktop.app'
const helper = `${appBundle}/Contents/Frameworks/DSH Desktop Helper.app/Contents/MacOS/DSH Desktop Helper`

describe('daemonised app binary detection', () => {
  it('flags an agent running the app binary without the node runtime flag', () => {
    const record = {
      Label: 'com.dsh.doctor',
      ProgramArguments: [helper, '/Users/alex/.dsh/plugin/daemon.js']
    }

    expect(describesDaemonisedAppBinary(record, appBundle)).toBe(true)
  })

  it('accepts an agent that already runs the binary as node', () => {
    const record = {
      Label: 'com.dsh.doctor',
      ProgramArguments: [helper, '/Users/alex/.dsh/plugin/daemon.js'],
      EnvironmentVariables: { ELECTRON_RUN_AS_NODE: '1' }
    }

    expect(describesDaemonisedAppBinary(record, appBundle)).toBe(false)
  })

  it('leaves agents belonging to other applications alone', () => {
    const record = {
      Label: 'com.google.keystone.agent',
      ProgramArguments: ['/Users/alex/Library/Google/GoogleUpdater/Current/updater']
    }

    expect(describesDaemonisedAppBinary(record, appBundle)).toBe(false)
  })

  it('reads the executable from Program when ProgramArguments is absent', () => {
    expect(describesDaemonisedAppBinary({ Label: 'com.dsh.doctor', Program: helper }, appBundle))
      .toBe(true)
  })

  it('ignores an agent with no absolute executable path', () => {
    expect(describesDaemonisedAppBinary({ Label: 'com.dsh.doctor', ProgramArguments: ['node'] }, appBundle))
      .toBe(false)
  })

  it('does not treat a sibling bundle as our own', () => {
    const sibling = '/Applications/DSH Desktop Dev.app/Contents/MacOS/DSH Desktop Dev'

    expect(describesDaemonisedAppBinary({ Label: 'com.dsh.dev', ProgramArguments: [sibling] }, appBundle))
      .toBe(false)
  })

  it('does not treat a bundle whose name merely extends ours as our own', () => {
    const lookalike = '/Applications/DSH Desktop.app.disabled/Contents/MacOS/DSH Desktop'

    expect(describesDaemonisedAppBinary({ Label: 'com.dsh.old', ProgramArguments: [lookalike] }, appBundle))
      .toBe(false)
  })
})

describe('launch agent repair', () => {
  it('adds the node runtime flag so launchd stops starting a GUI process', () => {
    const record = {
      Label: 'com.dsh.doctor',
      ProgramArguments: [helper, '/Users/alex/.dsh/plugin/daemon.js']
    }

    const repaired = repairedLaunchAgent(record)

    expect(repaired.EnvironmentVariables).toEqual({ ELECTRON_RUN_AS_NODE: '1' })
    expect(describesDaemonisedAppBinary(repaired, appBundle)).toBe(false)
  })

  it('keeps the environment variables the agent already declared', () => {
    const record = {
      Label: 'com.dsh.doctor',
      ProgramArguments: [helper],
      EnvironmentVariables: { PATH: '/usr/bin', DSH_MODE: 'watch' }
    }

    expect(repairedLaunchAgent(record).EnvironmentVariables).toEqual({
      PATH: '/usr/bin',
      DSH_MODE: 'watch',
      ELECTRON_RUN_AS_NODE: '1'
    })
  })

  it('leaves the original record untouched', () => {
    const record: LaunchAgentRecord = { Label: 'com.dsh.doctor', ProgramArguments: [helper] }

    repairedLaunchAgent(record)

    expect(record.EnvironmentVariables).toBeUndefined()
  })

  it('preserves every other key in the agent definition', () => {
    const record = {
      Label: 'com.dsh.doctor',
      ProgramArguments: [helper],
      KeepAlive: true,
      RunAtLoad: true
    }

    const repaired = repairedLaunchAgent(record) as typeof record

    expect(repaired.Label).toBe('com.dsh.doctor')
    expect(repaired.KeepAlive).toBe(true)
    expect(repaired.RunAtLoad).toBe(true)
  })
})

describe('app bundle path', () => {
  it('finds the bundle root above the executable', () => {
    expect(appBundlePathFromExecutable('/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop'))
      .toBe('/Applications/DSH Desktop.app')
  })

  it('stops at the outermost bundle so helpers map to the app itself', () => {
    expect(appBundlePathFromExecutable(helper)).toBe(appBundle)
  })

  it('has no bundle to report for an unpackaged executable', () => {
    expect(appBundlePathFromExecutable('/usr/local/bin/electron')).toBeUndefined()
  })
})

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DOCTOR_LAUNCH_AGENT_LABEL = 'com.dsh.doctor'
const DOCTOR_LAUNCH_AGENT_PLIST = `${DOCTOR_LAUNCH_AGENT_LABEL}.plist`
const ELECTRON_NODE_MODE_KEY = 'ELECTRON_RUN_AS_NODE'
const HELPER_EXECUTABLE_HINT = 'Helper'

export interface DoctorLaunchAgentCleanupOptions {
  homeDirectory?: string
  uid?: number | null
  launchctlPath?: string
  runLaunchctl?: (
    command: string,
    args: readonly string[]
  ) => { status: number | null; error?: Error }
  log?: (message: string) => void
}

export interface DoctorLaunchAgentCleanupResult {
  plistFound: boolean
  affected: boolean
  removed: boolean
  unregistered: boolean
}

export function doctorLaunchAgentPlistPath(homeDirectory: string = homedir()): string {
  return join(homeDirectory, 'Library', 'LaunchAgents', DOCTOR_LAUNCH_AGENT_PLIST)
}

function defaultRunLaunchctl(
  command: string,
  args: readonly string[]
): { status: number | null; error?: Error } {
  const result = spawnSync(command, [...args], { stdio: 'ignore' })
  return { status: result.status, error: result.error ?? undefined }
}

export function cleanupDoctorLaunchAgent(
  options: DoctorLaunchAgentCleanupOptions = {}
): DoctorLaunchAgentCleanupResult {
  if (process.platform !== 'darwin') {
    return { plistFound: false, affected: false, removed: false, unregistered: false }
  }

  const plistPath = doctorLaunchAgentPlistPath(options.homeDirectory)
  if (!existsSync(plistPath)) {
    return { plistFound: false, affected: false, removed: false, unregistered: false }
  }

  let content: string
  try {
    content = readFileSync(plistPath, 'utf8')
  } catch (error) {
    options.log?.(
      `[desktop] failed to read doctor plist at ${plistPath}: ${error instanceof Error ? error.message : String(error)}`
    )
    return { plistFound: true, affected: false, removed: false, unregistered: false }
  }

  if (!content.includes(HELPER_EXECUTABLE_HINT)) {
    return { plistFound: true, affected: false, removed: false, unregistered: false }
  }
  if (content.includes(ELECTRON_NODE_MODE_KEY)) {
    return { plistFound: true, affected: false, removed: false, unregistered: false }
  }

  const uid = options.uid ?? process.getuid?.() ?? null
  const launchctl = options.launchctlPath ?? 'launchctl'
  const runLaunchctl = options.runLaunchctl ?? defaultRunLaunchctl
  let unregistered = false

  if (typeof uid === 'number') {
    const target = `gui/${uid}/${DOCTOR_LAUNCH_AGENT_LABEL}`
    try {
      const result = runLaunchctl(launchctl, ['bootout', target])
      if (result.error) throw result.error
      unregistered = result.status === 0
    } catch (error) {
      options.log?.(
        `[desktop] failed to run launchctl bootout: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  let removed = false
  try {
    unlinkSync(plistPath)
    removed = true
  } catch (error) {
    options.log?.(
      `[desktop] failed to remove doctor plist at ${plistPath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (removed) {
    options.log?.(
      unregistered
        ? `[desktop] removed the legacy doctor LaunchAgent at ${plistPath} (label ${DOCTOR_LAUNCH_AGENT_LABEL})`
        : `[desktop] removed the legacy doctor plist at ${plistPath}; launchctl bootout did not report success`
    )
  }

  return { plistFound: true, affected: true, removed, unregistered }
}

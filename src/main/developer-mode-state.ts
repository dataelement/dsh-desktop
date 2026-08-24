import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const DEVELOPER_MODE_STATE_FILENAME = 'sherlock-developer-mode.json'

type DeveloperModeState = {
  enabled?: unknown
}

export function developerModeStatePath(userDataPath: string): string {
  return path.join(userDataPath, DEVELOPER_MODE_STATE_FILENAME)
}

export function isDeveloperModeEnabled(userDataPath: string): boolean {
  try {
    const state = JSON.parse(
      readFileSync(developerModeStatePath(userDataPath), 'utf8')
    ) as DeveloperModeState
    return state.enabled === true
  } catch {
    return false
  }
}

export function setDeveloperModeEnabled(userDataPath: string, enabled: boolean): void {
  mkdirSync(userDataPath, { recursive: true })
  writeFileSync(developerModeStatePath(userDataPath), `${JSON.stringify({ enabled })}\n`, {
    encoding: 'utf8',
    mode: 0o600
  })
}

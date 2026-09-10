import type { PluginStartupFailure } from './plugin-startup-failure'

export type RuntimePhase =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'stopping'
  | 'failed'

export interface RuntimeSnapshot {
  phase: RuntimePhase
  message: string
  launchDirectory?: string
  logs: string[]
  url?: string
  /** Per-process launch token; only `GET /?token=` exchanges it for a session cookie. */
  authToken?: string
  pluginFailures?: PluginStartupFailure[]
}

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error'
  | 'unsupported'

export interface UpdateStatus {
  phase: UpdatePhase
  currentVersion: string
  availableVersion?: string
  percent?: number
  message?: string
  manual: boolean
  /** Set while an explicitly chosen older version is being installed. */
  downgrade?: boolean
}

/** One past release the user may install or roll back to, from the update index. */
export interface AvailableRelease {
  version: string
  tag: string
  archiveUrl: string
}

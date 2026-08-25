import { isAbsolute, join, normalize } from 'node:path'

export interface DesktopIdentity {
  name: 'Sherlock' | 'Sherlock Dev'
  userData: string
}

export type DesktopChannel = 'development' | 'legacy' | 'legacy-bridge' | 'notarized'

export function resolveDesktopIdentity(
  appDataPath: string,
  channel: DesktopChannel,
  explicitUserDataPath: string
): DesktopIdentity {
  const name = channel === 'development' ? 'Sherlock Dev' : 'Sherlock'
  const defaultDirectory =
    channel === 'development'
      ? 'dsh-desktop-dev'
      : channel === 'notarized' || channel === 'legacy-bridge'
        ? 'sherlock-desktop'
        : 'dsh-desktop'
  const explicitPath = explicitUserDataPath.trim()

  if (explicitPath && !isAbsolute(explicitPath)) {
    throw new Error('The Sherlock user-data path must be absolute.')
  }

  return {
    name,
    userData: explicitPath ? normalize(explicitPath) : join(appDataPath, defaultDirectory)
  }
}

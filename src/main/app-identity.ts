import { isAbsolute, join, normalize } from 'node:path'

export interface DesktopIdentity {
  name: 'Sherlock' | 'Sherlock Dev'
  userData: string
}

export function resolveDesktopIdentity(
  appDataPath: string,
  developmentBuild: boolean,
  explicitUserDataPath: string
): DesktopIdentity {
  const name = developmentBuild ? 'Sherlock Dev' : 'Sherlock'
  const defaultDirectory = developmentBuild ? 'dsh-desktop-dev' : 'dsh-desktop'
  const explicitPath = explicitUserDataPath.trim()

  if (explicitPath && !isAbsolute(explicitPath)) {
    throw new Error('The Sherlock user-data path must be absolute.')
  }

  return {
    name,
    userData: explicitPath ? normalize(explicitPath) : join(appDataPath, defaultDirectory)
  }
}

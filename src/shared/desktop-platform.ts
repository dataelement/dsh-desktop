export interface DesktopPlatformAdapter {
  readonly platform: 'darwin' | 'win32' | 'linux'
  readonly clientPlatform: 'macos' | 'windows' | 'linux'
  readonly caption: 'macos' | 'overlay'
  readonly nodeExecutable: 'helper' | 'self'
  readonly loginEnvironment: 'posix-shell' | 'inherited'
  /** The official remote protocols currently define no Linux desktop identity. */
  readonly officialAccount: boolean
  readonly officialUpdates: boolean
  readonly officialDiagnostics: boolean
}

const PLATFORMS: Readonly<Record<string, DesktopPlatformAdapter>> = {
  darwin: {
    platform: 'darwin', clientPlatform: 'macos', caption: 'macos',
    nodeExecutable: 'helper', loginEnvironment: 'posix-shell',
    officialAccount: true, officialUpdates: true, officialDiagnostics: true
  },
  win32: {
    platform: 'win32', clientPlatform: 'windows', caption: 'overlay',
    nodeExecutable: 'self', loginEnvironment: 'inherited',
    officialAccount: true, officialUpdates: true, officialDiagnostics: true
  },
  linux: {
    platform: 'linux', clientPlatform: 'linux', caption: 'overlay',
    nodeExecutable: 'self', loginEnvironment: 'posix-shell',
    officialAccount: false, officialUpdates: false, officialDiagnostics: false
  }
}

/** Shared by shell/preload and the Host launch boundary; contains no privileged APIs. */
export function desktopPlatformAdapter(platform: string): DesktopPlatformAdapter | undefined {
  return Object.hasOwn(PLATFORMS, platform) ? PLATFORMS[platform] : undefined
}

export function requireDesktopPlatform(platform: string): DesktopPlatformAdapter {
  const adapter = desktopPlatformAdapter(platform)
  if (adapter === undefined) throw new Error(`Unsupported Desktop platform: ${platform}`)
  return adapter
}

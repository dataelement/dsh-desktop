export interface PackageResult {
  exitCode: number
  output: string
  truncated: boolean
  logPath: string
}

export interface ProfileBundleInstallRequest {
  spec: string
  kind: 'registry' | 'path' | 'git' | 'tarball'
  path?: string
  expectedName?: string
  registry?: string
  expectedVersion?: string
  autoInstallPeers?: boolean
  minimumReleaseAge?: number
  signal?: AbortSignal
  onOutput?(text: string, stream: 'stdout' | 'stderr'): void
}

export interface ProfileBundlePackageBackend {
  /** Resolves undefined for a shared-tree package (the market); pnpm installs it. */
  install(request: ProfileBundleInstallRequest): Promise<{
    packageResult: PackageResult
    bundle?: string
    replaced?: boolean
    pendingBuilds?: string[]
    rollback?(): Promise<void>
    commit?(): void
  } | undefined>
  /** Resolves undefined for a package that is not an enabled generation; pnpm removes it. */
  remove(request: {
    name: string
    signal?: AbortSignal
    onOutput?(text: string, stream: 'stdout' | 'stderr'): void
  }): Promise<{ packageResult: PackageResult } | undefined>
  switched(request: { name: string; enabled: boolean; rowIds?: readonly string[] }): Promise<void>
  removed(request: { name: string }): Promise<void>
}

export function createGenerationPackageBackend(options: {
  dshHome: string
  dshEntryPath?: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  environment?: NodeJS.ProcessEnv
  spawnProcess?: unknown
  runInstall?: unknown
}): ProfileBundlePackageBackend

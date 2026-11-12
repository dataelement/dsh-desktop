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
  npmIntegrity?: string
  autoInstallPeers?: boolean
  minimumReleaseAge?: number
  signal?: AbortSignal
  onOutput?(text: string, stream: 'stdout' | 'stderr'): void
}

export interface ProfileBundlePackageBackend {
  readonly supportsVerifiedInstall: true
  /** Installs every bundle, including the market, as an immutable generation. */
  install(request: ProfileBundleInstallRequest): Promise<{
    packageResult: PackageResult
    bundle?: string
    /** Package root to validate; a deferred upgrade still has old bytes in the Profile. */
    bundleDirectory?: string
    replaced?: boolean
    /** Desired state was saved; the running Profile still exposes the old package. */
    restartRequired?: boolean
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
  /** Side-effect-free validation before Plugin Manager persists bundle selection. */
  validateSwitch(request: { name: string; enabled: boolean; rowIds?: readonly string[] }): Promise<void>
  switched(request: { name: string; enabled: boolean; rowIds?: readonly string[] }): Promise<void>
  removed(request: { name: string }): Promise<void>
}

/** Caller must hold the registry lock. Throws before mutation if another package awaits projection. */
export function assertNoPendingGenerationUpdates(dshHome: string, profile: string, requestedName?: string): Promise<void>

export function createGenerationPackageBackend(options: {
  dshHome: string
  dshEntryPath?: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  environment?: NodeJS.ProcessEnv
  spawnProcess?: unknown
  runInstall?: unknown
  fetchImpl?: typeof fetch
  /** Profile that receives the generation link. The old shell uses `web`. */
  profile?: string
  /** Defaults true. False requires immediate publication and refuses real-directory replacement. */
  deferUpdates?: boolean
}): ProfileBundlePackageBackend

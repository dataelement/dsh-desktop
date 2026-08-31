export type Sha256Digest = string

export interface SharedSourceSnapshot {
  mode: 'local-main' | 'local-integration'
  worktreeRoot: string
  branch: string
  commit: string
  mainCommit: string
  sourceClean: true
  batchId: string | null
  manifestPath: string | null
  manifestDigest: Sha256Digest | null
  features: readonly { branch: string; commit: string }[]
  leaseRevision: number | null
}

export function verifySharedBuildSource(options: {
  repository: string
  ownerToken?: string
}): SharedSourceSnapshot

export function assertSharedBuildSourceUnchanged(
  before: SharedSourceSnapshot,
  after: SharedSourceSnapshot
): void

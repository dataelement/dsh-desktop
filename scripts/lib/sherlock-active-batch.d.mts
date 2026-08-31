export type Sha256Digest = string

export interface ActiveBatchLease {
  schemaVersion: 1
  revision: number
  batchId: string
  branch: string
  manifestPath: string
  baseMainCommit: string
  currentTip: string
  ownerTokenHash: string
  createdAt: string
  updatedAt: string
  acceptedTip?: string
  acceptedManifestDigest?: Sha256Digest
  acceptedAt?: string
}

export function readActiveBatchLease(repository: string): ActiveBatchLease | null
export function acquireActiveBatchLease(options: {
  repository: string
  lease: Omit<ActiveBatchLease, 'schemaVersion' | 'revision' | 'ownerTokenHash'>
  ownerToken: string
}): { lease: ActiveBatchLease; created: boolean }
export function updateActiveBatchTip(options: {
  repository: string
  ownerToken: string
  expectedRevision: number
  expectedTip: string
  nextTip: string
  updatedAt: string
}): ActiveBatchLease
export function markActiveBatchAccepted(options: {
  repository: string
  ownerToken: string
  expectedRevision: number
  acceptedTip: string
  acceptedManifestDigest: Sha256Digest
  acceptedAt: string
}): ActiveBatchLease
export function recoverActiveBatchOwnership(options: {
  repository: string
  expectedBatchId: string
  expectedTip: string
  expectedManifestDigest: Sha256Digest
}): { lease: ActiveBatchLease; ownerTokenFile: string }
export function archiveActiveBatchLease(options: {
  repository: string
  ownerToken?: string
  expectedBatchId: string
  outcome: 'promoted' | 'cancelled'
  archivedAt: string
  explicitCancellation?: boolean
}): { lease: ActiveBatchLease; archivePath: string }

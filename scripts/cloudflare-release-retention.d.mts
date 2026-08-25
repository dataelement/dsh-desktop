export interface ReleaseInventory {
  schemaVersion: 1
  releases: Record<string, string[]>
}

export interface PublicationPlanEntry {
  phase: string
  key: string
}

export interface ReleaseRetentionPlan {
  deletedVersion: string
  deleteKeys: string[]
  nextInventory: ReleaseInventory
}

export function validateReleaseInventory(value: unknown): ReleaseInventory

export function immutableKeysFromPublicationPlan(
  plan: PublicationPlanEntry[],
  version: string
): string[]

export function buildReleaseRetentionPlan(options: {
  inventory: ReleaseInventory
  currentVersion: string
  currentKeys: string[]
}): ReleaseRetentionPlan

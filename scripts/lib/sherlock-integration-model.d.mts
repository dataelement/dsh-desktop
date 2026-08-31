import type { NameStatusChange, RangeCommit } from './sherlock-git-state.mjs'

export interface CheckEvidence {
  argv: [string, ...string[]]
  outcome: 'passed'
  summary: string
  verifiedCommit: string
  completedAt: string
  timeoutMs: number
}

export interface FeatureHandoff {
  schemaVersion: 1
  featureName: string
  branch: string
  baseCommit: string
  tipCommit: string
  commits: RangeCommit[]
  files: NameStatusChange[]
  checks: CheckEvidence[]
  uiVerification: { outcome: 'passed' | 'not-applicable'; summary: string }
  acceptanceCriteria: string[]
  risks: string[]
  generatedAt: string
}

export function validateFeatureHandoff(value: unknown): FeatureHandoff
export function buildFeatureHandoff(options: {
  repository: string
  baseCommit: string
  metadata: unknown
  generatedAt: string
}): FeatureHandoff
export function handoffOutputPath(repository: string, handoff: FeatureHandoff): string
export function writeFeatureHandoff(outputPath: string, handoff: FeatureHandoff): string

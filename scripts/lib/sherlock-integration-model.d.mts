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

export interface IntegrationBatchManifest {
  schemaVersion: 1
  batchId: string
  branch: string
  baseMainCommit: string
  expectedMainCommit: string
  createdAt: string
  features: Array<{
    handoff: FeatureHandoff
    merged?: {
      mergeCommit: string
      verificationCommit: string
      checks: CheckEvidence[]
      recordedAt: string
    }
  }>
  integrationChecks: Array<{ argv: [string, ...string[]]; timeoutMs: number }>
  mainSynchronizations: Array<{
    previousMainCommit: string
    mainCommit: string
    mergeCommit: string
    verificationCommit: string
    checks: CheckEvidence[]
    recordedAt: string
  }>
}

export type IntegrationPhase =
  | 'prepare'
  | 'merge'
  | 'continue'
  | 'recover-owner'
  | 'sync-main'
  | 'accept'
  | 'promote'
  | 'cancel'

export interface PreflightReport {
  schemaVersion: 1
  ok: boolean
  phase: IntegrationPhase
  branch: string | null
  head: string
  batchId?: string
  findings: Array<{
    code: string
    severity: 'info' | 'warning' | 'error'
    message: string
    details?: Record<string, unknown>
  }>
  plannedActions: Array<{ kind: string; description: string; argv?: string[] }>
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
export function validateIntegrationBatchManifest(value: unknown): IntegrationBatchManifest
export function createIntegrationBatchManifest(options: {
  batchId: string
  branch: string
  baseMainCommit: string
  handoffs: FeatureHandoff[]
  integrationChecks: IntegrationBatchManifest['integrationChecks']
  createdAt: string
}): IntegrationBatchManifest

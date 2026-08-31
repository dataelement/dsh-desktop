import type { IntegrationBatchManifest } from './sherlock-integration-model.mjs'

export interface IntegrationExecutionResult {
  schemaVersion: 1
  status: 'planned' | 'prepared' | 'merged' | 'conflict' | 'ownership-recovered' | 'main-synchronized' | 'accepted' | 'promoted' | 'cancelled' | 'recovery-required'
  batchId: string
  branch: string
  beforeCommit: string
  afterCommit: string
  actions: Array<{ kind: string; description: string; argv?: string[] }>
}

export function createIntegrationBatch(options: {
  mainRepository: string
  worktreePath: string
  batchId: string
  handoffPaths: string[]
  integrationChecks: IntegrationBatchManifest['integrationChecks']
  dryRun: boolean
  now: string
}): IntegrationExecutionResult

export function adoptIntegrationBatch(options: {
  integrationRepository: string
  batchId: string
  handoffPaths: string[]
  integrationChecks: IntegrationBatchManifest['integrationChecks']
  dryRun: boolean
  now: string
}): IntegrationExecutionResult

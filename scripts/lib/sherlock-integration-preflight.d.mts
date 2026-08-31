import type { FeatureHandoff, IntegrationBatchManifest, IntegrationPhase, PreflightReport } from './sherlock-integration-model.mjs'

export function verifyFeatureHandoff(options: {
  repository: string
  handoff: FeatureHandoff
  batchMainCommit: string
}): PreflightReport

export function preflightIntegrationAction(options: {
  repository: string
  phase: IntegrationPhase
  manifestPath?: string
  featureBranch?: string
  mainWorktree?: string
  expectedAcceptedTip?: string
}): PreflightReport

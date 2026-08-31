export interface IntegrationOutcome {
  status: string
  batchId: string
  branch: string
  beforeCommit: string
  afterCommit: string
  conflictContext?: {
    integrationTip: string
    featureTip: string
    featureBase: string
  }
  recoveryCommand?: string
}

export function formatIntegrationOutcome(result: IntegrationOutcome): {
  exitCode: 0 | 3 | 4
  channel: 'stdout'
  output: string
}

export function formatIntegrationError(error: unknown): {
  exitCode: 1 | 2
  channel: 'stderr'
}

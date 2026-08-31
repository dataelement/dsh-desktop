function humanToken(status) {
  return status === 'planned' ? 'INTEGRATION PLANNED'
    : status === 'prepared' ? 'INTEGRATION PREPARED'
      : status === 'merged' ? 'INTEGRATION MERGED'
        : status === 'conflict' ? 'INTEGRATION CONFLICT'
          : status === 'ownership-recovered' ? 'INTEGRATION OWNERSHIP_RECOVERED'
            : status === 'main-synchronized' ? 'INTEGRATION MAIN_SYNCHRONIZED'
              : status === 'accepted' ? 'INTEGRATION ACCEPTED'
                : status === 'promoted' ? 'INTEGRATION PROMOTED'
                  : status === 'cancelled' ? 'INTEGRATION CANCELLED'
                    : 'INTEGRATION RECOVERY_REQUIRED'
}

export function formatIntegrationOutcome(result) {
  let output = `${humanToken(result.status)} batch=${result.batchId} branch=${result.branch} before=${result.beforeCommit} after=${result.afterCommit}\n`
  if (result.conflictContext) {
    output += `CONFLICT integrationTip=${result.conflictContext.integrationTip} featureTip=${result.conflictContext.featureTip} featureBase=${result.conflictContext.featureBase}\n`
  }
  if (result.recoveryCommand) output += `RECOVERY ${result.recoveryCommand}\n`
  return {
    exitCode: result.status === 'recovery-required' ? 4 : result.status === 'conflict' ? 3 : 0,
    channel: 'stdout',
    output
  }
}

export function formatIntegrationError(error) {
  return { exitCode: error && typeof error === 'object' && error.integrationExit === 1 ? 1 : 2, channel: 'stderr' }
}

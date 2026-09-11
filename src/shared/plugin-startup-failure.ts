/** Versioned wire data from the Harness loader; contains no plugin config. */
export interface PluginStartupFailure {
  stage: string
  packageName: string
  entryId?: string
  owner?: { packageName: string; version?: string; packageDir?: string }
  chain: Array<{ entryId?: string; packageName: string; baseUrl?: string }>
  message: string
}

export const PLUGIN_FAILURE_PREFIX = '[harness-node] plugin failures: '

/** Malformed/unknown protocol versions remain ordinary diagnostics. */
export function parsePluginStartupFailures(line: string): PluginStartupFailure[] | undefined {
  if (!line.startsWith(PLUGIN_FAILURE_PREFIX)) return undefined
  const object = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
  const optionalString = (value: unknown) => value === undefined || typeof value === 'string'
  try {
    const report: unknown = JSON.parse(line.slice(PLUGIN_FAILURE_PREFIX.length))
    if (!object(report) || report.version !== 1 || !Array.isArray(report.failures)) return undefined
    const failures: PluginStartupFailure[] = []
    for (const value of report.failures) {
      if (!object(value) || typeof value.stage !== 'string' ||
        typeof value.packageName !== 'string' || typeof value.message !== 'string' ||
        !optionalString(value.entryId) || !Array.isArray(value.chain)) return undefined
      if (value.owner !== undefined && (!object(value.owner) ||
        typeof value.owner.packageName !== 'string' || !optionalString(value.owner.version) ||
        !optionalString(value.owner.packageDir))) return undefined
      if (!value.chain.every((row: unknown) => object(row) &&
        typeof row.packageName === 'string' && optionalString(row.entryId) &&
        optionalString(row.baseUrl))) return undefined
      failures.push(value as unknown as PluginStartupFailure)
    }
    return failures.length ? failures : undefined
  } catch {
    return undefined
  }
}

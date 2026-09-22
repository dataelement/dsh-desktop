export const ENTERPRISE_ENV_PREFIX = 'DSH_DESKTOP_ENTERPRISE_'

export function isEnterpriseEnvironmentKey(name: string): boolean {
  return name.toUpperCase().startsWith(ENTERPRISE_ENV_PREFIX)
}

export function stripEnterpriseEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {}
  for (const [name, value] of Object.entries(environment)) {
    if (isEnterpriseEnvironmentKey(name)) continue
    result[name] = value
  }
  return result
}

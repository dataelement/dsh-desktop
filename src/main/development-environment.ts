/** Development overrides isolate concurrent worktrees without changing production identity. */
export function developmentEnvironment(development: boolean, defaultHarnessPort: number, env: NodeJS.ProcessEnv = process.env): {
  profile: string
  harnessPort: number
  mobilePort: number
} {
  if (!development) return { profile: 'dsh-desktop', harnessPort: defaultHarnessPort, mobilePort: 43127 }
  const profile = env.DSH_DEV_PROFILE || 'dsh-desktop-dev'
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(profile) || profile === 'dsh-desktop') {
    throw new Error('DSH_DEV_PROFILE must be a separate development directory name.')
  }
  const port = (value: string | undefined, fallback: number, name: string): number => {
    if (!value) return fallback
    const parsed = Number(value)
    if (!/^\d+$/.test(value) || !Number.isInteger(parsed) || parsed < 1024 || parsed > 65535) {
      throw new Error(`${name} must be an integer from 1024 to 65535.`)
    }
    return parsed
  }
  const harnessPort = port(env.DSH_DEV_HARNESS_PORT, defaultHarnessPort + 1, 'DSH_DEV_HARNESS_PORT')
  const mobilePort = port(env.DSH_DEV_MOBILE_PORT, 43128, 'DSH_DEV_MOBILE_PORT')
  if (harnessPort === mobilePort) throw new Error('Development Harness and mobile ports must differ.')
  return { profile, harnessPort, mobilePort }
}

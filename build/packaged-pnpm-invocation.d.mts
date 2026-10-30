export const PACKAGED_PNPM_ENTRY_ENV: 'DSH_DESKTOP_PNPM_ENTRY'
export const PACKAGED_PNPM_RUNNER_ENV: 'DSH_DESKTOP_PNPM_RUNNER'

export interface PackagedPnpmInvocation {
  command: string
  args: string[]
  env: { ELECTRON_RUN_AS_NODE: '1' }
}

export function buildPackagedPnpmInvocation(
  env: NodeJS.ProcessEnv,
  execPath: string,
  exists?: (path: string) => boolean
): PackagedPnpmInvocation | undefined

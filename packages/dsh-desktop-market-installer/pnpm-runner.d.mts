export interface SuspendedGenerationProjection {
  plugins: string[]
  restore: () => Promise<void>
}

export function suspendGenerationProjectionForPnpm(
  profileDirectory: string
): Promise<SuspendedGenerationProjection>

export function pnpmLaunchArguments(
  args: readonly string[],
  env?: NodeJS.ProcessEnv,
  platform?: NodeJS.Platform
): string[]

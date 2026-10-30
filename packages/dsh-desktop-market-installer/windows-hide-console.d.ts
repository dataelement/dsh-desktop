export const HIDE_CONSOLE_BOOTSTRAP_ENV: 'DSH_DESKTOP_HIDE_CONSOLE_BOOTSTRAP'

export function hideConsoleBootstrapPath(value: unknown): string | undefined

export function hideConsoleImportArguments(
  env?: NodeJS.ProcessEnv,
  platform?: NodeJS.Platform,
  exists?: (path: string) => boolean
): string[]

export function hideConsoleCmdAssignment(path: unknown): string

export const HIDDEN_CONSOLE_ENV: 'DSH_DESKTOP_HIDDEN_CONSOLE'

export function attachHiddenConsole(options?: {
  load?: (library: string) => {
    func: (
      name: string,
      resultType: string,
      parameters: readonly string[]
    ) => (...args: unknown[]) => unknown
  }
  env?: NodeJS.ProcessEnv
  platform?: NodeJS.Platform
  resourcesPath?: string
}): boolean

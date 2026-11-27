import type childProcess from 'node:child_process'
import type { syncBuiltinESMExports } from 'node:module'

export const HIDDEN_CONSOLE_ENV: 'DSH_DESKTOP_HIDDEN_CONSOLE'

export function applyWindowsHide<T>(options: T): T

export function enforceWindowsChildProcessHide(
  cp?: typeof childProcess,
  sync?: typeof syncBuiltinESMExports
): void

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

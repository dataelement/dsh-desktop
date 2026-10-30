import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Injected by Desktop and restored by the Windows pnpm shim after env scrubbing. */
export const HIDE_CONSOLE_BOOTSTRAP_ENV = 'DSH_DESKTOP_HIDE_CONSOLE_BOOTSTRAP'

const UNSAFE_BOOTSTRAP_PATH = /[\r\n\0"]/u
let notedUnavailable = false

/**
 * A bootstrap path safe to place in a quoted `set` statement and a file URL.
 * @param {unknown} value
 * @returns {string | undefined}
 */
export function hideConsoleBootstrapPath(value) {
  if (typeof value !== 'string') return undefined
  const path = value.trim()
  if (path === '' || UNSAFE_BOOTSTRAP_PATH.test(path)) return undefined
  return path
}

/**
 * Node arguments that load the console-hide bootstrap before the program.
 * Non-Windows and an absent path produce nothing, so other platforms keep
 * their existing argv.
 * @param {NodeJS.ProcessEnv} [env]
 * @param {NodeJS.Platform} [platform]
 * @param {(path: string) => boolean} [exists]
 * @returns {string[]}
 */
export function hideConsoleImportArguments(
  env = process.env,
  platform = process.platform,
  exists = existsSync
) {
  if (platform !== 'win32') return []
  const raw = env[HIDE_CONSOLE_BOOTSTRAP_ENV]
  const path = hideConsoleBootstrapPath(raw)
  if (typeof raw === 'string' && raw.trim() !== '' && path === undefined) {
    noteUnavailable('bootstrap path contains a character that cannot be quoted safely')
    return []
  }
  if (path === undefined) return []
  if (!exists(path)) {
    noteUnavailable(`bootstrap was not found at ${path}`)
    return []
  }
  // A bare `C:\...` is parsed as a URL scheme. The file URL keeps the drive.
  return ['--import', pathToFileURL(path).href]
}

/**
 * One `set` line for `pnpm.cmd`. Empty when there is no usable path.
 * @param {unknown} path
 * @returns {string}
 */
export function hideConsoleCmdAssignment(path) {
  const safe = hideConsoleBootstrapPath(path)
  if (safe === undefined) return ''
  return `@set "${HIDE_CONSOLE_BOOTSTRAP_ENV}=${safe}"\r\n`
}

function noteUnavailable(detail) {
  if (notedUnavailable) return
  notedUnavailable = true
  process.stderr.write(
    `dsh-desktop: Windows console hide bootstrap is unavailable (${detail}); child consoles are not suppressed\n`
  )
}

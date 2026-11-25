import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Set on the Host after a hidden console is attached. Job runner spawns read
 * it in-process. Subprocess env scrubbing strips `DSH_*`, so targets such as
 * Codex do not inherit the marker.
 */
export const HIDDEN_CONSOLE_ENV = 'DSH_DESKTOP_HIDDEN_CONSOLE'

/** SW_HIDE: hide the window and activate another one. */
const SW_HIDE = 0

/**
 * Attach a hidden console to this console-less process.
 *
 * A GUI Electron process has no console. Windows then allocates a visible one
 * for any console-subsystem descendant that is not created with
 * CREATE_NO_WINDOW — Codex's `codex.exe`, spawned by `bin/codex.js` without
 * `windowsHide`, is that descendant. AllocConsole plus SW_HIDE gives the
 * process a console children can inherit. Failure must not block Host startup.
 *
 * @param {{
 *   load?: (library: string) => { func: Function },
 *   env?: NodeJS.ProcessEnv,
 *   platform?: NodeJS.Platform,
 *   resourcesPath?: string
 * }} [options]
 * @returns {boolean} true when a console was attached and hidden.
 */
export function attachHiddenConsole(options = {}) {
  const platform = options.platform ?? process.platform
  if (platform !== 'win32') return false
  const env = options.env ?? process.env
  try {
    const loadLibrary = options.load ?? resolveKoffiLoad(options.resourcesPath ?? process.resourcesPath)
    const kernel32 = loadLibrary('kernel32.dll')
    const user32 = loadLibrary('user32.dll')
    const allocConsole = kernel32.func('AllocConsole', 'bool', [])
    const getConsoleWindow = kernel32.func('GetConsoleWindow', 'void *', [])
    const showWindow = user32.func('ShowWindow', 'bool', ['void *', 'int'])
    if (!allocConsole()) {
      process.stderr.write(
        '[windows-hide-console] hidden console was not created (AllocConsole returned false); child consoles may remain visible\n'
      )
      return false
    }
    const window = getConsoleWindow()
    if (window) showWindow(window, SW_HIDE)
    env[HIDDEN_CONSOLE_ENV] = '1'
    return true
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    process.stderr.write(
      `[windows-hide-console] hidden console was not created (${detail}); child consoles may remain visible\n`
    )
    return false
  }
}

/**
 * @param {string | undefined} resourcesPath
 * @returns {(library: string) => { func: Function }}
 */
function resolveKoffiLoad(resourcesPath) {
  const anchor = findKoffiAnchor(resourcesPath)
  return createRequire(anchor)('koffi').load
}

/**
 * Dev walks up from `build/` to the repository `node_modules`. Packaged builds
 * keep this file in `resources/` and dependencies in `resources/app.asar`.
 * @param {string | undefined} resourcesPath
 * @returns {string}
 */
function findKoffiAnchor(resourcesPath) {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, 'node_modules', 'koffi', 'package.json')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  if (typeof resourcesPath === 'string' && resourcesPath.length > 0) {
    for (const root of ['app.asar', 'app']) {
      const candidate = join(resourcesPath, root, 'package.json')
      if (existsSync(candidate)) return candidate
    }
  }
  throw new Error('koffi was not found')
}

function loadedAsConsoleBootstrap() {
  const argv = process.execArgv
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? ''
    const next = argv[index + 1] ?? ''
    if (arg === '--import' && next.includes('windows-hide-console-import')) return true
    if (arg.startsWith('--import=') && arg.includes('windows-hide-console-import')) return true
  }
  return false
}

// `--import` evaluates this file before the Host entry. Unit tests import the
// function directly and must not attach a console to the test process.
if (loadedAsConsoleBootstrap()) attachHiddenConsole()

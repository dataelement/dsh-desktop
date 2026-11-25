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

/** ATTACH_PARENT_PROCESS: DWORD -1, passed through the uint32 binding as 0xFFFFFFFF. */
const ATTACH_PARENT_PROCESS = 0xFFFFFFFF

/**
 * True when this module was loaded with `?attach=parent`.
 * Job hops set that query; every other entry allocates its own console.
 * @param {string} [importUrl]
 * @returns {boolean}
 */
export function attachParentRequested(importUrl = import.meta.url) {
  try {
    return new URL(importUrl).searchParams.get('attach') === 'parent'
  } catch {
    return false
  }
}

/**
 * Give this console-less process a console that children can inherit.
 *
 * Without `attachParent`, allocate a new console and hide it. Host, market
 * install, and plugin commands spawned by the GUI main process use this path,
 * so they never attach to a user's terminal.
 *
 * With `attachParent`, join the parent console when it has no visible window.
 * A visible parent, or a failed attach, falls back to allocating a hidden
 * console. Failure must not block startup.
 *
 * `koffi.errno()` is the C runtime errno, not Win32 GetLastError, and a later
 * koffi call can overwrite the thread error. Diagnostics name the failure
 * class instead of reporting an error code.
 *
 * @param {{
 *   load?: (library: string) => { func: Function },
 *   env?: NodeJS.ProcessEnv,
 *   platform?: NodeJS.Platform,
 *   resourcesPath?: string,
 *   attachParent?: boolean
 * }} [options]
 * @returns {boolean} true when a console is attached.
 */
export function attachHiddenConsole(options = {}) {
  const platform = options.platform ?? process.platform
  if (platform !== 'win32') return false
  const env = options.env ?? process.env
  const attachParent = options.attachParent === true
  try {
    const loadLibrary = options.load ?? resolveKoffiLoad(options.resourcesPath ?? process.resourcesPath)
    const kernel32 = loadLibrary('kernel32.dll')
    const user32 = loadLibrary('user32.dll')
    if (attachParent) {
      const parent = adoptParentConsole(kernel32, user32)
      if (parent === 'kept') {
        env[HIDDEN_CONSOLE_ENV] = '1'
        return true
      }
      // Still attached to a visible console: AllocConsole would fail and hide the cause.
      if (parent === 'stuck') return false
    }
    return allocateHiddenConsole(kernel32, user32, env)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    process.stderr.write(
      `[windows-hide-console] hidden console was not created (${detail}); child consoles may remain visible\n`
    )
    return false
  }
}

/**
 * @param {{ func: Function }} kernel32
 * @param {{ func: Function }} user32
 * @returns {'kept' | 'none' | 'stuck'} `kept` when the parent console is used,
 *   `none` when no console is attached, `stuck` when a visible one could not be released.
 */
function adoptParentConsole(kernel32, user32) {
  const attachConsole = kernel32.func('AttachConsole', 'bool', ['uint32'])
  const getConsoleWindow = kernel32.func('GetConsoleWindow', 'void *', [])
  const isWindowVisible = user32.func('IsWindowVisible', 'bool', ['void *'])
  const freeConsole = kernel32.func('FreeConsole', 'bool', [])
  if (!attachConsole(ATTACH_PARENT_PROCESS)) {
    process.stderr.write(
      '[windows-hide-console] parent console was not attached; allocating a new hidden console\n'
    )
    return 'none'
  }
  const window = getConsoleWindow()
  // NULL is a console created with CREATE_NO_WINDOW: there is no window to show.
  if (!window) return 'kept'
  if (!isWindowVisible(window)) return 'kept'
  // Do not hide a console the user can see, such as their own terminal.
  if (!freeConsole()) {
    process.stderr.write(
      '[windows-hide-console] parent console is visible and could not be released; child consoles may remain visible\n'
    )
    return 'stuck'
  }
  process.stderr.write(
    '[windows-hide-console] parent console is visible; allocating a new hidden console\n'
  )
  return 'none'
}

/**
 * @param {{ func: Function }} kernel32
 * @param {{ func: Function }} user32
 * @param {NodeJS.ProcessEnv} env
 * @returns {boolean}
 */
function allocateHiddenConsole(kernel32, user32, env) {
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

// `--import` evaluates this file before the entry. Unit tests import the
// function directly and must not attach a console to the test process.
if (loadedAsConsoleBootstrap()) attachHiddenConsole({ attachParent: attachParentRequested() })

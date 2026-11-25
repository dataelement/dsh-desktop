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

/** Win32 standard-handle ids. AllocConsole replaces these with console handles. */
const STD_INPUT_HANDLE = 0xFFFFFFF6
const STD_OUTPUT_HANDLE = 0xFFFFFFF5
const STD_ERROR_HANDLE = 0xFFFFFFF4
const STD_HANDLES = [STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, STD_ERROR_HANDLE]

/**
 * Give this console-less process a console that children can inherit.
 *
 * `AllocConsole` is the call Windows documents as inherited by a child.
 * `AttachConsole` attaches this process only: a console-subsystem grandchild
 * such as `codex.exe` still opens its own visible console. Every entry,
 * including Job hops, therefore allocates a console and hides it. That also
 * keeps Host, market install, and plugin commands off the user's terminal.
 *
 * AllocConsole points the standard handles at the new console. The pipes the
 * parent already installed are captured first and put back, so command output
 * still flows through the Job. Failure must not block startup.
 *
 * `koffi.errno()` is the C runtime errno, not Win32 GetLastError, and a later
 * koffi call can overwrite the thread error. Diagnostics name the failure
 * class instead of reporting an error code.
 *
 * @param {{
 *   load?: (library: string) => { func: Function },
 *   env?: NodeJS.ProcessEnv,
 *   platform?: NodeJS.Platform,
 *   resourcesPath?: string
 * }} [options]
 * @returns {boolean} true when a console is attached.
 */
export function attachHiddenConsole(options = {}) {
  const platform = options.platform ?? process.platform
  if (platform !== 'win32') return false
  const env = options.env ?? process.env
  try {
    const loadLibrary = options.load ?? resolveKoffiLoad(options.resourcesPath ?? process.resourcesPath)
    const kernel32 = loadLibrary('kernel32.dll')
    const user32 = loadLibrary('user32.dll')
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
 * @returns {unknown[]}
 */
function captureStdHandles(kernel32) {
  const getStdHandle = kernel32.func('GetStdHandle', 'void *', ['uint32'])
  return STD_HANDLES.map(handle => getStdHandle(handle))
}

/**
 * @param {{ func: Function }} kernel32
 * @param {unknown[]} handles
 */
function restoreStdHandles(kernel32, handles) {
  const setStdHandle = kernel32.func('SetStdHandle', 'bool', ['uint32', 'void *'])
  for (let index = 0; index < STD_HANDLES.length; index += 1) {
    setStdHandle(STD_HANDLES[index], handles[index])
  }
}

/**
 * @param {{ func: Function }} kernel32
 * @param {{ func: Function }} user32
 * @param {NodeJS.ProcessEnv} env
 * @returns {boolean}
 */
function allocateHiddenConsole(kernel32, user32, env) {
  const previousHandles = captureStdHandles(kernel32)
  try {
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
  } finally {
    restoreStdHandles(kernel32, previousHandles)
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

// `--import` evaluates this file before the entry. Unit tests import the
// function directly and must not attach a console to the test process.
if (loadedAsConsoleBootstrap()) attachHiddenConsole()

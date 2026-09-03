import koffi from 'koffi'

/** SW_HIDE: hide the window (and activate another window). */
const SW_HIDE = 0

/**
 * Attach a hidden console to the current (console-less) process.
 *
 * The desktop spawns the Harness node process with `detached: true` and
 * `windowsHide: true` (`DETACHED_PROCESS | CREATE_NO_WINDOW` — see
 * `buildHarnessSpawnOptions`), so the Harness itself has no console. On
 * Windows, spawning a console child (pwsh, git, ripgrep, …) from a
 * console-less parent with only `windowsHide` (`CREATE_NO_WINDOW`) still lets
 * the child allocate a fresh, briefly-visible console — the flash reported in
 * issue #233.
 *
 * Giving the Harness its own console and hiding it makes its children inherit
 * a console that is already hidden, so `CREATE_NO_WINDOW` suppresses their
 * windows the same way it does for a console-attached parent. `detached` is
 * left in place, so the #208 Ctrl+C process-group isolation is preserved;
 * `AllocConsole` on a detached process is exactly the escape hatch Microsoft
 * documents for it.
 *
 * @param load - library loader, injectable for tests (defaults to `koffi.load`).
 * @returns true when a console was attached and hidden.
 */
export function createHiddenConsole({ load = koffi.load } = {}) {
  try {
    const kernel32 = load('kernel32.dll')
    const user32 = load('user32.dll')
    const allocConsole = kernel32.func('AllocConsole', 'bool', [])
    const getConsoleWindow = kernel32.func('GetConsoleWindow', 'void *', [])
    const showWindow = user32.func('ShowWindow', 'bool', ['void *', 'int'])
    if (!allocConsole()) return false
    const window = getConsoleWindow()
    if (window) showWindow(window, SW_HIDE)
    return true
  } catch {
    // Best-effort: a failure here must never block Harness startup.
    return false
  }
}

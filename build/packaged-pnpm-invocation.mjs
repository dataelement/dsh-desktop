import { existsSync } from 'node:fs'

/** Injected by the desktop main process; see `buildHarnessSpawnOptions`. */
export const PACKAGED_PNPM_ENTRY_ENV = 'DSH_DESKTOP_PNPM_ENTRY'
export const PACKAGED_PNPM_RUNNER_ENV = 'DSH_DESKTOP_PNPM_RUNNER'

/**
 * The pnpm invocation a packaged Harness should hand to `runCli({ packageManager })`.
 *
 * Plugin manager otherwise runs the bare command `pnpm`. On Windows that name
 * resolves to `$DSH_HOME/.desktop-bin/pnpm.cmd`, and execa wraps every `.cmd`
 * in `cmd.exe`. Opening the add-plugin dialog runs `pnpm config get registry`,
 * so each click flashes a console. An `.exe` command (the Electron binary
 * already running this process) is spawned directly and skips that wrap.
 * `ELECTRON_RUN_AS_NODE` has to travel in `packageManager.env`: the registry
 * read merges it after the parent scrub, and without it the child boots as a
 * GUI app instead of pnpm.
 *
 * @param env - the Harness process environment.
 * @param execPath - `process.execPath` of the Harness process.
 * @param exists - file check, injectable for tests.
 * @returns the invocation, or undefined when the desktop did not inject an entry that exists.
 */
export function buildPackagedPnpmInvocation(env, execPath, exists = existsSync) {
  const entryPath = env[PACKAGED_PNPM_ENTRY_ENV]
  if (typeof execPath !== 'string' || execPath === '') return undefined
  if (typeof entryPath !== 'string' || entryPath === '' || !exists(entryPath)) return undefined

  const runnerPath = env[PACKAGED_PNPM_RUNNER_ENV]
  const args = []
  if (typeof runnerPath === 'string' && runnerPath !== '' && exists(runnerPath)) {
    args.push(runnerPath)
  }
  args.push(entryPath)
  return {
    command: execPath,
    args,
    env: { ELECTRON_RUN_AS_NODE: '1' }
  }
}

/**
 * The pnpm entry every profile package operation goes through — DSH Desktop's
 * own installer and the community market alike, because both reach pnpm by
 * name and the packaged shim in `.desktop-bin` points here.
 *
 * Windows cannot replace a directory while something holds a handle inside it,
 * and pnpm finishes each package by renaming `<pkg>_tmp_<pid>_<n>` onto
 * `<pkg>`. With Harness running — it has the profile's modules loaded, and the
 * platform's own scanners open files behind everyone's back — that final
 * rename fails:
 *
 *   EPERM: operation not permitted, rename '…\argparse_tmp_19856_4' -> '…\argparse'
 *
 * Two recoveries, in order of how little they disturb: retry once (a scanner's
 * handle is gone within a second), then move the blocked target aside and
 * retry (a rename of the directory itself succeeds where replacing its
 * contents does not, and pnpm recreates the package under the free name). The
 * leftovers are swept before Harness next starts, when nothing holds them.
 *
 * Anything unrecognized is passed straight through: same exit code, same
 * output, one pnpm run.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { rename } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SIDELINE_MARKER = '.dsh-old-'
export const RETRY_DELAY_MS = 750

/**
 * The destination pnpm could not claim, or undefined when the failure is not a
 * locked rename inside a profile's node_modules. Only a path under
 * node_modules qualifies: a rename failure anywhere else is not ours to
 * rearrange.
 * @param {string} output - the failed run's combined stdout and stderr.
 * @returns {string | undefined} the blocked destination path.
 */
export function lockedRenameTarget(output) {
  const failure =
    /(?:EPERM|EBUSY|EACCES|ENOTEMPTY|EEXIST)[^\n]*?rename[^\n]*?->\s*'([^']+)'/u.exec(output)
  if (failure === null) return undefined
  const target = failure[1]
  const inModules = target.split(/[\\/]/u).includes('node_modules')
  return inModules ? target : undefined
}

/**
 * Where a blocked directory is moved so pnpm can claim the name it wants: the
 * same path under a suffixed name, which keeps it a sibling without parsing
 * separators the host may not own. The marker is what the pre-launch sweep
 * looks for.
 * @param {string} target - the blocked destination path.
 * @param {number} now - timestamp making the name unique across attempts.
 * @returns {string} the sideline path.
 */
export function sidelinePath(target, now = Date.now()) {
  return `${target}${SIDELINE_MARKER}${now}`
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

/**
 * Run pnpm once, mirroring its streams to this process while keeping a copy
 * for failure classification.
 */
function runPnpm(executable, args, spawnProcess = spawn) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(executable, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      windowsHide: true
    })
    let output = ''
    const keep = (chunk) => {
      output = `${output}${chunk}`.slice(-256 * 1024)
    }
    child.stdout.on('data', (chunk) => {
      keep(chunk)
      process.stdout.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
      keep(chunk)
      process.stderr.write(chunk)
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code, signal, output }))
  })
}

/**
 * Run pnpm, recovering from a Windows locked rename. Returns the exit code of
 * the run that decided the outcome.
 */
export async function runWithLockRecovery(executable, args, options = {}) {
  const {
    spawnProcess = spawn,
    moveAside = rename,
    exists = existsSync,
    wait = delay,
    now = Date.now,
    retryDelayMs = RETRY_DELAY_MS
  } = options

  const first = await runPnpm(executable, args, spawnProcess)
  if (first.code === 0 || lockedRenameTarget(first.output) === undefined) return first

  await wait(retryDelayMs)
  const second = await runPnpm(executable, args, spawnProcess)
  const target = second.code === 0 ? undefined : lockedRenameTarget(second.output)
  if (target === undefined) return second

  if (!exists(target)) return second
  try {
    await moveAside(target, sidelinePath(target, now()))
  } catch {
    // The directory itself is held too — nothing left to try, and the run's
    // own diagnostics are already on stderr.
    return second
  }
  return runPnpm(executable, args, spawnProcess)
}

/* v8 ignore start -- the process wrapper around the tested runner */
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [pnpmEntry, ...pnpmArguments] = process.argv.slice(2)
  if (pnpmEntry === undefined) {
    process.stderr.write('dsh-desktop: the pnpm runner needs the pnpm entry path.\n')
    process.exitCode = 1
  } else {
    const executable = process.execPath
    const result = await runWithLockRecovery(executable, [pnpmEntry, ...pnpmArguments])
    if (result.signal) {
      process.stderr.write(`dsh-desktop: pnpm terminated with ${result.signal}.\n`)
      process.exitCode = 1
    } else {
      process.exitCode = result.code ?? 1
    }
  }
}
/* v8 ignore stop */

export const RUNNER_PATH = fileURLToPath(import.meta.url)
